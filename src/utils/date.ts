import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isTomorrow,
  isYesterday,
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

// Determine the start date of the currently computed period
export function startDatePeriod(frequency: Frequency, date: Date): string {
  switch (frequency.periodUnit) {
    case 'day':
      return toDateString(startOfDay(date));
    case 'week':
      return toDateString(startOfWeek(date, { weekStartsOn: 1 }));
    case 'month':
      return toDateString(startOfMonth(date));
  }
}

// Determine the end date of the currently computed period
export function endDatePeriod(frequency: Frequency, date: Date): string {
  switch (frequency.periodUnit) {
    case 'day':
      return toDateString(endOfDay(date));
    case 'week':
      return toDateString(endOfWeek(date, { weekStartsOn: 1 }));
    case 'month':
      return toDateString(endOfMonth(date));
  }
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
