import { parseISO, subDays } from 'date-fns';
import emojiRegex from 'emoji-regex-xs';

import type { Completion, Frequency, Habit, HabitStats } from '../types';

import { endDatePeriod, startDatePeriod, toDateString } from './date';

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
  habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'>,
  completions: Completion[],
  start: string,
  end: string
): number {
  return completions
    .filter(c => c.habitId === habit.id && c.date >= start && c.date <= end)
    .reduce((sum, c) => sum + c.count, 0);
}

// How many completions have been logged in the current period
export function getCompletionsInPeriod(
  habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'>,
  completions: Completion[],
  date: Date
): number {
  const periodStart = startDatePeriod(habit, date);
  return getCompletionsInRange(habit, completions, periodStart, toDateString(date));
}

export function getTotalCompletions(habit: Habit, completions: Completion[], date: Date): number {
  return getCompletionsInRange(habit, completions, habit.createdAt, toDateString(date));
}

export function calculateHabitStats(
  habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'>,
  completions: Completion[],
  date: Date
): HabitStats {
  const runs: number[] = [];
  let currentRun = 0;
  let totalPeriods = 0;
  let completedPeriods = 0;
  let firstPeriodCompleted: boolean | null = null;
  let secondPeriodCompleted: boolean | null = null;

  const habitCompletions = completions.filter(c => c.habitId === habit.id);
  const todayString = toDateString(date);
  let checkDate = date;

  while (true) {
    const periodStart = startDatePeriod(habit, checkDate);
    const periodEnd = endDatePeriod(habit, checkDate);

    if (periodEnd < habit.createdAt) break;

    const count = habitCompletions
      .filter(c => c.date >= periodStart && c.date <= periodEnd && c.date <= todayString)
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
    if (toDateString(checkDate) < habit.createdAt) break;
  }

  if (currentRun > 0) runs.push(currentRun);

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
