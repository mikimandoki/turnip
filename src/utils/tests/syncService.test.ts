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
    expect(result).toMatchObject({
      id: 'habit-1',
      user_id: USER_ID,
      name: 'Drink water',
      created_at: '2025-01-01',
      times: 1,
      period_length: 1,
      period_unit: 'day',
      sort_order: 2,
      updated_at: NOW,
      deleted_at: null,
    });
  });

  it('sets all notif fields to null/false when notification is absent', () => {
    const result = toRemoteHabit(baseHabit, USER_ID, 0, NOW);
    expect(result.notif_enabled).toBe(false);
    expect(result.notif_mode).toBeNull();
    expect(result.notif_time).toBeNull();
    expect(result.notif_days).toBeNull();
    expect(result.notif_month_days).toBeNull();
    expect(result.notif_custom_message).toBeNull();
    expect(result.notif_interval_n).toBeNull();
    expect(result.notif_interval_unit).toBeNull();
  });

  it('maps a daily notification correctly', () => {
    const habit: Habit = {
      ...baseHabit,
      notification: {
        enabled: true,
        mode: 'daily',
        time: '08:00',
        days: [],
        monthDays: [],
        customMessage: 'Stay hydrated',
        intervalN: 1,
        intervalUnit: 'days',
      },
    };
    const result = toRemoteHabit(habit, USER_ID, 0, NOW);
    expect(result.notif_enabled).toBe(true);
    expect(result.notif_mode).toBe('daily');
    expect(result.notif_time).toBe('08:00');
    expect(result.notif_custom_message).toBe('Stay hydrated');
  });

  it('JSON-serialises days array for day-of-week notifications', () => {
    const habit: Habit = {
      ...baseHabit,
      notification: {
        enabled: true,
        mode: 'days-of-week',
        time: '09:00',
        days: [1, 3, 5],
        monthDays: [],
        customMessage: '',
        intervalN: 1,
        intervalUnit: 'days',
      },
    };
    const result = toRemoteHabit(habit, USER_ID, 0, NOW);
    expect(result.notif_days).toBe('[1,3,5]');
    expect(result.notif_month_days).toBe('[]');
  });

  it('JSON-serialises monthDays array for day-of-month notifications', () => {
    const habit: Habit = {
      ...baseHabit,
      notification: {
        enabled: true,
        mode: 'days-of-month',
        time: '09:00',
        days: [],
        monthDays: [1, 15],
        customMessage: '',
        intervalN: 1,
        intervalUnit: 'days',
      },
    };
    const result = toRemoteHabit(habit, USER_ID, 0, NOW);
    expect(result.notif_month_days).toBe('[1,15]');
    expect(result.notif_days).toBe('[]');
  });

  it('maps interval notification fields', () => {
    const habit: Habit = {
      ...baseHabit,
      notification: {
        enabled: true,
        mode: 'interval',
        time: '10:00',
        days: [],
        monthDays: [],
        customMessage: '',
        intervalN: 3,
        intervalUnit: 'weeks',
      },
    };
    const result = toRemoteHabit(habit, USER_ID, 0, NOW);
    expect(result.notif_interval_n).toBe(3);
    expect(result.notif_interval_unit).toBe('weeks');
  });

  it('uses the sortOrder argument, not the habit sortOrder', () => {
    const habit: Habit = { ...baseHabit };
    const result = toRemoteHabit(habit, USER_ID, 4, NOW);
    expect(result.sort_order).toBe(4);
  });
});
