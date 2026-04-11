import type { Frequency } from '../types';

import { simpleHash } from './utils';

export const NOTIFICATION_WINDOW_DAYS = 30;

export const DAYS = [
  { label: 'Mo', weekday: 2 },
  { label: 'Tu', weekday: 3 },
  { label: 'We', weekday: 4 },
  { label: 'Th', weekday: 5 },
  { label: 'Fr', weekday: 6 },
  { label: 'Sa', weekday: 7 },
  { label: 'Su', weekday: 1 },
];

export type NotificationMode = 'daily' | 'days-of-month' | 'days-of-week' | 'interval';

export type NotificationValue = {
  enabled: boolean;
  mode: NotificationMode;
  time: string;
  customMessage: string;
  days: number[]; // days-of-week mode
  intervalN: number; // interval mode: every N
  intervalUnit: 'days' | 'weeks';
  monthDays: number[]; // days-of-month mode: 1–31
};

export function defaultNotificationValue(): NotificationValue {
  return {
    enabled: false,
    mode: 'daily',
    time: '09:00',
    customMessage: '',
    days: [1, 2, 3, 4, 5, 6, 7],
    intervalN: 1,
    intervalUnit: 'days',
    monthDays: [],
  };
}

export function notifModeForUnit(unit: Frequency['periodUnit'] | 'custom'): NotificationMode {
  if (unit === 'week') return 'days-of-week';
  if (unit === 'month') return 'days-of-month';
  if (unit === 'custom') return 'interval';
  return 'daily';
}

// MAX_INT32 - 28 to allow base + 1 through base + 28 without overflow
export const MAX_NOTIFICATION_ID_BASE = 2_147_483_619;

// Deterministic integer ID from habit id, used to derive notification IDs.
// Receives a weekday digit downstream to create unique IDs for each day.
export function habitNotificationId(habitId: string): number {
  return simpleHash(habitId) % MAX_NOTIFICATION_ID_BASE;
}

// Deterministic ID for a single windowed (one-shot) notification occurrence.
// Keyed on habitId + ISO timestamp so top-up batches never collide with prior batches.
export function windowedNotificationId(habitId: string, scheduledAt: Date): number {
  return simpleHash(habitId + ':' + scheduledAt.toISOString()) % MAX_NOTIFICATION_ID_BASE;
}

export function validateNotif(notif: NotificationValue): string | null {
  if (!notif.enabled) return null;
  if (notif.mode === 'days-of-week' && notif.days.length === 0) return 'Select at least one day';
  if (notif.mode === 'days-of-month' && notif.monthDays.length === 0)
    return 'Select at least one day of the month';
  return null;
}

export function defaultNotifDays(frequency: Frequency): number[] {
  if (frequency.periodUnit !== 'week') return [1, 2, 3, 4, 5, 6, 7];
  const count = Math.min(frequency.times, 7);
  return [1, 2, 3, 4, 5, 6, 7]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .sort((a, b) => a - b);
}
