import type { Habit } from '../types';

import { parseHabitEmoji } from './habits';

export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function validateInputs(habit: Habit): string[] {
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
