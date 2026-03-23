import { addDays, parseISO } from 'date-fns';
import { useState } from 'react';

import type { Completion, Habit } from '../types';

import { getCurrentDate, setDateOverride, toDateString } from '../utils/date';
import { clearStorage, loadFromStorage, saveToStorage } from '../utils/localStorage';
import { HabitContext } from './useHabitContext';

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', []));
  const [completions, setCompletions] = useState<Completion[]>(() =>
    loadFromStorage('completions', [])
  );
  const [displayDate, setDisplayDate] = useState<string>(toDateString(getCurrentDate()));
  const [showForm, setShowForm] = useState(false);

  function updateCompletion(habitId: string, increment: number) {
    const today = toDateString(getCurrentDate());
    const existing = completions.find(c => c.habitId === habitId && c.date === today);
    let updated;
    if (existing) {
      const newCount = existing.count + increment;
      if (newCount < 0) return;
      updated = completions.map(c =>
        c.habitId === habitId && c.date === today ? { ...c, count: newCount } : c
      );
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
  }

  function deleteHabit(habit: Habit) {
    if (!confirm(`Delete "${habit.name}" ?`)) return;
    const updatedHabits = habits.filter(h => h.id !== habit.id);
    const updatedCompletions = completions.filter(c => c.habitId !== habit.id);
    setHabits(updatedHabits);
    setCompletions(updatedCompletions);
    saveToStorage('habits', updatedHabits);
    saveToStorage('completions', updatedCompletions);
  }

  function shiftDate(days: number) {
    const target = addDays(getCurrentDate(), days);
    setDisplayDate(toDateString(target));
    setDateOverride(target);
  }

  function setDate(dateString: string | null) {
    const date = dateString ? parseISO(dateString) : null;
    setDisplayDate(dateString ?? toDateString(new Date()));
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
        displayDate,
        showForm,
        setShowForm,
        addHabit,
        updateCompletion,
        deleteHabit,
        shiftDate,
        setDate,
        clearAll,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}
