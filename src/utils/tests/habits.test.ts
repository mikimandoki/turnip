import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { Completion, Frequency, Habit } from '../../types';

import { describeFrequency, getCompletionsInPeriod } from '../habits';

describe('describeFrequency', () => {
  it('returns daily for once a day habits', () => {
    const freq: Frequency = {
      times: 1,
      periodLength: 1,
      periodUnit: 'day',
    };
    expect(describeFrequency(freq)).toBe('daily');
  });

  it('returns 2x daily for twice a day habits', () => {
    const freq: Frequency = {
      times: 2,
      periodLength: 1,
      periodUnit: 'day',
    };
    expect(describeFrequency(freq)).toBe('2x daily');
  });

  it('returns weekly for once a week habits', () => {
    const freq: Frequency = {
      times: 1,
      periodLength: 1,
      periodUnit: 'week',
    };
    expect(describeFrequency(freq)).toBe('weekly');
  });

  it('returns 3x weekly for 3x a week habits', () => {
    const freq: Frequency = {
      times: 3,
      periodLength: 1,
      periodUnit: 'week',
    };
    expect(describeFrequency(freq)).toBe('3x weekly');
  });

  it('returns monthly for once a month habits', () => {
    const freq: Frequency = {
      times: 1,
      periodLength: 1,
      periodUnit: 'month',
    };

    expect(describeFrequency(freq)).toBe('monthly');
  });

  it('returns 4x monthly for once a month habits', () => {
    const freq: Frequency = {
      times: 4,
      periodLength: 1,
      periodUnit: 'month',
    };

    expect(describeFrequency(freq)).toBe('4x monthly');
  });

  it('returns 3x every 2 weeks for 3/2/week habits', () => {
    const freq: Frequency = {
      times: 3,
      periodLength: 2,
      periodUnit: 'week',
    };
    expect(describeFrequency(freq)).toBe('3x every 2 weeks');
  });
});

describe('getCompletionsInPeriod', () => {
  it('only counts this weeks completions for weekly frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'demo-1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-03-24',
    };
    const completions: Completion[] = [
      { habitId: 'demo-1', date: '2026-03-30', count: 1 }, // this one is next week
      { habitId: 'demo-1', date: '2026-03-25', count: 1 },
      { habitId: 'demo-1', date: '2026-03-24', count: 1 },
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-03-25'))).toBe(2);
  });

  it('only counts todays completion for daily frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'demo-1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-03-24',
    };
    const completions: Completion[] = [
      { habitId: 'demo-1', date: '2026-03-25', count: 1 },
      { habitId: 'demo-1', date: '2026-03-24', count: 1 }, // this is outside of expected period
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-03-25'))).toBe(1);
  });

  it('only counts this months completion for monthly frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'demo-1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'month' },
      createdAt: '2026-03-24',
    };
    const completions: Completion[] = [
      { habitId: 'demo-1', date: '2026-03-25', count: 1 },
      { habitId: 'demo-1', date: '2026-04-01', count: 1 }, // this is outside of expected period
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-03-25'))).toBe(1);
  });

  it('only counts current two-week periods completions for 2-weeks frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'demo-1',
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: '2026-03-24',
    };
    const completions: Completion[] = [
      { habitId: 'demo-1', date: '2026-04-07', count: 1 }, // this one outside of period
      { habitId: 'demo-1', date: '2026-03-31', count: 1 }, // 2nd week
      { habitId: 'demo-1', date: '2026-03-24', count: 1 }, // 1st week
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-04-04'))).toBe(2);
  });

  it('counts multiple completions in a day', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'demo-1',
      frequency: { times: 5, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-03-24',
    };
    const completions: Completion[] = [{ habitId: 'demo-1', date: '2026-03-25', count: 5 }];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-03-25'))).toBe(5);
  });
});
