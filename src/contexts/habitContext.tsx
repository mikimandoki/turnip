import { Toast } from '@capacitor/toast';
import { addDays, isFuture, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { useBackButton } from '../hooks/useBackButton';
import { useDarkMode } from '../hooks/useDarkMode';
import { useNotificationPermission } from '../hooks/useNotificationPermission';
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
} from '../utils/localNotifications';
import {
  clearStorage,
  HasOnboardedSchema,
  loadFromStorage,
  saveToStorage,
} from '../utils/localStorage';
import { cancelNotificationsForHabit, syncHabitNotification } from '../utils/notificationService';
import { getDB, syncDB } from '../utils/sqlite';
import { APP_NAME } from '../utils/strings';
import { supabase } from '../utils/supabase';
import {
  deleteSupabaseAccount,
  pullAll,
  pushAllCompletions,
  pushAllHabits,
  pushCompletion,
  pushHabit,
  softDeleteAllHabits,
  softDeleteCompletion,
  softDeleteHabit,
  syncOnSignIn,
} from '../utils/syncService';
import { isNative } from '../utils/utils';
import { HabitContext } from './useHabitContext';

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  // TODO: store displayDate as a Date directly instead of round-tripping through string.
  // Currently: new Date() → toDateString (string) → parseISO (Date) on every render.
  // Store a Date in state and only convert to string when writing to DB or comparing dates.
  const [dateString, setDateString] = useState<string>(toDateString(new Date()));
  const displayDate = useMemo(() => parseISO(dateString), [dateString]);
  const isFutureDate = import.meta.env.MODE !== 'development' && isFuture(displayDate);

  useBackButton();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const {
    osNotificationsGranted,
    notifPermissionPrompt,
    setNotifPermissionPrompt,
    recheckNotificationPermission,
    dismissNotifPrompt,
    confirmNotifPrompt,
    onVisible: onNotifVisible,
  } = useNotificationPermission();

  async function updateCompletion(habitId: string, increment: number) {
    const today = dateString;
    const db = await getDB();

    try {
      // 1. Handle the "Delete if Zero" logic or "Decrement"
      // We check the current count first to see if we're hitting zero
      const existing = completions.find(c => c.habitId === habitId && c.date === today);
      const newCount = (existing?.count ?? 0) + increment;

      if (newCount < 0) return;

      const now = new Date().toISOString();
      if (newCount === 0) {
        await db.run(`DELETE FROM completions WHERE habitId = ? AND date = ?;`, [habitId, today]);
        void softDeleteCompletion(habitId, today).catch(e =>
          console.error('[sync] softDeleteCompletion failed:', e)
        );
      } else {
        await db.run(
          `INSERT INTO completions (habitId, date, count, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(habitId, date) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at;`,
          [habitId, today, newCount, now]
        );
        void pushCompletion(habitId, today, newCount).catch(e =>
          console.error('[sync] pushCompletion failed:', e)
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
        `INSERT INTO habits (id, name, createdAt, times, periodLength, periodUnit, sortOrder, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newHabit.id,
          newHabit.name,
          newHabit.createdAt,
          newHabit.frequency.times,
          newHabit.frequency.periodLength,
          newHabit.frequency.periodUnit,
          maxSort + 1,
          new Date().toISOString(),
        ]
      );

      // 3. Notifications: schedule OS reminders + persist settings + fill queue
      if (newHabit.notification?.enabled) {
        await syncHabitNotification(newHabit, newHabit.notification, new Date());
      } else {
        await syncDB();
      }

      // 4. Push to Supabase (fire-and-forget)
      const sortResult2 = await db.query(`SELECT sortOrder FROM habits WHERE id = ?`, [
        newHabit.id,
      ]);
      const sortOrder =
        (sortResult2.values?.[0] as { sortOrder: number } | undefined)?.sortOrder ?? 0;
      void pushHabit(newHabit, sortOrder).catch(e => console.error('[sync] pushHabit failed:', e));
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
        `UPDATE habits SET name = ?, times = ?, periodLength = ?, periodUnit = ?, updated_at = ? WHERE id = ?;`,
        [
          merged.name.trim(),
          merged.frequency.times,
          merged.frequency.periodLength,
          merged.frequency.periodUnit,
          new Date().toISOString(),
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

      // 4. Push to Supabase (fire-and-forget)
      const sortRes = await db.query(`SELECT sortOrder FROM habits WHERE id = ?`, [habit.id]);
      const sortOrder = (sortRes.values?.[0] as { sortOrder: number } | undefined)?.sortOrder ?? 0;
      void pushHabit(merged, sortOrder).catch(e => console.error('[sync] pushHabit failed:', e));

      void hapticsMedium();
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
      // TODO: filter by date range (e.g. last 90 days) once completion history grows large
      const compResult = await db.query(`SELECT * FROM completions`);
      const completions = compResult.values || [];

      // 4. Final Zod Validation
      return {
        habits: z.array(HabitSchema).parse(habits),
        completions: z.array(CompletionSchema).parse(completions),
      };
    } catch (e) {
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
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void Promise.allSettled([
        onNotifVisible(habits),
        (async () => {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return;
          const db = await getDB();
          await pullAll(db);
          const synced = await loadDataFromDB();
          setHabits(synced.habits);
          setCompletions(synced.completions);
        })(),
      ]);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [habits, onNotifVisible]);

  useEffect(() => {
    void (async () => {
      const db = await getDB();
      const [dbData, onboarded] = await Promise.all([
        loadDataFromDB(),
        loadFromStorage('hasOnboarded', false, HasOnboardedSchema),
      ]);

      // Pull from Supabase if signed in, then reload local state
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await pullAll(db);
        const synced = await loadDataFromDB();
        setHabits(synced.habits);
        setCompletions(synced.completions);
      } else {
        setHabits(dbData.habits);
        setCompletions(dbData.completions);
      }

      setHasOnboarded(onboarded || dbData.habits.length > 0);
      setLoading(false);
    })();
  }, []);

  // On sign-in: push local data up, then pull remote down, then refresh UI
  // TODO: this IIFE has race conditions — if SIGNED_IN fires twice quickly (e.g. token refresh)
  // both runs execute concurrently with no guard. Also, errors at any step fail silently.
  // Consider a dedicated sync state machine or at minimum an in-flight flag.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        void (async () => {
          const db = await getDB();
          await syncOnSignIn(db);
          const synced = await loadDataFromDB();
          setHabits(synced.habits);
          setCompletions(synced.completions);
        })();
      }
    });
    return () => listener.subscription.unsubscribe();
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
      void softDeleteHabit(habit.id).catch(e => console.error('[sync] softDeleteHabit failed:', e));

      // 3. Sync the SQLite file to IndexedDB (Web layer)
      await syncDB();

      // 4. Update React State
      setHabits(habits.filter(h => h.id !== habit.id));
      setCompletions(completions.filter(c => c.habitId !== habit.id));

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
    void softDeleteAllHabits().catch(e => console.error('[sync] softDeleteAllHabits failed:', e));
    await db.run(`DELETE FROM habits`);
    await syncDB();
    await clearStorage();
    setHabits([]);
    setCompletions([]);
    setHasOnboarded(false);
  }

  async function deleteAccount(): Promise<{ error?: string }> {
    const result = await deleteSupabaseAccount();
    if (result.error) return result;

    const db = await getDB();
    await cancelAllHabitNotifications();
    await db.run(`DELETE FROM habits`);
    await syncDB();
    await clearStorage();
    // Session is already invalidated by account deletion — signOut may 403, that's fine.
    await supabase.auth.signOut().catch(() => undefined);

    setHabits([]);
    setCompletions([]);
    setHasOnboarded(false);

    return {};
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
      // TODO: replace with executeSet for atomicity.
      const reorderNow = new Date().toISOString();
      for (let i = 0; i < newOrderedHabits.length; i++) {
        await db.run(`UPDATE habits SET sortOrder = ?, updated_at = ? WHERE id = ?;`, [
          i,
          reorderNow,
          newOrderedHabits[i].id,
        ]);
      }

      // 3. Persist to IndexedDB (Web only)
      await syncDB();
      void pushAllHabits(newOrderedHabits).catch(e =>
        console.error('[sync] pushAllHabits failed:', e)
      );
      void hapticsLight();
    } catch (e) {
      console.error('Failed to sync reorder to DB:', e);
      const fresh = await loadDataFromDB();
      setHabits(fresh.habits);
    }
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
            statement: `INSERT INTO habits (id, name, createdAt, times, periodLength, periodUnit, sortOrder, updated_at,
              notif_enabled, notif_mode, notif_time, notif_days, notif_monthDays, notif_customMessage, notif_intervalN, notif_intervalUnit)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            values: [
              h.id,
              h.name,
              h.createdAt,
              h.frequency.times,
              h.frequency.periodLength,
              h.frequency.periodUnit,
              i,
              new Date().toISOString(),
              h.notification?.enabled ? 1 : 0,
              h.notification?.mode ?? null,
              h.notification?.time ?? null,
              h.notification?.days ? JSON.stringify(h.notification.days) : null,
              h.notification?.monthDays ? JSON.stringify(h.notification.monthDays) : null,
              h.notification?.customMessage ?? null,
              h.notification?.intervalN ?? null,
              h.notification?.intervalUnit ?? null,
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
      const notifHabits = parsed.habits.filter(h => h.notification?.enabled);
      if (isNative && notifHabits.length > 0) {
        const permStatus = await checkNotificationPermission();
        if (permStatus === 'granted') {
          for (const h of notifHabits) {
            try {
              await syncHabitNotification(h, h.notification!, new Date());
            } catch (e) {
              console.warn(`[import] Failed to schedule notifications for ${h.name}`, e);
            }
          }
        } else if (permStatus === 'blocked') {
          setNotifPermissionPrompt({
            title: 'Import successful',
            message: `Some of your habits have reminders, but notifications are turned off. Enable them in your device settings to receive notifications.`,
            habits: [],
            blocked: true,
          });
        } else {
          setNotifPermissionPrompt({
            title: 'Import successful',
            message: `Some of your habits have reminders. ${APP_NAME} needs permission to send notifications.`,
            habits: notifHabits,
          });
        }
      }

      await syncDB();
      await saveToStorage('hasOnboarded', true);

      void pushAllHabits(parsed.habits).catch(e =>
        console.error('[sync] pushAllHabits failed:', e)
      );
      void pushAllCompletions(parsed.completions).catch(e =>
        console.error('[sync] pushAllCompletions failed:', e)
      );

      const fresh = await loadDataFromDB();
      setHabits(fresh.habits);
      setCompletions(fresh.completions);
      setHasOnboarded(true);

      return { success: true };
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
        deleteAccount,
        loadDemoData,
        applyImport,
        reorderHabits,
        toggleDarkMode,
        osNotificationsGranted,
        recheckNotificationPermission,
        notifPermissionPrompt,
        dismissNotifPrompt,
        confirmNotifPrompt,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}
