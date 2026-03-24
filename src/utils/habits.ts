import { parseISO, subDays, subMonths, subWeeks } from 'date-fns';
import emojiRegex from 'emoji-regex-xs';

import type { Completion, Frequency, Habit, HabitStats } from '../types';

import { endDatePeriod, getCurrentDate, startDatePeriod, toDateString } from './date';

export function describeFrequency(frequency: Frequency) {
  const unit =
    frequency.periodLength === 1
      ? frequency.periodUnit
      : `${frequency.periodLength} ${frequency.periodUnit}s`;
  const times = frequency.times === 1 ? '' : `${frequency.times}x `;
  if (frequency.periodLength === 1) {
    switch (frequency.periodUnit) {
      case 'day':
        return `${times}daily`;
      case 'month':
        return `${times}monthly`;
      case 'week':
        return `${times}weekly`;
    }
  } else {
    return `${times}every ${unit}`;
  }
}

// Count completions between any two dates
function getCompletionsInRange(
  habitId: string,
  completions: Completion[],
  start: string,
  end: string
): number {
  return completions
    .filter(c => c.habitId === habitId && c.date >= start && c.date <= end)
    .reduce((sum, c) => sum + c.count, 0);
}

// How many completions have been logged in the current period
export function getCompletionsInPeriod(habit: Habit, completions: Completion[]): number {
  const now = getCurrentDate();
  const today = toDateString(getCurrentDate());
  const periodStart = startDatePeriod(habit, now);
  return getCompletionsInRange(habit.id, completions, periodStart, today);
}

export function getTotalCompletions(habit: Habit, completions: Completion[]): number {
  const today = toDateString(getCurrentDate());
  return getCompletionsInRange(habit.id, completions, habit.createdAt, today);
}

export function calculateStreak(
  habit: Habit,
  completions: Completion[],
  skipCurrent = false
): number {
  let streak = 0;
  let checkDate = getCurrentDate();
  if (skipCurrent) {
    checkDate = subDays(parseISO(startDatePeriod(habit, checkDate)), 1);
  }
  while (true) {
    const periodStart = startDatePeriod(habit, checkDate);
    const periodEnd = endDatePeriod(habit, checkDate);

    // Period is entirely before the habit existed
    if (periodEnd < habit.createdAt) break;

    const count = completions
      .filter(
        c =>
          c.habitId === habit.id &&
          c.date >= periodStart &&
          c.date <= periodEnd &&
          c.date <= toDateString(getCurrentDate())
      )
      .reduce((sum, c) => sum + c.count, 0);

    if (count >= habit.frequency.times) {
      streak++;
    } else {
      break; // Streak broken
    }

    // This was the creation period (habit started mid-period); nothing before this to check
    if (periodStart < habit.createdAt) break;

    switch (habit.frequency.periodUnit) {
      case 'day':
        checkDate = subDays(checkDate, habit.frequency.periodLength);
        break;
      case 'month':
        checkDate = subMonths(checkDate, habit.frequency.periodLength);
        break;
      case 'week':
        checkDate = subWeeks(checkDate, habit.frequency.periodLength);
        break;
    }
  }

  return streak;
}

export function calculateHabitStats(habit: Habit, completions: Completion[]): HabitStats {
  const runs: number[] = [];
  let currentRun = 0;
  let totalPeriods = 0;
  let completedPeriods = 0;
  let firstPeriodCompleted: boolean | null = null;
  let secondPeriodCompleted: boolean | null = null;

  let checkDate = getCurrentDate();

  while (true) {
    const periodStart = startDatePeriod(habit, checkDate);
    const periodEnd = endDatePeriod(habit, checkDate);

    if (periodEnd < habit.createdAt) break;

    const count = completions
      .filter(
        c =>
          c.habitId === habit.id &&
          c.date >= periodStart &&
          c.date <= periodEnd &&
          c.date <= toDateString(getCurrentDate())
      )
      .reduce((sum, c) => sum + c.count, 0);

    if (firstPeriodCompleted === null) {
      firstPeriodCompleted = count >= habit.frequency.times;
    } else if (secondPeriodCompleted === null) {
      secondPeriodCompleted = count >= habit.frequency.times;
    }
    totalPeriods++;

    if (count >= habit.frequency.times) {
      completedPeriods++;
      currentRun++;
    } else {
      if (currentRun > 0) runs.push(currentRun);
      currentRun = 0;
    }

    if (periodStart < habit.createdAt) break;

    checkDate = subDays(parseISO(periodStart), 1);
  }

  // Don't forget the last run if we ended on a completed period
  if (currentRun > 0) runs.push(currentRun);

  // runs[0] is the most recent run (walking backwards from today)
  const currentStreak = firstPeriodCompleted ? (runs[0] ?? 0) : 0;
  const previousStreak = firstPeriodCompleted ? (runs[1] ?? 0) : (runs[0] ?? 0);
  const maxStreak = Math.max(0, ...runs);
  const completionRate = totalPeriods > 0 ? completedPeriods / totalPeriods : 0;
  const streakContinuable = firstPeriodCompleted === false && secondPeriodCompleted === true;

  return {
    currentStreak,
    previousStreak,
    maxStreak,
    completionRate,
    totalPeriods,
    completedPeriods,
    streakContinuable,
  };
}

export function parseHabitEmoji(name: string): { emoji: string; cleanName: string } {
  // Emoji regex matching leading emoji characters
  const expr = emojiRegex();
  const sanitizedName = name.trim();
  const match = sanitizedName.match(expr);

  if (match && sanitizedName.startsWith(match[0])) {
    return {
      emoji: match[0],
      cleanName: sanitizedName.slice(match[0].length).trim(),
    };
  }

  return {
    emoji: '🌱',
    cleanName: sanitizedName,
  };
}
