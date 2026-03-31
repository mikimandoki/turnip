import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { Completion, Frequency, Habit } from '../../types';

import { calculateHabitStats, describeFrequency, getCompletionsInPeriod } from '../habits';

// shorthand: builds a completion for habitId 'h1'
const c = (date: string, count = 1): Completion => ({ habitId: 'h1', date, count });

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
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-03-24',
    };
    const completions = [
      c('2026-03-30'), // next week, excluded
      c('2026-03-25'),
      c('2026-03-24'),
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-03-25'))).toBe(2);
  });

  it('only counts todays completion for daily frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-03-24',
    };
    const completions = [
      c('2026-03-25'),
      c('2026-03-24'), // yesterday, excluded
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-03-25'))).toBe(1);
  });

  it('only counts this months completion for monthly frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'month' },
      createdAt: '2026-03-24',
    };
    const completions = [
      c('2026-03-25'),
      c('2026-04-01'), // next month, excluded
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-03-25'))).toBe(1);
  });

  it('only counts current two-week periods completions for 2-weeks frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'h1',
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: '2026-03-24',
    };
    const completions = [
      c('2026-04-07'), // next period, excluded
      c('2026-03-31'), // 2nd week
      c('2026-03-24'), // 1st week
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-04-04'))).toBe(2);
  });

  it('counts multiple completions in a day', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'h1',
      frequency: { times: 5, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-03-24',
    };
    expect(getCompletionsInPeriod(habit, [c('2026-03-25', 5)], parseISO('2026-03-25'))).toBe(5);
  });
});

