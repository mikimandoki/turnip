import { parseISO, subDays } from 'date-fns';
import emojiRegex from 'emoji-regex-xs';

import type { ArchiveRun, Completion, Frequency, Habit, HabitGroup, HabitStats } from '../types';

import { endDatePeriod, startDatePeriod, toDateString } from './date';

export function getActiveIntervals(
  createdAt: string,
  archiveRuns?: ArchiveRun[]
): { start: string; end: string }[] {
  if (!archiveRuns || archiveRuns.length === 0) {
    return [{ start: createdAt, end: '9999-12-31' }];
  }

  const intervals: { start: string; end: string }[] = [];
  let lastStart = createdAt;

  for (const run of archiveRuns) {
    intervals.push({ start: lastStart, end: run.archivedAt });
    if (run.restoredAt) {
      lastStart = run.restoredAt;
    } else {
      return intervals;
    }
  }

  intervals.push({ start: lastStart, end: '9999-12-31' });
  return intervals;
}

export function isInArchivedInterval(dateStr: string, archiveRuns?: ArchiveRun[]): boolean {
  if (!archiveRuns || archiveRuns.length === 0) return false;
  for (const run of archiveRuns) {
    if (dateStr > run.archivedAt && (!run.restoredAt || dateStr < run.restoredAt)) {
      return true;
    }
  }
  return false;
}

export function getArchiveRuns(
  createdAt: string,
  archiveRuns?: ArchiveRun[]
): { start: string; end: string }[] {
  if (!archiveRuns || archiveRuns.length === 0) return [];

  const runs: { start: string; end: string }[] = [];
  let prevEnd = createdAt;

  for (const ar of archiveRuns) {
    runs.push({ start: prevEnd, end: ar.archivedAt });
    if (ar.restoredAt) {
      prevEnd = ar.restoredAt;
    } else {
      break;
    }
  }

  return runs;
}

export function calculateReorder({
  standaloneHabits,
  habits,
  sourceHabitId,
  targetHabitId,
  insertBefore,
}: {
  standaloneHabits: Habit[];
  habits: Habit[];
  sourceHabitId: string;
  targetHabitId: string;
  insertBefore: boolean;
}): Habit[] {
  const groupedHabits = habits.filter(h => h.groupId);

  let targetIndex: number;
  if (targetHabitId.startsWith('__gap_')) {
    targetIndex = Number(targetHabitId.replace('__gap_', ''));
  } else {
    const targetIdx = standaloneHabits.findIndex(h => h.id === targetHabitId);
    if (targetIdx === -1) return habits;
    targetIndex = insertBefore ? targetIdx : targetIdx + 1;
  }

  const sourceIdx = standaloneHabits.findIndex(h => h.id === sourceHabitId);
  if (sourceIdx === -1) return habits;

  const reordered = [...standaloneHabits];
  const [moved] = reordered.splice(sourceIdx, 1);
  const adjustedIdx = sourceIdx < targetIndex ? targetIndex - 1 : targetIndex;
  reordered.splice(adjustedIdx, 0, moved);

  const reorderedWithSortOrder = reordered.map((h, i) => ({ ...h, sortOrder: i }));

  return [...groupedHabits, ...reorderedWithSortOrder];
}

export function describeFrequency(frequency: Frequency) {
  const unit =
    frequency.periodLength === 1
      ? frequency.periodUnit
      : `${frequency.periodLength} ${frequency.periodUnit}s`;
  const times = frequency.times === 1 ? '' : `${frequency.times}x `;
  const flex = frequency.flexiblePeriod ? ' (flexible)' : '';
  if (frequency.periodLength === 1) {
    switch (frequency.periodUnit) {
      case 'day':
        return `${times}daily${flex}`;
      case 'month':
        return `${times}monthly${flex}`;
      case 'week':
        return `${times}weekly${flex}`;
    }
  } else {
    return `${times}every ${unit}${flex}`;
  }
}

