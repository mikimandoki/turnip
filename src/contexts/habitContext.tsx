import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { addDays, isFuture, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import type { Completion, Habit } from '../types';

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
  CompletionsSchema,
  HabitsSchema,
  HasOnboardedSchema,
  importData,
  loadFromStorage,
  saveToStorage,
} from '../utils/localStorage';
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
    void Promise.all([
      loadFromStorage('habits', [], HabitsSchema),
      loadFromStorage('completions', [], CompletionsSchema),
      loadFromStorage('hasOnboarded', false, HasOnboardedSchema),
      loadFromStorage('darkMode', null, z.boolean().nullable()),
    ]).then(([h, c, o, dm]) => {
      setHabits(h);
      setCompletions(c);
      setHasOnboarded(o);
      setDarkMode(dm ?? window.matchMedia('(prefers-color-scheme: dark)').matches);
      setLoading(false);
    });
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

  function updateCompletion(habitId: string, increment: number) {
    const today = dateString;
    const existing = completions.find(c => c.habitId === habitId && c.date === today);
    let updated;
    if (existing) {
      const newCount = existing.count + increment;
      if (newCount < 0) return;
      if (newCount === 0) {
        updated = completions.filter(c => !(c.habitId === habitId && c.date === today));
      } else {
        updated = completions.map(c =>
          c.habitId === habitId && c.date === today ? { ...c, count: newCount } : c
        );
      }
    } else {
      if (increment < 0) return;
      updated = [...completions, { habitId, date: today, count: increment }];
    }
    setCompletions(updated);
    void saveToStorage('completions', updated);
    void hapticsLight();
  }

  function addHabit(newHabit: Habit) {
    const updated = [...habits, newHabit];
    setHabits(updated);
    void saveToStorage('habits', updated);
    void saveToStorage('hasOnboarded', true);
    setHasOnboarded(true);
    void hapticsMedium();
    if (newHabit.notification?.enabled && newHabit.notification.time) {
      void scheduleHabitNotifications(
        newHabit.id,
        newHabit.name,
        newHabit.notification.time,
        newHabit.notification.days ?? [1, 2, 3, 4, 5, 6, 7]
      );
    }
  }

  function deleteHabit(habit: Habit) {
    const updatedHabits = habits.filter(h => h.id !== habit.id);
    const updatedCompletions = completions.filter(c => c.habitId !== habit.id);
    setHabits(updatedHabits);
    setCompletions(updatedCompletions);
    void saveToStorage('habits', updatedHabits);
    void saveToStorage('completions', updatedCompletions);
    void hapticsMedium();
    void cancelHabitNotifications(habit.id, habit.notification?.days ?? [1, 2, 3, 4, 5, 6, 7]);
  }

  function editHabit(habit: Habit, updates: Partial<Habit>) {
    const sanitized = updates.name ? { ...updates, name: updates.name.trim() } : updates;
    const updated = habits.map(h => (h.id === habit.id ? { ...h, ...sanitized } : h));
    setHabits(updated);
    void saveToStorage('habits', updated);
    const merged = { ...habit, ...sanitized };
    if (merged.notification?.enabled && merged.notification.time) {
      void scheduleHabitNotifications(
        merged.id,
        merged.name,
        merged.notification.time,
        merged.notification.days ?? [1, 2, 3, 4, 5, 6, 7]
      );
    } else {
      void cancelHabitNotifications(merged.id, [1, 2, 3, 4, 5, 6, 7]);
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
      setHabits(result.habits);
      setCompletions(result.completions);
      const notifHabits = result.habits.filter(h => h.notification?.enabled && h.notification.time);
      if (isNative && notifHabits.length > 0) {
        const granted =
          (await checkNotificationPermission()) || (await requestNotificationPermission());
        if (granted) {
          await Promise.all(
            notifHabits.map(h =>
              scheduleHabitNotifications(
                h.id,
                h.name,
                h.notification!.time,
                h.notification!.days ?? [1, 2, 3, 4, 5, 6, 7]
              )
            )
          );
        } else {
          return {
            ...result,
            warning: `Import successful, but ${notifHabits.length} reminder${notifHabits.length === 1 ? '' : 's'} couldn't be scheduled — notification permission was denied. You can enable it in your device settings.`,
          };
        }
      }
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
