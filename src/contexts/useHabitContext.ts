import { createContext, useContext } from 'react';

import type { Completion, Habit } from '../types';

export interface HabitContextType {
  habits: Habit[];
  completions: Completion[];
  displayDate: string;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  addHabit: (habit: Habit) => void;
  updateCompletion: (habitId: string, increment: number) => void;
  deleteHabit: (habit: Habit) => void;
  shiftDate: (days: number) => void;
  setDate: (dateString: string | null) => void;
  clearAll: () => void;
}

export const HabitContext = createContext<HabitContextType | null>(null);

export function useHabitContext() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabitContext must be used within HabitProvider');
  return ctx;
}
