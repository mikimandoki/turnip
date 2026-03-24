import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { Habit } from '../../types';

import { endDatePeriod, startDatePeriod } from '../date';

describe('startDatePeriod', () => {
  it('returns today for daily frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-01-01',
    };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday
    expect(startDatePeriod(habit, date)).toBe('2026-03-25');
  });

  it(`returns yesterday if we're on the second day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      createdAt: '2026-03-22', // Total 4 days
    };
    const date = parseISO('2026-03-25'); // End of second period
    expect(startDatePeriod(habit, date)).toBe('2026-03-24'); // Start of first period
  });

  it(`returns today if we're on the first day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      createdAt: '2026-03-22', // Total 3 days
    };
    const date = parseISO('2026-03-24'); // Start of second period
    expect(startDatePeriod(habit, date)).toBe('2026-03-24'); // Start of first period
  });

  it('returns start of week for 1x weekly frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-01-01',
    };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday
    expect(startDatePeriod(habit, date)).toBe('2026-03-23');
  });

  it(`returns start of last week if we're on the second week of 2-week cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-25'); // March 25 2026 is in the second week of the period
    expect(startDatePeriod(habit, date)).toBe('2026-03-16');
  });

  it(`returns start of current week if we're on the first week of 2-week cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-18'); // March 18 2026 is in the first week of the period
    expect(startDatePeriod(habit, date)).toBe('2026-03-16');
  });
});

describe('endDatePeriod', () => {
  it('returns today for daily frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-01-01',
    };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday
    expect(endDatePeriod(habit, date)).toBe('2026-03-25');
  });

  it(`returns today if we're on the second day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      createdAt: '2026-03-22', // Total 4 days
    };
    const date = parseISO('2026-03-25'); // End of second period
    expect(endDatePeriod(habit, date)).toBe('2026-03-25'); // End of second period
  });

  it(`returns tomorrow if we're on the first day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      createdAt: '2026-03-22', // Total 3 days
    };
    const date = parseISO('2026-03-24'); // Start of second period
    expect(endDatePeriod(habit, date)).toBe('2026-03-25'); // End of first period
  });

  it('returns end of current week for weekly cycle', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-01-01',
    };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday
    expect(endDatePeriod(habit, date)).toBe('2026-03-29');
  });

  it(`returns end of current week if we're on the second week of 2-week cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-25'); // March 25 2026 is in the second week of the period
    expect(endDatePeriod(habit, date)).toBe('2026-03-29');
  });

  it(`returns end of next week if we're on the first week of 2-week cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-18'); // March 18 2026 is in the first week of the period
    expect(endDatePeriod(habit, date)).toBe('2026-03-29'); // End of second week
  });
});