// Count completions between any two dates
function getCompletionsInRange(
  habit: Pick<Habit, 'id'>,
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
  habit: Pick<Habit, 'frequency' | 'id' | 'startDate'>,
  completions: Completion[],
  date: Date
): number {
  const periodStart = startDatePeriod(habit, date, completions);
  return getCompletionsInRange(habit, completions, periodStart, toDateString(date));
}

export function getTotalCompletions(habit: Habit, completions: Completion[], date: Date): number {
  return getCompletionsInRange(
    habit,
    completions,
    habit.startDate ?? habit.createdAt,
    toDateString(date)
  );
}

export function calculateHabitStats(
  habit: Pick<Habit, 'frequency' | 'id' | 'startDate'>,
  completions: Completion[],
  date: Date,
  archiveRuns?: ArchiveRun[]
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

  const intervals = archiveRuns ? getActiveIntervals(habit.startDate, archiveRuns) : undefined;
  const currentIntervalIndex = intervals
    ? intervals.findIndex(i => toDateString(date) >= i.start && toDateString(date) <= i.end)
    : 0;

  while (true) {
    const periodStart = startDatePeriod(habit, checkDate, completions);
    const periodEnd = endDatePeriod(habit, checkDate, completions);

    if (periodEnd < habit.startDate) break;

    const isActive = intervals
      ? intervals.some(i => periodStart >= i.start && periodStart <= i.end)
      : true;

    const inCurrentInterval = intervals
      ? currentIntervalIndex >= 0 &&
        periodStart >= intervals[currentIntervalIndex].start &&
        periodStart <= intervals[currentIntervalIndex].end
      : true;

    const count = habitCompletions
      .filter(c => c.date >= periodStart && c.date <= periodEnd && c.date <= todayString)
      .reduce((sum, c) => sum + c.count, 0);

    if (isActive) {
      if (inCurrentInterval) {
        if (firstPeriodCompleted === null) {
          firstPeriodCompleted = count >= habit.frequency.times;
        } else if (secondPeriodCompleted === null) {
          secondPeriodCompleted = count >= habit.frequency.times;
        }
        totalPeriods++;
        if (count >= habit.frequency.times) {
          completedPeriods++;
        }
      }

      if (count >= habit.frequency.times) {
        currentRun++;
      } else {
        if (currentRun > 0) runs.push(currentRun);
        currentRun = 0;
      }
    } else {
      if (currentRun > 0) runs.push(currentRun);
      currentRun = 0;
    }

    if (periodStart < habit.startDate) break;

    checkDate = subDays(parseISO(periodStart), 1);
    if (toDateString(checkDate) < habit.startDate) break;
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

export function validateGroupName(name: string): string[] {
  const errors: string[] = [];
  const { cleanName } = parseHabitEmoji(name);
  if (!name.trim()) {
    errors.push('Name is required');
  } else if (!cleanName.trim()) {
    errors.push('Group name needs more than just an emoji');
  }
  if (cleanName.length > 50) {
    errors.push('Group name too long');
  }
  return errors;
}

export function calculateGroupStats(
  group: HabitGroup,
  habits: Habit[],
  completions: Completion[],
  date: Date
): HabitStats | null {
  const memberHabits = habits.filter(h => h.groupId === group.id);
  if (memberHabits.length === 0) return null;

  const stats = memberHabits.map(h => calculateHabitStats(h, completions, date, undefined));

  return {
    currentStreak: Math.max(...stats.map(s => s.currentStreak)),
    previousStreak: Math.max(...stats.map(s => s.previousStreak)),
    maxStreak: Math.max(...stats.map(s => s.maxStreak)),
    completionRate:
      stats.reduce((sum, s) => sum + s.completedPeriods, 0) /
      Math.max(
        1,
        stats.reduce((sum, s) => sum + s.totalPeriods, 0)
      ),
    totalPeriods: stats.reduce((sum, s) => sum + s.totalPeriods, 0),
    completedPeriods: stats.reduce((sum, s) => sum + s.completedPeriods, 0),
    streakContinuable: stats.some(s => s.streakContinuable),
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
