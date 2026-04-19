import { createContext, useContext } from 'react';

import type { Completion, Habit, HabitGroup } from '../types';

export interface HabitContextType {
  habits: Habit[];
  completions: Completion[];
  groups: HabitGroup[];
  createGroup: (name: string, habitIdA: string, habitIdB: string) => Promise<void>;
  displayDate: Date;
  isFutureDate: boolean;
  hasOnboarded: boolean;
  darkMode: boolean;
  addHabit: (habit: Habit) => Promise<void>;
  updateCompletion: (habitId: string, increment: number) => Promise<void>;
  deleteHabit: (habit: Habit) => Promise<void>;
  editHabit: (habit: Habit, updates: Partial<Habit>) => Promise<void>;
  shiftDate: (days: number) => void;
  setDate: (dateString: string | null) => void;
  clearAll: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
  loadDemoData: () => Promise<void>;
  applyImport: (json: string) => Promise<{ success: boolean; error?: string }>;
  reorderHabits: (habits: Habit[]) => Promise<void>;
  toggleDarkMode: () => void;
  osNotificationsGranted: boolean;
  recheckNotificationPermission: () => Promise<void>;
  notifPermissionPrompt: {
    title?: string;
    message: string;
    habits: Habit[];
    blocked?: boolean;
  } | null;
  dismissNotifPrompt: () => void;
  confirmNotifPrompt: () => void;
}

export const HabitContext = createContext<HabitContextType | null>(null);

export function useHabitContext() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabitContext must be used within HabitProvider');
  return ctx;
}
