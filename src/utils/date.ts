/**
 * Rules:
 *
 * 1. Always use getCurrentDate() instead of new Date() - respects time travel
 * 2. Always use parseISO(string) instead of new Date(string) - respects timezone
 */

import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { Frequency } from '../types';

let devDateOverride: Date | null = null;

export function setDateOverride(date: Date | null) {
  devDateOverride = date;
}

export function getCurrentDate(): Date {
  return devDateOverride ?? new Date();
}

const unitOps: Record<
  Frequency['periodUnit'],
  {
    startOf: (d: Date) => Date;
    endOf: (d: Date) => Date;
    add: (d: Date, n: number) => Date;
    differenceIn: (a: Date, b: Date) => number;
  }
> = {
  day: {
    startOf: startOfDay,
    endOf: endOfDay,
    add: addDays,
    differenceIn: differenceInDays,
  },
  week: {
    startOf: d => startOfWeek(d, { weekStartsOn: 1 }),
    endOf: d => endOfWeek(d, { weekStartsOn: 1 }),
    add: addWeeks,
    differenceIn: differenceInWeeks,
  },
  month: {
    startOf: startOfMonth,
    endOf: endOfMonth,
    add: addMonths,
    differenceIn: differenceInMonths,
  },
};

export function startDatePeriod(frequency: Frequency, now: Date, createdAt: string): string {
  const ops = unitOps[frequency.periodUnit];
  if (frequency.periodLength === 1) {
    return toDateString(ops.startOf(now));
  }
  const anchor = ops.startOf(parseISO(createdAt));
  const totalPeriods = ops.differenceIn(now, anchor);
  const elapsedPeriods = Math.floor(totalPeriods / frequency.periodLength);
  return toDateString(ops.add(anchor, elapsedPeriods * frequency.periodLength));
}

export function endDatePeriod(frequency: Frequency, date: Date, createdAt: string): string {
  const ops = unitOps[frequency.periodUnit];
  const periodStart = parseISO(startDatePeriod(frequency, date, createdAt));
  return toDateString(ops.endOf(ops.add(periodStart, frequency.periodLength - 1)));
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function namedDayOrDate(): string {
  const date = getCurrentDate();
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}
