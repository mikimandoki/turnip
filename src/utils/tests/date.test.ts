import { addDays, addYears, parseISO, subDays, subYears } from 'date-fns';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Habit } from '../../types';

import { endDatePeriod, namedDayOrDate, startDatePeriod, toDateString } from '../date';

describe('startDatePeriod', () => {
  // Intentional startDatePeriod before createdAt to count it as a full week
  it('habit created on Wednesday, weekly period starts from Monday', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-03-25', // Wednesday
    };
    const date = parseISO('2026-03-25');
    expect(startDatePeriod(habit, date)).toBe('2026-03-23'); // Monday
  });

  it('handles createdAt with time component', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-03-25T00:00:00.000Z',
    };
    const date = parseISO('2026-03-25');
    expect(startDatePeriod(habit, date)).toBe('2026-03-23');
  });

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
  it(`returns start of current month if we're on the first month of 2-month cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-18');
    expect(startDatePeriod(habit, date)).toBe('2026-03-01');
  });
  it(`returns start of last month if we're on the second month of 2-month cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-04-18');
    expect(startDatePeriod(habit, date)).toBe('2026-03-01');
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

  it(`returns end of current month if we're on the second week of 2-month cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-04-25'); // March 25 2026 is in the second week of the period
    expect(endDatePeriod(habit, date)).toBe('2026-04-30');
  });
  it(`returns end of next month if we're on the first week of 2-month cycle`, () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      createdAt: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-25'); // March 25 2026 is in the second week of the period
    expect(endDatePeriod(habit, date)).toBe('2026-04-30');
  });
});

describe('toDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    const date = new Date(2026, 2, 27);
    expect(toDateString(date)).toBe('2026-03-27');
  });
});

describe('namedDayOrDate', () => {
  const fakeToday = new Date(2026, 0, 11); // January 11, 2026
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fakeToday);
  });
  afterAll(() => {
    vi.useRealTimers();
  });
  const yesterday = subDays(fakeToday, 1);
  const twoDaysAgo = subDays(fakeToday, 2);
  const tomorrow = addDays(fakeToday, 1);
  const dayAfterTomorrow = addDays(fakeToday, 2);
  const nextYear = addYears(fakeToday, 1);
  const lastYear = subYears(fakeToday, 1);
  it('returns Today for today', () => {
    expect(namedDayOrDate(fakeToday)).toBe('Today');
  });
  it('returns Yesterday for yesterday', () => {
    expect(namedDayOrDate(yesterday)).toBe('Yesterday');
  });
  it('returns Tomorrow for tomorrow', () => {
    expect(namedDayOrDate(tomorrow)).toBe('Tomorrow');
  });
  it('returns formatted date for two days ago', () => {
    expect(namedDayOrDate(twoDaysAgo)).toBe('Friday, January 9');
  });
  it('returns formatted date for day after tomorrow', () => {
    expect(namedDayOrDate(dayAfterTomorrow)).toBe('Tuesday, January 13');
  });
  it('returns base date plus years for next year', () => {
    expect(namedDayOrDate(nextYear)).toBe('Monday, January 11 2027');
  });
  it('returns base date plus years for last year', () => {
    expect(namedDayOrDate(lastYear)).toBe('Saturday, January 11 2025');
  });
});
