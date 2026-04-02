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
  isPast,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { Frequency, Habit } from '../types';

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

export function startDatePeriod(habit: Pick<Habit, 'createdAt' | 'frequency'>, now: Date): string {
  const ops = unitOps[habit.frequency.periodUnit];
  if (habit.frequency.periodLength === 1) {
    return toDateString(ops.startOf(now));
  }
  const anchor = ops.startOf(parseISO(habit.createdAt));
  const totalPeriods = ops.differenceIn(now, anchor);
  const elapsedPeriods = Math.floor(totalPeriods / habit.frequency.periodLength);
  return toDateString(ops.add(anchor, elapsedPeriods * habit.frequency.periodLength));
}

export function endDatePeriod(habit: Pick<Habit, 'createdAt' | 'frequency'>, date: Date): string {
  const ops = unitOps[habit.frequency.periodUnit];
  const periodStart = parseISO(startDatePeriod(habit, date));
  return toDateString(ops.endOf(ops.add(periodStart, habit.frequency.periodLength - 1)));
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
