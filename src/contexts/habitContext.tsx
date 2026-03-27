import { addDays, isFuture, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';

import type { Completion, Habit } from '../types';

import { toDateString } from '../utils/date';
import { generateDemoData } from '../utils/demoData';
import { calculateHabitStats } from '../utils/habits';
import {
  clearStorage,
  CompletionsSchema,
  HabitsSchema,
  importData,
  loadFromStorage,
  saveToStorage,
} from '../utils/localStorage';
import { HabitContext } from './useHabitContext';

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', [], HabitsSchema));
  const [completions, setCompletions] = useState<Completion[]>(() =>
    loadFromStorage('completions', [], CompletionsSchema)
  );
  const [dateString, setDateString] = useState<string>(toDateString(new Date()));
  const displayDate = useMemo(() => parseISO(dateString), [dateString]);
  const isFutureDate = !import.meta.env.DEV && isFuture(displayDate);

  const stats = useMemo(
    () =>
      habits.map(h => ({
        habitId: h.id,
        ...calculateHabitStats(h, completions, displayDate),
      })),
    [habits, completions, displayDate]
  );

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
    saveToStorage('completions', updated);
  }

  function addHabit(newHabit: Habit) {
    const updated = [...habits, newHabit];
    setHabits(updated);
    saveToStorage('habits', updated);
    saveToStorage('hasOnboarded', true);
  }

  function deleteHabit(habit: Habit) {
    const updatedHabits = habits.filter(h => h.id !== habit.id);
    const updatedCompletions = completions.filter(c => c.habitId !== habit.id);
    setHabits(updatedHabits);
    setCompletions(updatedCompletions);
    saveToStorage('habits', updatedHabits);
    saveToStorage('completions', updatedCompletions);
  }

  function editHabit(habit: Habit, updates: Partial<Habit>) {
    const sanitized = updates.name ? { ...updates, name: updates.name.trim() } : updates;
    const updated = habits.map(h => (h.id === habit.id ? { ...h, ...sanitized } : h));
    setHabits(updated);
    saveToStorage('habits', updated);
  }

  function shiftDate(days: number) {
    setDateString(toDateString(addDays(displayDate, days)));
  }

  function setDate(value: string | null) {
    setDateString(value ?? toDateString(new Date()));
  }

  function clearAll() {
    clearStorage();
    setHabits([]);
    setCompletions([]);
  }

  function loadDemoData() {
    const { habits: demoHabits, completions: demoCompletions } = generateDemoData();
    setHabits(demoHabits);
    setCompletions(demoCompletions);
    saveToStorage('habits', demoHabits);
    saveToStorage('completions', demoCompletions);
    saveToStorage('hasOnboarded', true);
  }

  function reorderHabits(newOrder: Habit[]) {
    setHabits(newOrder);
    saveToStorage('habits', newOrder);
  }

  function applyImport(json: string): { success: boolean; error?: string } {
    const result = importData(json);
    if (result.success) {
      setHabits(loadFromStorage('habits', [], HabitsSchema));
      setCompletions(loadFromStorage('completions', [], CompletionsSchema));
    }
    return result;
  }

  return (
    <HabitContext.Provider
      value={{
        habits,
        completions,
        stats,
        displayDate,
        isFutureDate,
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
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}
