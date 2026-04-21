import type { Habit } from '../../src/types';

export const dailyHabit: Habit = {
  id: '1',
  name: 'Read a book',
  sortOrder: 0,
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

export const multiCountDailyHabit: Habit = {
  id: '2',
  name: 'Eat a healthy meal',
  sortOrder: 1,
  frequency: { times: 4, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

export const habitWithEmoji: Habit = {
  id: '3',
  name: '💪🏼 Gym',
  sortOrder: 2,
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

export const weeklyHabit: Habit = {
  id: '3',
  name: 'Morning run',
  sortOrder: 3,
  frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
  createdAt: new Date().toISOString(),
};

export const habitWithNote: Habit = {
  id: '4',
  name: 'Meditate',
  sortOrder: 4,
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
  note: 'Focus on breathing',
};
