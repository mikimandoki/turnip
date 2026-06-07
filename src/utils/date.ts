import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  format,
  isPast,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns';

import type { Completion, Frequency, Habit } from '../types';

const unitOps: Record<
  Frequency['periodUnit'],
  {
    add: (d: Date, n: number) => Date;
    differenceIn: (a: Date, b: Date) => number;
  }
> = {
  day: {
    add: addDays,
    differenceIn: differenceInDays,
  },
  week: {
    add: addWeeks,
    differenceIn: differenceInWeeks,
  },
  month: {
    add: addMonths,
    differenceIn: differenceInMonths,
  },
};

export function startDatePeriod(
  habit: Pick<Habit, 'frequency' | 'startDate'>,
  now: Date,
  completions?: Completion[]
): string {
  if (habit.frequency.flexiblePeriod && completions) {
    return flexibleStartDatePeriod(habit, now, completions);
  }

  const ops = unitOps[habit.frequency.periodUnit];

  // Daily habits with periodLength 1 reset each day
  if (habit.frequency.periodUnit === 'day' && habit.frequency.periodLength === 1) {
    return toDateString(now);
  }

  // All other habits use startDate as the epoch anchor
  // Periods are calculated as exact units from the start date
  const anchor = parseISO(habit.startDate);
  const totalPeriods = ops.differenceIn(now, anchor);
  const elapsedPeriods = Math.floor(totalPeriods / habit.frequency.periodLength);
  return toDateString(ops.add(anchor, elapsedPeriods * habit.frequency.periodLength));
}

function flexibleStartDatePeriod(
  habit: Pick<Habit, 'frequency' | 'startDate'> & { id?: string },
  now: Date,
  completions: Completion[]
): string {
  const ops = unitOps[habit.frequency.periodUnit];
  const nowStr = toDateString(now);
  if (nowStr <= habit.startDate) return habit.startDate;

  // Daily/1 fast path — each day is its own period regardless of flexibility
  if (habit.frequency.periodUnit === 'day' && habit.frequency.periodLength === 1) {
    return nowStr;
  }

  // Walk completions chronologically to determine period boundaries
  // Only consider completions strictly before `now` so we don't overshoot
  const habitCompletions = completions
    .filter(
      c => (!habit.id || c.habitId === habit.id) && c.date >= habit.startDate && c.date < nowStr
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (habitCompletions.length === 0) return habit.startDate;

  let periodStart = parseISO(habit.startDate);
  let countInPeriod = 0;

  for (const completion of habitCompletions) {
    const compDate = parseISO(completion.date);
    const periodEnd = addDays(ops.add(periodStart, habit.frequency.periodLength), -1);

    // If completion is past period end, period was missed — advance to next boundary
    if (compDate > periodEnd) {
      periodStart = addDays(periodEnd, 1);
      countInPeriod = 0;
    }

    countInPeriod += completion.count;
    if (countInPeriod >= habit.frequency.times) {
      periodStart = addDays(compDate, 1);
      countInPeriod = 0;
    }
  }

  return toDateString(periodStart);
}

export function endDatePeriod(
  habit: Pick<Habit, 'frequency' | 'startDate'>,
  date: Date,
  completions?: Completion[]
): string {
  const periodStart = parseISO(startDatePeriod(habit, date, completions));
  const ops = unitOps[habit.frequency.periodUnit];

  // End date is start + periodLength units, then subtract 1 day to get the last day of the period
  const periodEnd = ops.add(periodStart, habit.frequency.periodLength);
  return toDateString(addDays(periodEnd, -1));
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function namedDayOrDate(date: Date): string {
  const baseDateFormat = 'EEEE, MMMM d';
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isThisYear(date)) return format(date, baseDateFormat); // Saturday, March 28
  return format(date, baseDateFormat + ' y'); // Friday, March 28 2025
}

export function isTimeInPast(hh: number, mm: number, date: Date): boolean {
  const inputDate = new Date(date.getTime());
  inputDate.setHours(hh, mm, 0, 0);
  return isPast(inputDate);
}

export function namedDayOrDateShort(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

export function formatDateRange(startStr: string, endStr: string): string {
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  if (format(start, 'yyyy') === format(end, 'yyyy')) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}
