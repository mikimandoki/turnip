import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

import type { Frequency } from '../types';

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

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
