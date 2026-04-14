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

// Schema for raw habit rows from SQLite (includes notification columns)
export const HabitRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  times: z.number(),
  periodLength: z.number(),
  periodUnit: z.enum(['day', 'week', 'month']),
  sortOrder: z.number(),
  updated_at: z.string().nullable(),
  notif_enabled: z.number().nullable(),
  notif_mode: z.enum(['daily', 'days-of-week', 'interval', 'days-of-month']).nullable(),
  notif_time: z.string().nullable(),
  notif_days: z.string().nullable(),
  notif_monthDays: z.string().nullable(),
  notif_customMessage: z.string().nullable(),
  notif_intervalN: z.number().nullable(),
  notif_intervalUnit: z.enum(['days', 'weeks']).nullable(),
});

export type HabitRowFromDB = z.infer<typeof HabitRowSchema>;

export const CompletionSchema = z.object({
  habitId: z.string(),
  date: z.string(),
  count: z.number().min(0),
});

// A single completion of a habit
export type Completion = z.infer<typeof CompletionSchema>;

// Schema for validating raw completion rows from SQLite
export const CompletionRowSchema = z.object({
  habitId: z.string(),
  date: z.string(),
  count: z.number(),
  updated_at: z.string().nullable(),
});

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
  | 'Cancel edits'
  | 'Custom notification message'
  | 'Dark mode'
  | 'Decrease count'
  | 'Decrease interval'
  | 'Decrease period'
  | 'Decrease times'
  | 'Delete habit'
  | 'Edit habit'
  | 'Email address'
  | 'Email verification code'
  | 'Frequency unit'
  | 'Go back'
  | 'Habit icon'
  | 'Habit name'
  | 'Habit name input'
  | 'Increase count'
  | 'Increase interval'
  | 'Increase period'
  | 'Increase times'
  | 'Interval count'
  | 'Navigate back'
  | 'Next day'
  | 'Next month'
  | 'Notification time'
  | 'Open settings'
  | 'Period length'
  | 'Previous day'
  | 'Previous month'
  | 'Remind me'
  | 'Save edits'
  | 'Select date'
  | 'Switch to dark mode'
  | 'Switch to light mode'
  | 'Times'
  // Templated labels — interpolated values are enforced by TypeScript's template literal types
  | `${number} of ${number} completions`
  | `${string}, remove`
  | `${string}: ${number} of ${number} completion`
  | `${string}: ${number} of ${number} completions`;
