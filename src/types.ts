import { z } from 'zod';

export const FrequencySchema = z.object({
  times: z.number().min(1),
  periodLength: z.number().min(1),
  periodUnit: z.enum(['day', 'week', 'month']),
});

// How often the habit should be done
// "times" completions per "period" of "periodLength" days/weeks/months
//
// Examples:
//   Every day:              { times: 1, periodLength: 1, periodUnit: "day" }
//   3x per week:            { times: 3, periodLength: 1, periodUnit: "week" }
//   Every 2 weeks:          { times: 1, periodLength: 2, periodUnit: "week" }
//   5x every 3 weeks:       { times: 5, periodLength: 3, periodUnit: "week" }
//   10x per month:          { times: 10, periodLength: 1, periodUnit: "month" }
export type Frequency = z.infer<typeof FrequencySchema>;

export const HabitSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  frequency: FrequencySchema,
  createdAt: z.string(),
  notification: z
    .object({
      enabled: z.boolean(),
      mode: z.enum(['daily', 'days-of-week', 'interval', 'days-of-month']).default('daily'),
      time: z.string(), // "HH:MM"
      customMessage: z.string().default(''),
      days: z.array(z.number().min(1).max(7)).default([1, 2, 3, 4, 5, 6, 7]), // 1=Sun…7=Sat, Capacitor convention
      intervalN: z.number().min(1).default(1),
      intervalUnit: z.enum(['days', 'weeks']).default('days'),
      monthDays: z.array(z.number().min(1).max(31)).default([]),
    })
    .optional(),
});

// A habit the user wants to track
export type Habit = z.infer<typeof HabitSchema>;

export type HabitRowFromDB = {
  id: string;
  name: string;
  createdAt: string;
  times: number;
  periodLength: number;
  periodUnit: Frequency['periodUnit'];
  sortOrder: number;
  notif_enabled: number | null;
  notif_mode: 'daily' | 'days-of-month' | 'days-of-week' | 'interval' | null;
  notif_time: string | null;
  notif_days: string | null; // JSON string
  notif_monthDays: string | null; // JSON string
  notif_customMessage: string | null;
  notif_intervalN: number | null;
  notif_intervalUnit: 'days' | 'weeks' | null;
};

export const CompletionSchema = z.object({
  habitId: z.string(),
  date: z.string(),
  count: z.number().min(0),
});

// A single completion of a habit
export type Completion = z.infer<typeof CompletionSchema>;

export interface HabitStats {
  currentStreak: number;
  previousStreak: number;
  maxStreak: number;
  completionRate: number;
  totalPeriods: number;
  completedPeriods: number;
  streakContinuable: boolean; // current period not yet done, but the previous one was
}

type DevTestId = 'dev-delete-all' | 'dev-password' | 'dev-submit';

export type DataTestId =
  | DevTestId
  | 'completion-count'
  | 'error-message'
  | 'habit-title'
  | 'input-email'
  | 'progress-bar'
  | 'streak-indicator-continuable'
  | 'streak-indicator-ongoing'
  | 'submit-email'
  | 'submit-password';

export type AriaLabel =
  | 'Add habit'
  | 'Add new habit'
  | 'Decrease count'
  | 'Decrease interval'
  | 'Decrease period'
  | 'Decrease times'
  | 'Delete habit'
  | 'Edit habit'
  | 'Error message'
  | 'Frequency unit'
  | 'Habit card'
  | 'Habit name'
  | 'Habit name input'
  | 'Increase count'
  | 'Increase interval'
  | 'Increase period'
  | 'Increase times'
  | 'Navigate back'
  | 'Next day'
  | 'Next month'
  | 'Open settings'
  | 'Period length'
  | 'Previous day'
  | 'Previous month'
  | 'Save edits'
  | 'Switch to dark mode'
  | 'Switch to light mode'
  | 'Times';
