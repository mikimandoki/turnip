import { describe, expect, it } from 'vitest';

import type { Habit } from '../../types';

import { toRemoteHabit } from '../syncService';

const NOW = '2026-01-01T00:00:00.000Z';
const USER_ID = 'user-123';

const baseHabit: Habit = {
  id: 'habit-1',
  name: 'Drink water',
  createdAt: '2025-01-01',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
};

describe('toRemoteHabit', () => {
  it('maps core fields to snake_case', () => {
    const result = toRemoteHabit(baseHabit, USER_ID, 2, NOW);
    expect(result).toEqual({
      id: 'habit-1',
      user_id: USER_ID,
      name: 'Drink water',
      note: null,
      created_at: '2025-01-01',
      times: 1,
      period_length: 1,
      period_unit: 'day',
      sort_order: 2,
      updated_at: NOW,
      deleted_at: null,
    });
  });

  it('does not include notification fields', () => {
    const habit: Habit = {
      ...baseHabit,
      notification: {
        enabled: true,
        mode: 'daily',
        time: '08:00',
        days: [1, 3, 5],
        monthDays: [],
        customMessage: 'Stay hydrated',
        intervalN: 1,
        intervalUnit: 'days',
      },
    };
    const result = toRemoteHabit(habit, USER_ID, 0, NOW);
    const keys = Object.keys(result);
    expect(keys.some(k => k.startsWith('notif_'))).toBe(false);
  });

  it('maps note to remote when present', () => {
    const result = toRemoteHabit({ ...baseHabit, note: 'drink more' }, USER_ID, 0, NOW);
    expect(result.note).toBe('drink more');
  });

  it('sets note to null when absent', () => {
    const result = toRemoteHabit(baseHabit, USER_ID, 0, NOW);
    expect(result.note).toBeNull();
  });

  it('uses the sortOrder argument, not the habit sortOrder', () => {
    const result = toRemoteHabit(baseHabit, USER_ID, 4, NOW);
    expect(result.sort_order).toBe(4);
  });
});
