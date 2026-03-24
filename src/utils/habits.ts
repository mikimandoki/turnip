import { parseISO, subDays, subMonths, subWeeks } from 'date-fns';

import type { Completion, Frequency, Habit } from '../types';

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

// How many completions have been logged in the current period
export function getCompletionsInPeriod(habit: Habit, completions: Completion[]): number {
  const now = getCurrentDate();
  const today = toDateString(now);
  const periodStart = startDatePeriod(habit, now);
  return completions
    .filter(c => c.habitId === habit.id && c.date >= periodStart && c.date <= today)
    .reduce((sum, c) => sum + c.count, 0);
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
