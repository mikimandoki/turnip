import { addDays, addYears, parseISO, subDays, subYears } from 'date-fns';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Habit } from '../../types';

import {
  endDatePeriod,
  isTimeInPast,
  namedDayOrDate,
  startDatePeriod,
  toDateString,
} from '../date';

describe('startDatePeriod', () => {
  // Weekly habits use startDate as exact epoch anchor (not aligned to Monday)
  it('habit created on Wednesday, weekly period starts from Wednesday', () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      startDate: '2026-03-25', // Wednesday
    };
    const date = parseISO('2026-03-25');
    expect(startDatePeriod(habit, date)).toBe('2026-03-25'); // Same Wednesday
  });

  it('handles startDate with time component', () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      startDate: '2026-03-25T00:00:00.000Z',
    };
    const date = parseISO('2026-03-25');
    expect(startDatePeriod(habit, date)).toBe('2026-03-25');
  });

  it('returns today for daily frequency', () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      startDate: '2026-01-01',
    };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday
    expect(startDatePeriod(habit, date)).toBe('2026-03-25');
  });

  it(`returns yesterday if we're on the second day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      startDate: '2026-03-22', // Total 4 days
    };
    const date = parseISO('2026-03-25'); // End of second period
    expect(startDatePeriod(habit, date)).toBe('2026-03-24'); // Start of second period
  });

  it(`returns today if we're on the first day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      startDate: '2026-03-22', // Total 3 days
    };
    const date = parseISO('2026-03-24'); // Start of second period
    expect(startDatePeriod(habit, date)).toBe('2026-03-24'); // Start of second period
  });

  it('returns start of exact week cycle from startDate', () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      startDate: '2026-01-01', // Thursday
    };
    const date = parseISO('2026-03-26'); // Thursday, exactly 12 weeks later
    expect(startDatePeriod(habit, date)).toBe('2026-03-26');
  });

  it(`returns start of second 2-week period`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      startDate: '2026-03-17', // March 17 (Tuesday)
    };
    const date = parseISO('2026-03-31'); // March 31, start of second 2-week period
    expect(startDatePeriod(habit, date)).toBe('2026-03-31');
  });

  it(`returns start of current week if we're on the first week of 2-week cycle`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      startDate: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-18'); // March 18, in first week of 2-week cycle
    expect(startDatePeriod(habit, date)).toBe('2026-03-17');
  });

  it(`returns start of current month if we're on the first month of 2-month cycle`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      startDate: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-18');
    expect(startDatePeriod(habit, date)).toBe('2026-03-17');
  });

  it(`returns start of second 2-month period`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      startDate: '2026-03-17', // March 17
    };
    const date = parseISO('2026-05-18'); // May 18, in second 2-month period
    expect(startDatePeriod(habit, date)).toBe('2026-05-17');
  });
});

describe('endDatePeriod', () => {
  it('returns today for daily frequency', () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      startDate: '2026-01-01',
    };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday
    expect(endDatePeriod(habit, date)).toBe('2026-03-25');
  });

  it(`returns today if we're on the second day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      startDate: '2026-03-22', // Total 4 days
    };
    const date = parseISO('2026-03-25'); // End of second period
    expect(endDatePeriod(habit, date)).toBe('2026-03-25'); // End of second period
  });

  it(`returns tomorrow if we're on the first day of a 2-day cycle`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'day' },
      startDate: '2026-03-22', // Total 3 days
    };
    const date = parseISO('2026-03-24'); // Start of second period
    expect(endDatePeriod(habit, date)).toBe('2026-03-25'); // End of second period
  });

  it('returns end of exact week cycle from startDate', () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      startDate: '2026-01-01', // Thursday
    };
    const date = parseISO('2026-03-26'); // Thursday, exactly 12 weeks later
    expect(endDatePeriod(habit, date)).toBe('2026-04-01'); // 7 days from March 26 = April 2, minus 1 = April 1
  });

  it(`returns end of second 2-week period`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      startDate: '2026-03-17', // March 17 (Tuesday)
    };
    const date = parseISO('2026-03-31'); // March 31, in second 2-week period
    expect(endDatePeriod(habit, date)).toBe('2026-04-13'); // 28 days from March 17 = April 14, minus 1 = April 13
  });

  it(`returns end of first 2-week period`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      startDate: '2026-03-17', // March 17
    };
    const date = parseISO('2026-03-18'); // March 18, in first 2-week period
    expect(endDatePeriod(habit, date)).toBe('2026-03-30'); // 14 days from March 17 = March 31, minus 1 = March 30
  });

  it(`returns end of current 2-month period from startDate`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      startDate: '2026-03-17', // March 17
    };
    const date = parseISO('2026-04-25'); // April 25, in first 2-month period
    expect(endDatePeriod(habit, date)).toBe('2026-05-16'); // 2 months from March 17 = May 17, minus 1 = May 16
  });

  it(`returns end of second 2-month period`, () => {
    const habit: Pick<Habit, 'frequency' | 'startDate'> = {
      frequency: { times: 1, periodLength: 2, periodUnit: 'month' },
      startDate: '2026-03-17', // March 17
    };
    const date = parseISO('2026-05-25'); // May 25, in second 2-month period
    expect(endDatePeriod(habit, date)).toBe('2026-07-16'); // 4 months from March 17 = July 17, minus 1 = July 16
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

describe('isTimeInPast', () => {
  const fakeToday = new Date('2026-01-11T12:00:00'); // January 11, 2026 12:00 PM local time
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fakeToday);
  });
  afterAll(() => {
    vi.useRealTimers();
  });
  it('returns true for time in the past', () => {
    expect(isTimeInPast(11, 59, fakeToday)).toBe(true); // 11:59 AM
  });
  it('returns false for time in the future', () => {
    expect(isTimeInPast(12, 1, fakeToday)).toBe(false); // 12:01 PM
  });
});
