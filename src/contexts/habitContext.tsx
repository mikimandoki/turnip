import { addDays, isFuture, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';

import type { Completion, Habit } from '../types';

import { getCurrentDate, setDateOverride, toDateString } from '../utils/date';
import { calculateHabitStats } from '../utils/habits';
import { clearStorage, loadFromStorage, saveToStorage } from '../utils/localStorage';
import { HabitContext } from './useHabitContext';

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', []));
  const [completions, setCompletions] = useState<Completion[]>(() =>
    loadFromStorage('completions', [])
  );
  const [displayDate, setDisplayDate] = useState<string>(toDateString(getCurrentDate()));
  const isFutureDate = !import.meta.env.DEV && isFuture(parseISO(displayDate));
  const [showForm, setShowForm] = useState(false);

  const stats = useMemo(
    () =>
      habits.map(h => ({
        habitId: h.id,
        ...calculateHabitStats(h, completions),
      })),
    [habits, completions]
  );

  function updateCompletion(habitId: string, increment: number) {
    const today = toDateString(getCurrentDate());
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
    const target = addDays(getCurrentDate(), days);
    setDisplayDate(toDateString(target));
    setDateOverride(target);
  }

  function setDate(dateString: string | null) {
    const date = dateString ? parseISO(dateString) : null;
    setDisplayDate(dateString ?? toDateString(getCurrentDate()));
    setDateOverride(date);
  }

  function clearAll() {
    clearStorage();
    setHabits([]);
    setCompletions([]);
  }

  return (
    <HabitContext.Provider
      value={{
        habits,
        completions,
        stats,
        displayDate,
        isFutureDate,
        showForm,
        setShowForm,
        addHabit,
        updateCompletion,
        deleteHabit,
        editHabit,
        shiftDate,
        setDate,
        clearAll,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}
