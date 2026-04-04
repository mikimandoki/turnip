import type { Frequency, Habit } from '../types';

// TODO: replace the `window as unknown as` double-cast with a proper interface extension:
// interface WindowWithCapacitor extends Window { Capacitor?: { isNativePlatform: () => boolean } }
// This avoids bypassing TypeScript's type checker. Same pattern in dataTransfer.ts.
export const isNative = !!(
  window as unknown as { Capacitor?: { isNativePlatform: () => boolean } }
).Capacitor?.isNativePlatform();

import { parseHabitEmoji } from './habits';

export function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${parseFloat((n / 1000).toFixed(1))}k`;
  return `${parseFloat((n / 1_000_000).toFixed(1))}M`;
}

export function validateInputs(habit: Pick<Habit, 'name'> & { frequency: Frequency }): string[] {
  const errors: string[] = [];
  const { cleanName } = parseHabitEmoji(habit.name);
  if (!habit.name.trim()) {
    errors.push('Name is required');
  } else if (!cleanName.trim()) {
    errors.push('Habit name needs more than just an emoji');
  }
  if (cleanName.length > 50) {
    errors.push('Habit name too long');
  }
  if (isNaN(habit.frequency.times) || isNaN(habit.frequency.periodLength)) {
    errors.push('Frequency must be a number');
  }
  if (habit.frequency.times < 1 || habit.frequency.periodLength < 1) {
    errors.push('Frequency must be at least 1');
  }
  return errors;
}
