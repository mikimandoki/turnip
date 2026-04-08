import type { Habit } from '../../src/types';

export const dailyHabit: Habit = {
  id: '1',
  name: 'Read a book',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

export const multiCountDailyHabit: Habit = {
  id: '2',
  name: 'Eat a healthy meal',
  frequency: { times: 4, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

export const habitWithEmoji: Habit = {
  id: '3',
  name: '💪🏼 Gym',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

export const weeklyHabit: Habit = {
  id: '3',
  name: 'Morning run',
  frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
  createdAt: new Date().toISOString(),
};