describe('calculateHabitStats', () => {
  describe('streaks', () => {
    it('returns all zeros with no completions', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(habit, [], parseISO('2026-03-05'));
      expect.soft(stats.currentStreak).toBe(0);
      expect.soft(stats.previousStreak).toBe(0);
      expect.soft(stats.maxStreak).toBe(0);
    });

    it('counts a single completed day as a streak of 1', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(habit, [c('2026-03-05')], parseISO('2026-03-05'));
      expect(stats.currentStreak).toBe(1);
    });

    it('counts consecutive days', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(
        habit,
        [c('2026-03-05'), c('2026-03-04'), c('2026-03-03')],
        parseISO('2026-03-05')
      );
      expect(stats.currentStreak).toBe(3);
    });

    it('resets streak on a missed day and tracks previousStreak', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      // gap on 03-04: current streak 1, previous streak 2
      const completions = [c('2026-03-05'), c('2026-03-03'), c('2026-03-02')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-05'));
      expect.soft(stats.currentStreak).toBe(1);
      expect.soft(stats.previousStreak).toBe(2);
    });

    it('preserves maxStreak from a past run', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      // 5-day streak (03-01 to 03-05), gap (03-06 to 03-08), then current 2-day streak
      const completions = [
        c('2026-03-10'),
        c('2026-03-09'),
        c('2026-03-05'),
        c('2026-03-04'),
        c('2026-03-03'),
        c('2026-03-02'),
        c('2026-03-01'),
      ];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-10'));
      expect.soft(stats.currentStreak).toBe(2);
      expect.soft(stats.maxStreak).toBe(5);
    });

    it('counts consecutive weeks for a 3x weekly habit', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
        createdAt: '2026-03-09', // Monday
      };
      // 3 completions each in weeks of 03-09, 03-16, and 03-23
      const completions = [
        c('2026-03-09'),
        c('2026-03-10'),
        c('2026-03-11'),
        c('2026-03-16'),
        c('2026-03-17'),
        c('2026-03-18'),
        c('2026-03-23'),
        c('2026-03-24'),
        c('2026-03-25'),
      ];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-25'));
      expect(stats.currentStreak).toBe(3);
    });

    it('counts consecutive bi-weekly periods', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
        createdAt: '2026-03-09', // Monday — anchors the 2-week periods
      };
      // period 1: 03-09 to 03-22, period 2: 03-23 to 04-05
      const completions = [c('2026-03-10'), c('2026-03-25')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'));
      expect(stats.currentStreak).toBe(2);
    });

    it('counts consecutive months', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'month' },
        createdAt: '2026-01-01',
      };
      const completions = [c('2026-01-10'), c('2026-02-10'), c('2026-03-10')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'));
      expect(stats.currentStreak).toBe(3);
    });
  });

  describe('streakContinuable', () => {
    it('is true when today is incomplete but yesterday was done (daily)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      // 03-05 not done, 03-03 and 03-04 done
      const completions = [c('2026-03-04'), c('2026-03-03')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-05'));
      expect.soft(stats.streakContinuable).toBe(true);
      expect.soft(stats.previousStreak).toBe(2);
    });

    it('is true when this week is incomplete but last week was done (3x weekly)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
        createdAt: '2026-03-09', // Monday
      };
      // week of 03-16: 3 completions (done). week of 03-23: only 1 (not done)
      const completions = [c('2026-03-16'), c('2026-03-17'), c('2026-03-18'), c('2026-03-23')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-25'));
      expect(stats.streakContinuable).toBe(true);
    });

    it('is false when the current period is already complete', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(
        habit,
        [c('2026-03-05'), c('2026-03-04')],
        parseISO('2026-03-05')
      );
      expect(stats.streakContinuable).toBe(false);
    });

    it('is false when both current and previous periods are incomplete', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      // nothing on 03-04 or 03-05
      const stats = calculateHabitStats(habit, [c('2026-03-03')], parseISO('2026-03-05'));
      expect(stats.streakContinuable).toBe(false);
    });
  });

  describe('completionRate', () => {
    it('is 0 with no completions', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(habit, [], parseISO('2026-03-05'));
      expect(stats.completionRate).toBe(0);
    });

    it('calculates partial completion rate (daily)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      // 3 out of 5 days
      const stats = calculateHabitStats(
        habit,
        [c('2026-03-05'), c('2026-03-03'), c('2026-03-01')],
        parseISO('2026-03-05')
      );
      expect.soft(stats.totalPeriods).toBe(5);
      expect.soft(stats.completedPeriods).toBe(3);
      expect.soft(stats.completionRate).toBeCloseTo(3 / 5);
    });

    it('calculates partial completion rate (3x weekly)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
        createdAt: '2026-03-09', // Monday
      };
      // week of 03-09: 3 done (complete). week of 03-16: 2 done (incomplete). week of 03-23: 3 done (complete)
      const completions = [
        c('2026-03-09'),
        c('2026-03-10'),
        c('2026-03-11'),
        c('2026-03-16'),
        c('2026-03-17'),
        c('2026-03-23'),
        c('2026-03-24'),
        c('2026-03-25'),
      ];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-25'));
      expect.soft(stats.totalPeriods).toBe(3);
      expect.soft(stats.completedPeriods).toBe(2);
      expect.soft(stats.completionRate).toBeCloseTo(2 / 3);
    });

    it('is 1 when all periods are completed (monthly)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'month' },
        createdAt: '2026-01-01',
      };
      const completions = [c('2026-01-15'), c('2026-02-15'), c('2026-03-15')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'));
      expect.soft(stats.totalPeriods).toBe(3);
      expect.soft(stats.completionRate).toBe(1);
    });
  });

  describe('multi-count habits', () => {
    it('does not count a day as complete if count is below target (3x daily)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(habit, [c('2026-03-05', 2)], parseISO('2026-03-05'));
      expect.soft(stats.currentStreak).toBe(0);
      expect.soft(stats.completedPeriods).toBe(0);
    });

    it('counts a day as complete when count meets target (3x daily)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(habit, [c('2026-03-05', 3)], parseISO('2026-03-05'));
      expect.soft(stats.currentStreak).toBe(1);
      expect.soft(stats.completedPeriods).toBe(1);
    });

    it('does not count a week as complete if spread completions fall short (3x weekly)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
        createdAt: '2026-03-23', // Monday
      };
      const completions = [c('2026-03-23'), c('2026-03-24')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'));
      expect.soft(stats.currentStreak).toBe(0);
      expect.soft(stats.completedPeriods).toBe(0);
    });

    it('completes a week when spread completions meet target (3x weekly)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
        createdAt: '2026-03-23', // Monday
      };
      const completions = [c('2026-03-23'), c('2026-03-25'), c('2026-03-27')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'));
      expect.soft(stats.currentStreak).toBe(1);
      expect.soft(stats.completedPeriods).toBe(1);
    });
  });
});
