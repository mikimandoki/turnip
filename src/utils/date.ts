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

import type { Frequency, Habit } from '../types';

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

export function startDatePeriod(habit: Pick<Habit, 'frequency' | 'startDate'>, now: Date): string {
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

export function endDatePeriod(habit: Pick<Habit, 'frequency' | 'startDate'>, date: Date): string {
  const periodStart = parseISO(startDatePeriod(habit, date));
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
