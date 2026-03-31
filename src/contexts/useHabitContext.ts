import { createContext, useContext } from 'react';

import type { Completion, Habit, HabitStats } from '../types';

export interface HabitContextType {
  habits: Habit[];
  completions: Completion[];
  displayDate: Date;
  isFutureDate: boolean;
  hasOnboarded: boolean;
  darkMode: boolean;
  addHabit: (habit: Habit) => void;
  updateCompletion: (habitId: string, increment: number) => void;
  deleteHabit: (habit: Habit) => void;
  editHabit: (habit: Habit, updates: Partial<Habit>) => void;
  shiftDate: (days: number) => void;
  setDate: (dateString: string | null) => void;
  clearAll: () => void;
  loadDemoData: () => void;
  applyImport: (json: string) => Promise<{ success: boolean; error?: string; warning?: string }>;
  reorderHabits: (habits: Habit[]) => void;
  toggleDarkMode: () => void;
  osNotificationsGranted: boolean;
  recheckNotificationPermission: () => Promise<void>;
  stats: (HabitStats & { habitId: string })[];
}

export const HabitContext = createContext<HabitContextType | null>(null);

export function useHabitContext() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabitContext must be used within HabitProvider');
  return ctx;
}
