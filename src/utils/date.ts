import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
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

// How many days have passed between start of period and date
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
