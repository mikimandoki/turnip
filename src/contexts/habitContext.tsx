import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Toast } from '@capacitor/toast';
import { addDays, isFuture, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import {
  type Completion,
  CompletionSchema,
  type Habit,
  type HabitRowFromDB,
  HabitSchema,
} from '../types';
import { importData } from '../utils/dataTransfer';
import { toDateString } from '../utils/date';
import { generateDemoData } from '../utils/demoData';
import { hapticsLight, hapticsMedium } from '../utils/haptics';
import {
  cancelAllHabitNotifications,
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/localNotifications';
import {
  clearStorage,
  HasOnboardedSchema,
  loadFromStorage,
  saveToStorage,
} from '../utils/localStorage';
import {
  cancelNotificationsForHabit,
  performNotificationMaintenance,
  syncHabitNotification,
} from '../utils/notificationService';
import { getDB, syncDB } from '../utils/sqlite';
import { isNative } from '../utils/utils';
import { HabitContext } from './useHabitContext';

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [osNotificationsGranted, setOsNotificationsGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateString, setDateString] = useState<string>(toDateString(new Date()));
  const displayDate = useMemo(() => parseISO(dateString), [dateString]);
  const isFutureDate = import.meta.env.MODE !== 'development' && isFuture(displayDate);

  async function recheckNotificationPermission() {
    if (!isNative) return;
    setOsNotificationsGranted(await checkNotificationPermission());
  }

  useEffect(() => {
    if (!isNative) return;
    void checkNotificationPermission().then(setOsNotificationsGranted);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkNotificationPermission().then(setOsNotificationsGranted);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isNative || habits.length === 0) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void performNotificationMaintenance(habits);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [habits]);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.setAttribute('data-theme', 'dark');
      html.removeAttribute('data-accent');
      void SystemBars.setStyle({ style: SystemBarsStyle.Dark });
    } else {
      html.removeAttribute('data-theme');
      html.setAttribute('data-accent', 'green');
      void SystemBars.setStyle({ style: SystemBarsStyle.Light });
    }
  }, [darkMode]);

  async function updateCompletion(habitId: string, increment: number) {
    const today = dateString;
    const db = await getDB();

    try {
      // 1. Handle the "Delete if Zero" logic or "Decrement"
      // We check the current count first to see if we're hitting zero
      const existing = completions.find(c => c.habitId === habitId && c.date === today);
      const newCount = (existing?.count ?? 0) + increment;

      if (newCount < 0) return;

      if (newCount === 0) {
        await db.run(`DELETE FROM completions WHERE habitId = ? AND date = ?;`, [habitId, today]);
      } else {
        // 2. The UPSERT: Insert new row or update existing count
        await db.run(
          `INSERT INTO completions (habitId, date, count) 
           VALUES (?, ?, ?)
           ON CONFLICT(habitId, date) DO UPDATE SET count = excluded.count;`,
          [habitId, today, newCount]
        );
      }

      await syncDB();

      // 3. Update React State (Keep it snappy)
      let updatedCompletions;
      if (newCount === 0) {
        updatedCompletions = completions.filter(c => !(c.habitId === habitId && c.date === today));
      } else if (existing) {
        updatedCompletions = completions.map(c =>
          c.habitId === habitId && c.date === today ? { ...c, count: newCount } : c
        );
      } else {
        updatedCompletions = [...completions, { habitId, date: today, count: newCount }];
      }

      setCompletions(updatedCompletions);
      void hapticsLight();
    } catch (e) {
      console.error('Failed to update completion in SQLite:', e);
    }
  }

  async function addHabit(newHabit: Habit) {
    // 1. Optimistic UI Update (Keep the user moving)
    setHabits(prev => [...prev, newHabit]);
    setHasOnboarded(true);
    void hapticsMedium();

    try {
      const db = await getDB();

      // 2. Database Write: Core Habit
      const sortResult = await db.query(`SELECT MAX(sortOrder) as maxSort FROM habits`);
      const maxSort =
        (sortResult.values?.[0] as { maxSort: number | null } | undefined)?.maxSort ?? -1;
      await db.run(
        `INSERT INTO habits (id, name, createdAt, times, periodLength, periodUnit, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newHabit.id,
          newHabit.name,
          newHabit.createdAt,
          newHabit.frequency.times,
          newHabit.frequency.periodLength,
          newHabit.frequency.periodUnit,
          maxSort + 1,
        ]
      );

      // 3. Notifications: schedule OS reminders + persist settings + fill queue
      if (newHabit.notification?.enabled) {
        await syncHabitNotification(newHabit, newHabit.notification, new Date());
      } else {
        await syncDB();
      }

      void Toast.show({ text: 'Habit added successfully ✅' });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('❌ Add Habit Failed:', errorMsg);

      void Toast.show({
        text: `Failed to save: ${errorMsg}`,
        duration: 'long',
      });

      // Rollback UI if DB fails
      setHabits(prev => prev.filter(h => h.id !== newHabit.id));
    }
  }

  async function editHabit(habit: Habit, updates: Partial<Habit>) {
    const db = await getDB();
    const sanitized = updates.name ? { ...updates, name: updates.name.trim() } : updates;
    const merged = { ...habit, ...sanitized };

    try {
      // 1. Update core habit fields
      await db.run(
        `UPDATE habits SET name = ?, times = ?, periodLength = ?, periodUnit = ? WHERE id = ?;`,
        [
          merged.name.trim(),
          merged.frequency.times,
          merged.frequency.periodLength,
          merged.frequency.periodUnit,
          habit.id,
        ]
      );

      // 2. Sync notifications: cancel old, reschedule, update queue + notif columns on habit row
      if (merged.notification?.enabled) {
        await syncHabitNotification(merged, merged.notification, new Date());
      } else {
        await cancelNotificationsForHabit(habit.id);
        await db.run(`UPDATE habits SET notif_enabled = 0 WHERE id = ?`, [habit.id]);
        await syncDB();
      }

      // 3. Reload state from DB
      const updatedData = await loadDataFromDB();
      setHabits(updatedData.habits);

      void hapticsMedium();
      void Toast.show({ text: 'Habit updated' });
    } catch (e) {
      console.error('❌ Could not edit habit:', e);
      void Toast.show({
        text: `Update failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        duration: 'long',
      });
    }
  }

  async function loadDataFromDB() {
    const db = await getDB();

    try {
      // 1. Fetch habits (notif settings are columns on the habit row now)
      const habitResult = await db.query(
        `SELECT id, name, createdAt, times, periodLength, periodUnit, sortOrder,
                notif_enabled, notif_mode, notif_time, notif_days, notif_monthDays,
                notif_customMessage, notif_intervalN, notif_intervalUnit
         FROM habits
         ORDER BY sortOrder ASC;`
      );

      // 2. Map rows to TypeScript objects
      const habits: Habit[] = (habitResult.values as HabitRowFromDB[]).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.createdAt,
        sortOrder: row.sortOrder,
        frequency: {
          times: row.times,
          periodLength: row.periodLength,
          periodUnit: row.periodUnit,
        },
        notification:
          row.notif_mode !== null
            ? {
                enabled: Boolean(row.notif_enabled),
                mode: row.notif_mode,
                time: row.notif_time!,
                days: JSON.parse(row.notif_days || '[]') as number[],
                monthDays: JSON.parse(row.notif_monthDays || '[]') as number[],
                customMessage: row.notif_customMessage ?? '',
                intervalN: row.notif_intervalN ?? 1,
                intervalUnit: row.notif_intervalUnit ?? 'days',
              }
            : undefined,
      }));

      // 3. Fetch Completions
      const compResult = await db.query(`SELECT * FROM completions`);
      const completions = compResult.values || [];

      // 4. Final Zod Validation
      return {
        habits: z.array(HabitSchema).parse(habits),
        completions: z.array(CompletionSchema).parse(completions),
      };
    } catch (e) {
      // Shout if anything goes wrong
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error('❌ Database Hydration Failed:', errorMsg);

      void Toast.show({
        text: 'DB Error: ' + errorMsg,
        duration: 'long',
      });

      return { habits: [], completions: [] };
    }
  }

  useEffect(() => {
    void (async () => {
      const [dbData, onboarded, dm] = await Promise.all([
        loadDataFromDB(),
        loadFromStorage('hasOnboarded', false, HasOnboardedSchema),
        loadFromStorage('darkMode', null, z.boolean().nullable()),
      ]);
      // Trigger the maintenance loop once data is loaded
      if (dbData.habits.length > 0) {
        // We don't 'await' this so it doesn't block the UI render
        void performNotificationMaintenance(dbData.habits);
      }
      // Populate State
      setHabits(dbData.habits);
      setCompletions(dbData.completions);

      setHasOnboarded(onboarded || dbData.habits.length > 0);
      setDarkMode(dm ?? window.matchMedia('(prefers-color-scheme: dark)').matches);
      setLoading(false);
    })();
  }, []);

  async function deleteHabit(habit: Habit) {
    const db = await getDB();

    try {
      // 1. Cancel OS notifications (perpetual + queued) before the cascade wipes the queue
      if (habit.notification?.enabled) {
        await cancelNotificationsForHabit(habit.id);
      }

      // 2. Delete habit — cascades to completions and notification_queue
      await db.run(`DELETE FROM habits WHERE id = ?;`, [habit.id]);

      // 3. Sync the SQLite file to IndexedDB (Web layer)
      await syncDB();

      // 4. Update React State
      // We filter both habits and completions out of memory
      const updatedHabits = habits.filter(h => h.id !== habit.id);
      const updatedCompletions = completions.filter(c => c.habitId !== habit.id);

      setHabits(updatedHabits);
      setCompletions(updatedCompletions);

      // 5. Feedback
      void hapticsMedium();
      void Toast.show({ text: 'Habit deleted' });
    } catch (e) {
      console.error('❌ Could not delete habit:', e);
      void Toast.show({ text: 'Delete failed', duration: 'short' });
    }
  }

  function shiftDate(days: number) {
    setDateString(toDateString(addDays(displayDate, days)));
  }

  function setDate(value: string | null) {
    setDateString(value ?? toDateString(new Date()));
  }

  async function clearAll() {
    const db = await getDB();
    await cancelAllHabitNotifications();
    await db.run(`DELETE FROM habits`);
    await syncDB();
    await clearStorage();
    setHabits([]);
    setCompletions([]);
    setHasOnboarded(false);
  }

  async function loadDemoData() {
    const { habits: demoHabits, completions: demoCompletions } = generateDemoData();
    const db = await getDB();

    await cancelAllHabitNotifications();
    await db.executeSet(
      [
        { statement: `DELETE FROM habits`, values: [] },
        ...demoHabits.map((h, i) => ({
          statement: `INSERT INTO habits (id, name, createdAt, times, periodLength, periodUnit, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          values: [
            h.id,
            h.name,
            h.createdAt,
            h.frequency.times,
            h.frequency.periodLength,
            h.frequency.periodUnit,
            i,
          ],
        })),
        ...demoCompletions.map(c => ({
          statement: `INSERT INTO completions (habitId, date, count) VALUES (?, ?, ?)`,
          values: [c.habitId, c.date, c.count],
        })),
      ],
      true
    );

    await syncDB();
    await saveToStorage('hasOnboarded', true);

    const fresh = await loadDataFromDB();
    setHabits(fresh.habits);
    setCompletions(fresh.completions);
    setHasOnboarded(true);
  }

  async function reorderHabits(newOrderedHabits: Habit[]) {
    // 1. Optimistic State Update
    setHabits(newOrderedHabits);

    try {
      const db = await getDB();

      // 2. Perform updates in a single loop
      // Note: We use a loop here because we're usually reordering < 20 items.
      for (let i = 0; i < newOrderedHabits.length; i++) {
        await db.run(`UPDATE habits SET sortOrder = ? WHERE id = ?;`, [i, newOrderedHabits[i].id]);
      }

      // 3. Persist to IndexedDB (Web only)
      await syncDB();
      void hapticsLight();
    } catch (e) {
      console.error('Failed to sync reorder to DB:', e);
      // Optional: Re-fetch from DB to reset UI on failure
      const fresh = await loadDataFromDB();
      setHabits(fresh.habits);
    }
  }

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    void saveToStorage('darkMode', next);
  }

  async function applyImport(
    json: string
  ): Promise<{ success: boolean; error?: string; warning?: string }> {
    const parsed = importData(json);
    if (!parsed.success) return parsed;

    const db = await getDB();

    try {
      // Cancel existing OS notifications then wipe all data (cascade handles completions + queue)
      await cancelAllHabitNotifications();
      await db.executeSet(
        [
          { statement: `DELETE FROM habits`, values: [] },
          ...parsed.habits.map((h, i) => ({
            statement: `INSERT INTO habits (id, name, createdAt, times, periodLength, periodUnit, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            values: [
              h.id,
              h.name,
              h.createdAt,
              h.frequency.times,
              h.frequency.periodLength,
              h.frequency.periodUnit,
              i,
            ],
          })),
          ...parsed.completions.map(c => ({
            statement: `INSERT INTO completions (habitId, date, count) VALUES (?, ?, ?)`,
            values: [c.habitId, c.date, c.count],
          })),
        ],
        true
      );

      // Schedule notifications, request permission if needed
      let warning: string | undefined;
      const notifHabits = parsed.habits.filter(h => h.notification?.enabled);
      if (isNative && notifHabits.length > 0) {
        const granted =
          (await checkNotificationPermission()) || (await requestNotificationPermission());
        if (!granted) {
          warning = `Import successful, but ${notifHabits.length} reminder${notifHabits.length === 1 ? '' : 's'} couldn't be scheduled — notification permission was denied.`;
        } else {
          for (const h of notifHabits) {
            try {
              await syncHabitNotification(h, h.notification!, new Date());
            } catch (e) {
              console.warn(`[import] Failed to schedule notifications for ${h.name}`, e);
            }
          }
        }
      }

      await syncDB();
      await saveToStorage('hasOnboarded', true);

      const fresh = await loadDataFromDB();
      setHabits(fresh.habits);
      setCompletions(fresh.completions);
      setHasOnboarded(true);

      return { success: true, warning };
    } catch (e) {
      console.error('❌ Import failed:', e);
      return {
        success: false,
        error: `Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }
  }

  if (loading)
    return <div style={{ height: '100dvh', background: 'var(--color-background-secondary)' }} />;

  return (
    <HabitContext.Provider
      value={{
        habits,
        completions,
        displayDate,
        isFutureDate,
        hasOnboarded,
        darkMode,
        addHabit,
        updateCompletion,
        deleteHabit,
        editHabit,
        shiftDate,
        setDate,
        clearAll,
        loadDemoData,
        applyImport,
        reorderHabits,
        toggleDarkMode,
        osNotificationsGranted,
        recheckNotificationPermission,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}
