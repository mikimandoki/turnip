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
import { toDateString } from '../utils/date';
import { generateDemoData } from '../utils/demoData';
import { hapticsLight, hapticsMedium } from '../utils/haptics';
import {
  cancelAllHabitNotifications,
  cancelHabitNotifications,
  checkNotificationPermission,
  requestNotificationPermission,
  scheduleHabitNotifications,
} from '../utils/localNotifications';
import {
  clearStorage,
  HasOnboardedSchema,
  importData,
  loadFromStorage,
  saveToStorage,
} from '../utils/localStorage';
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
    let habitToSave = newHabit;

    if (newHabit.notification?.enabled && isNative) {
      const ids = await scheduleHabitNotifications(
        newHabit.id,
        newHabit.name,
        newHabit.notification
      );
      habitToSave = {
        ...newHabit,
        notification: { ...newHabit.notification, notificationIds: ids },
      };
    }

    // 1. Optimistic UI Update
    setHabits(prev => [...prev, habitToSave]);
    setHasOnboarded(true);

    // 2. Database Write
    try {
      const db = await getDB();
      await db.run(
        `INSERT INTO habits (id, name, createdAt, times, periodLength, periodUnit) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          habitToSave.id,
          habitToSave.name,
          habitToSave.createdAt,
          habitToSave.frequency.times,
          habitToSave.frequency.periodLength,
          habitToSave.frequency.periodUnit,
        ]
      );
      await syncDB(); // Crucial for persistence on refresh
      void Toast.show({ text: 'Habit added successfully ✅' });
    } catch (e) {
      console.error('DB Insert Failed', e);
      // Rollback UI if DB fails
      setHabits(prev => prev.filter(h => h.id !== newHabit.id));
    }

    void hapticsMedium();
  }

  async function editHabit(habit: Habit, updates: Partial<Habit>) {
    const db = await getDB();
    const sanitized = updates.name ? { ...updates, name: updates.name.trim() } : updates;
    const merged = { ...habit, ...sanitized };

    try {
      // 1. Update DB
      await db.run(`UPDATE habits SET name = ? WHERE id = ?;`, [merged.name.trim(), habit.id]);
      await syncDB();

      // 2. Handle Notifications
      void cancelHabitNotifications(habit.notification?.notificationIds ?? []);
      let notif = merged.notification;
      if (notif?.enabled && isNative) {
        const ids = await scheduleHabitNotifications(merged.id, merged.name, notif);
        notif = { ...notif, notificationIds: ids };
      }

      // 3. Update State (Stop using saveToStorage for habits!)
      const final = { ...merged, notification: notif };
      setHabits(prev => prev.map(h => (h.id === habit.id ? final : h)));
    } catch (e) {
      console.error('Could not edit habit in SQLite:', e);
    }
  }

  async function loadDataFromDB() {
    try {
      const db = await getDB();

      // 1. Run queries in parallel for speed
      const [habitsResult, completionsResult] = await Promise.all([
        db.query(`SELECT * FROM habits ORDER BY createdAt ASC`),
        db.query(`SELECT * FROM completions`),
      ]);

      // 2. Map Habits (using your existing row-to-object logic)
      const habits: Habit[] = ((habitsResult.values as HabitRowFromDB[]) || []).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.createdAt,
        frequency: {
          times: row.times,
          periodLength: row.periodLength,
          periodUnit: row.periodUnit,
        },
      }));

      // 3. Map Completions
      const completions: Completion[] = (completionsResult.values as Completion[]) || [];

      // 4. Validate and Return
      return {
        habits: z.array(HabitSchema).parse(habits),
        completions: z.array(CompletionSchema).parse(completions), // Assuming you have a CompletionSchema
      };
    } catch (e) {
      console.error('Database hydration failed:', e);
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
      // 1. Database Delete
      await db.run(`DELETE FROM habits WHERE id = ?;`, [habit.id]);
      // 2. Web Persistence Sync
      await syncDB();

      // 3. Keep existing memory/UI logic for now
      const updatedHabits = habits.filter(h => h.id !== habit.id);
      const updatedCompletions = completions.filter(c => c.habitId !== habit.id);

      setHabits(updatedHabits);
      setCompletions(updatedCompletions);

      // Still saving completions to the old storage until that table is ready
      void saveToStorage('completions', updatedCompletions);

      // 4. System Feedback
      void hapticsMedium();
      void cancelHabitNotifications(habit.notification?.notificationIds ?? []);
    } catch (e) {
      console.error('Could not delete habit from SQLite:', e);
      // Optional: Show a toast to the user if the DB fails
    }
  }

  function shiftDate(days: number) {
    setDateString(toDateString(addDays(displayDate, days)));
  }

  function setDate(value: string | null) {
    setDateString(value ?? toDateString(new Date()));
  }

  function clearAll() {
    void cancelAllHabitNotifications();
    void clearStorage();
    setHabits([]);
    setCompletions([]);
  }

  function loadDemoData() {
    const { habits: demoHabits, completions: demoCompletions } = generateDemoData();
    setHabits(demoHabits);
    setCompletions(demoCompletions);
    void saveToStorage('habits', demoHabits);
    void saveToStorage('completions', demoCompletions);
    void saveToStorage('hasOnboarded', true);
    setHasOnboarded(true);
  }

  function reorderHabits(newOrder: Habit[]) {
    setHabits(newOrder);
    void saveToStorage('habits', newOrder);
  }

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    void saveToStorage('darkMode', next);
  }

  async function applyImport(
    json: string
  ): Promise<{ success: boolean; error?: string; warning?: string }> {
    const result = await importData(json);
    if (result.success) {
      setCompletions(result.completions);
      const notifHabits = result.habits.filter(h => h.notification?.enabled);
      if (isNative && notifHabits.length > 0) {
        const granted =
          (await checkNotificationPermission()) || (await requestNotificationPermission());
        if (!granted) {
          setHabits(result.habits);
          return {
            ...result,
            warning: `Import successful, but ${notifHabits.length} reminder${notifHabits.length === 1 ? '' : 's'} couldn't be scheduled — notification permission was denied. You can enable it in your device settings.`,
          };
        }
        const habitsWithIds = await Promise.all(
          result.habits.map(async h => {
            if (!h.notification?.enabled) return h;
            const ids = await scheduleHabitNotifications(h.id, h.name, h.notification);
            return { ...h, notification: { ...h.notification, notificationIds: ids } };
          })
        );
        setHabits(habitsWithIds);
        void saveToStorage('habits', habitsWithIds);
        return result;
      }
      setHabits(result.habits);
    }
    return result;
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
