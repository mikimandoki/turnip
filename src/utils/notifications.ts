import type { Frequency } from '../types';

export const DAYS = [
  { label: 'Mo', weekday: 2 },
  { label: 'Tu', weekday: 3 },
  { label: 'We', weekday: 4 },
  { label: 'Th', weekday: 5 },
  { label: 'Fr', weekday: 6 },
  { label: 'Sa', weekday: 7 },
  { label: 'Su', weekday: 1 },
];

export type NotificationValue = {
  enabled: boolean;
  time: string;
  days: number[];
};

// Deterministic integer ID from a habit's nanoid string, used to derive notification IDs.
// Per-day notification ID = habitNotificationId(habitId) + weekday (1–7).
export function habitNotificationId(habitId: string): number {
  let h = 5381;
  for (let i = 0; i < habitId.length; i++) {
    h = ((h << 5) + h) ^ habitId.charCodeAt(i);
  }
  return Math.abs(h) % 2_147_483_647;
}

export function defaultNotifDays(frequency: Frequency): number[] {
  if (frequency.periodUnit !== 'week') return [1, 2, 3, 4, 5, 6, 7];
  const count = Math.min(frequency.times, 7);
  return [1, 2, 3, 4, 5, 6, 7]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .sort((a, b) => a - b);
}
