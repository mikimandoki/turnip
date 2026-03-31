import { describe, expect, it } from 'vitest';

import type { Frequency } from '../../types';

import { defaultNotifDays, habitNotificationId } from '../notifications';

describe('habitNotificationId', () => {
  it('returns a positive integer', () => {
    const id = habitNotificationId('abc123');
    expect.soft(id).toBeGreaterThan(0);
    expect.soft(Number.isInteger(id)).toBe(true);
  });

  it('is deterministic for the same input', () => {
    expect(habitNotificationId('abc123')).toBe(habitNotificationId('abc123'));
  });

  it('returns different values for different habit IDs', () => {
    expect(habitNotificationId('habit-a')).not.toBe(habitNotificationId('habit-b'));
  });

  it('stays within safe integer range for notification IDs', () => {
    const ids = ['abc', 'xyz', 'v3ryl0nghabitid1234567890', '!!!', 'a'];
    for (const input of ids) {
      const id = habitNotificationId(input);
      expect.soft(id).toBeGreaterThanOrEqual(0);
      expect.soft(id).toBeLessThan(2_147_483_647);
    }
  });

  it('produces unique IDs per weekday when offset by weekday (1–7)', () => {
    const base = habitNotificationId('test-habit');
    const notifIds = [1, 2, 3, 4, 5, 6, 7].map(day => base + day);
    expect(new Set(notifIds).size).toBe(7);
  });
});

describe('defaultNotifDays', () => {
  const daily: Frequency = { times: 1, periodLength: 1, periodUnit: 'day' };
  const weekly3: Frequency = { times: 3, periodLength: 1, periodUnit: 'week' };
  const weekly7: Frequency = { times: 7, periodLength: 1, periodUnit: 'week' };
  const weekly10: Frequency = { times: 10, periodLength: 1, periodUnit: 'week' };

  it('returns all 7 days for non-weekly habits', () => {
    expect(defaultNotifDays(daily)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns exactly times days for weekly habits', () => {
    expect(defaultNotifDays(weekly3)).toHaveLength(3);
  });

  it('returns all 7 days when times equals 7', () => {
    expect(defaultNotifDays(weekly7)).toHaveLength(7);
  });

  it('caps at 7 when times exceeds 7', () => {
    expect(defaultNotifDays(weekly10)).toHaveLength(7);
  });

  it('returns only valid weekday values (1–7)', () => {
    const days = defaultNotifDays(weekly3);
    for (const d of days) {
      expect.soft(d).toBeGreaterThanOrEqual(1);
      expect.soft(d).toBeLessThanOrEqual(7);
    }
  });

  it('returns days in ascending order', () => {
    for (let i = 0; i < 10; i++) {
      const days = defaultNotifDays(weekly3);
      expect(days).toEqual([...days].sort((a, b) => a - b));
    }
  });

  it('returns no duplicate days', () => {
    for (let i = 0; i < 10; i++) {
      const days = defaultNotifDays(weekly3);
      expect(new Set(days).size).toBe(days.length);
    }
  });
});
