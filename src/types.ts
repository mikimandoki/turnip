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
      time: z.string(), // "HH:MM"
    })
    .optional(),
});

// A habit the user wants to track
export type Habit = z.infer<typeof HabitSchema>;

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
