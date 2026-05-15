import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { Completion, Frequency, Habit, HabitGroup } from '../../types';

import {
  calculateGroupStats,
  calculateHabitStats,
  describeFrequency,
  getActiveIntervals,
  getArchiveRuns,
  getCompletionsInPeriod,
  isInArchivedInterval,
  validateGroupName,
} from '../habits';

// shorthand: builds a completion for habitId 'h1'
const c = (habitId: string, date: string, count = 1): Completion => ({ habitId, date, count });

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
      c('h1', '2026-03-30'), // next week, excluded
      c('h1', '2026-03-25'),
      c('h1', '2026-03-24'),
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
      c('h1', '2026-03-25'),
      c('h1', '2026-03-24'), // yesterday, excluded
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
      c('h1', '2026-03-25'),
      c('h1', '2026-04-01'), // next month, excluded
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
      c('h1', '2026-04-07'), // next period, excluded
      c('h1', '2026-03-31'), // 2nd week
      c('h1', '2026-03-24'), // 1st week
    ];
    expect(getCompletionsInPeriod(habit, completions, parseISO('2026-04-04'))).toBe(2);
  });

  it('counts multiple completions in a day', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
      id: 'h1',
      frequency: { times: 5, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-03-24',
    };
    expect(getCompletionsInPeriod(habit, [c('h1', '2026-03-25', 5)], parseISO('2026-03-25'))).toBe(
      5
    );
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
      const stats = calculateHabitStats(habit, [c('h1', '2026-03-05')], parseISO('2026-03-05'));
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
        [c('h1', '2026-03-05'), c('h1', '2026-03-04'), c('h1', '2026-03-03')],
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
      const completions = [c('h1', '2026-03-05'), c('h1', '2026-03-03'), c('h1', '2026-03-02')];
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
        c('h1', '2026-03-10'),
        c('h1', '2026-03-09'),
        c('h1', '2026-03-05'),
        c('h1', '2026-03-04'),
        c('h1', '2026-03-03'),
        c('h1', '2026-03-02'),
        c('h1', '2026-03-01'),
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
        c('h1', '2026-03-09'),
        c('h1', '2026-03-10'),
        c('h1', '2026-03-11'),
        c('h1', '2026-03-16'),
        c('h1', '2026-03-17'),
        c('h1', '2026-03-18'),
        c('h1', '2026-03-23'),
        c('h1', '2026-03-24'),
        c('h1', '2026-03-25'),
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
      const completions = [c('h1', '2026-03-10'), c('h1', '2026-03-25')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'));
      expect(stats.currentStreak).toBe(2);
    });

    it('counts consecutive months', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 1, periodLength: 1, periodUnit: 'month' },
        createdAt: '2026-01-01',
      };
      const completions = [c('h1', '2026-01-10'), c('h1', '2026-02-10'), c('h1', '2026-03-10')];
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
      const completions = [c('h1', '2026-03-04'), c('h1', '2026-03-03')];
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
      const completions = [
        c('h1', '2026-03-16'),
        c('h1', '2026-03-17'),
        c('h1', '2026-03-18'),
        c('h1', '2026-03-23'),
      ];
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
        [c('h1', '2026-03-05'), c('h1', '2026-03-04')],
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
      const stats = calculateHabitStats(habit, [c('h1', '2026-03-03')], parseISO('2026-03-05'));
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
        [c('h1', '2026-03-05'), c('h1', '2026-03-03'), c('h1', '2026-03-01')],
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
        c('h1', '2026-03-09'),
        c('h1', '2026-03-10'),
        c('h1', '2026-03-11'),
        c('h1', '2026-03-16'),
        c('h1', '2026-03-17'),
        c('h1', '2026-03-23'),
        c('h1', '2026-03-24'),
        c('h1', '2026-03-25'),
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
      const completions = [c('h1', '2026-01-15'), c('h1', '2026-02-15'), c('h1', '2026-03-15')];
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
      const stats = calculateHabitStats(habit, [c('h1', '2026-03-05', 2)], parseISO('2026-03-05'));
      expect.soft(stats.currentStreak).toBe(0);
      expect.soft(stats.completedPeriods).toBe(0);
    });

    it('counts a day as complete when count meets target (3x daily)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'day' },
        createdAt: '2026-03-01',
      };
      const stats = calculateHabitStats(habit, [c('h1', '2026-03-05', 3)], parseISO('2026-03-05'));
      expect.soft(stats.currentStreak).toBe(1);
      expect.soft(stats.completedPeriods).toBe(1);
    });

    it('does not count a week as complete if spread completions fall short (3x weekly)', () => {
      const habit: Pick<Habit, 'createdAt' | 'frequency' | 'id'> = {
        id: 'h1',
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
        createdAt: '2026-03-23', // Monday
      };
      const completions = [c('h1', '2026-03-23'), c('h1', '2026-03-24')];
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
      const completions = [c('h1', '2026-03-23'), c('h1', '2026-03-25'), c('h1', '2026-03-27')];
      const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'));
      expect.soft(stats.currentStreak).toBe(1);
      expect.soft(stats.completedPeriods).toBe(1);
    });
  });
});

describe('validateGroupName', () => {
  it('accepts a valid name', () => {
    expect(validateGroupName('📁 Health')).toEqual([]);
  });

  it('requires non-empty name', () => {
    const errors = validateGroupName('');
    expect(errors.some(e => e.toLowerCase().includes('required'))).toBe(true);
  });

  it('requires text after emoji', () => {
    const errors = validateGroupName('📁');
    expect(errors.some(e => e.includes('more than just an emoji'))).toBe(true);
  });

  it('rejects names over 50 chars', () => {
    const errors = validateGroupName('x'.repeat(51));
    expect(errors.some(e => e.includes('too long'))).toBe(true);
  });
});

describe('calculateGroupStats', () => {
  const group: HabitGroup = { id: 'g1', name: 'Test group', sortOrder: 0 };

  it('returns null for empty group', () => {
    expect(calculateGroupStats(group, [], [], new Date())).toBeNull();
  });

  it('aggregates stats across members', () => {
    const habitWithGroup = (id: string): Habit => ({
      id,
      name: id,
      sortOrder: 0,
      groupId: group.id,
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: '2026-01-01',
    });
    const today = parseISO('2026-01-02');
    const completions: Completion[] = [
      c('h1', '2026-01-01'),
      c('h1', '2026-01-02'),
      c('h2', '2026-01-01'),
    ];
    const stats = calculateGroupStats(
      group,
      [habitWithGroup('h1'), habitWithGroup('h2')],
      completions,
      today
    );
    expect(stats).not.toBeNull();
    expect(stats!.completedPeriods).toBe(3);
    expect(stats!.totalPeriods).toBe(4);
  });

  it('handles mixed frequencies', () => {
    const threeTimesWeek: Habit = {
      id: 'h1',
      name: '3x/week',
      sortOrder: 0,
      groupId: group.id,
      frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-01-05',
    };
    const onceTwoWeeks: Habit = {
      id: 'h2',
      name: '1x/2-weeks',
      sortOrder: 0,
      groupId: group.id,
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: '2026-01-05',
    };

    const today = parseISO('2026-02-02');

    const completions: Completion[] = [
      c('h1', '2026-01-05'),
      c('h1', '2026-01-07'),
      c('h1', '2026-01-09'),
      c('h1', '2026-01-12'),
      c('h1', '2026-01-14'),
      c('h1', '2026-01-16'),
      c('h1', '2026-01-19'),
      c('h1', '2026-01-21'),
      c('h1', '2026-01-23'),
      c('h1', '2026-01-26'),
      c('h1', '2026-01-28'),
      c('h2', '2026-01-10'),
      c('h2', '2026-01-25'),
    ];

    const stats = calculateGroupStats(group, [threeTimesWeek, onceTwoWeeks], completions, today);
    expect(stats).not.toBeNull();
    expect(stats!.completedPeriods).toBe(5);
    expect(stats!.totalPeriods).toBe(8);
    expect(stats!.completionRate).toBeCloseTo(5 / 8, 3);
  });
});

describe('getActiveIntervals', () => {
  it('returns a single unbounded interval when no archive runs exist', () => {
    expect(getActiveIntervals('2026-01-01')).toEqual([{ start: '2026-01-01', end: '9999-12-31' }]);
  });

  it('returns one interval when habit is archived with no restore', () => {
    const intervals = getActiveIntervals('2026-01-01', [{ archivedAt: '2026-02-01' }]);
    expect(intervals).toEqual([{ start: '2026-01-01', end: '2026-02-01' }]);
  });

  it('returns two intervals after one archive-restore cycle', () => {
    const intervals = getActiveIntervals('2026-01-01', [
      { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
    ]);
    expect(intervals).toEqual([
      { start: '2026-01-01', end: '2026-02-01' },
      { start: '2026-03-01', end: '9999-12-31' },
    ]);
  });

  it('returns one interval when second archive has no restore', () => {
    const intervals = getActiveIntervals('2026-01-01', [
      { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
      { archivedAt: '2026-04-01' },
    ]);
    expect(intervals).toEqual([
      { start: '2026-01-01', end: '2026-02-01' },
      { start: '2026-03-01', end: '2026-04-01' },
    ]);
  });

  it('handles three archive-restore cycles', () => {
    const intervals = getActiveIntervals('2026-01-01', [
      { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
      { archivedAt: '2026-04-01', restoredAt: '2026-05-01' },
      { archivedAt: '2026-06-01' },
    ]);
    expect(intervals).toEqual([
      { start: '2026-01-01', end: '2026-02-01' },
      { start: '2026-03-01', end: '2026-04-01' },
      { start: '2026-05-01', end: '2026-06-01' },
    ]);
  });
});

describe('isInArchivedInterval', () => {
  it('returns false when no archive runs exist', () => {
    expect(isInArchivedInterval('2026-02-15')).toBe(false);
  });

  it('returns false for dates before archive date', () => {
    expect(
      isInArchivedInterval('2026-01-15', [{ archivedAt: '2026-02-01' }])
    ).toBe(false);
  });

  it('returns false for archive date itself (still active)', () => {
    expect(
      isInArchivedInterval('2026-02-01', [{ archivedAt: '2026-02-01' }])
    ).toBe(false);
  });

  it('returns true for dates after archive date (no restore)', () => {
    expect(
      isInArchivedInterval('2026-02-15', [{ archivedAt: '2026-02-01' }])
    ).toBe(true);
  });

  it('returns false for dates after restore date', () => {
    expect(
      isInArchivedInterval('2026-03-15', [
        { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
      ])
    ).toBe(false);
  });

  it('returns true for dates between archive and restore', () => {
    expect(
      isInArchivedInterval('2026-02-15', [
        { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
      ])
    ).toBe(true);
  });

  it('returns false for archive date itself (multiple cycles)', () => {
    expect(
      isInArchivedInterval('2026-02-01', [
        { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
      ])
    ).toBe(false);
  });

  it('returns false for restore date (active from that day)', () => {
    expect(
      isInArchivedInterval('2026-03-01', [
        { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
      ])
    ).toBe(false);
  });
});

describe('getArchiveRuns', () => {
  it('returns empty array when no archive runs exist', () => {
    expect(getArchiveRuns('2026-01-01')).toEqual([]);
  });

  it('returns one run for a single archive with no restore', () => {
    expect(getArchiveRuns('2026-01-01', [{ archivedAt: '2026-02-01' }])).toEqual([
      { start: '2026-01-01', end: '2026-02-01' },
    ]);
  });

  it('returns one past run after one archive-restore cycle', () => {
    expect(
      getArchiveRuns('2026-01-01', [
        { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
      ])
    ).toEqual([
      { start: '2026-01-01', end: '2026-02-01' },
    ]);
  });

  it('stops after the last archive when currently archived', () => {
    expect(
      getArchiveRuns('2026-01-01', [
        { archivedAt: '2026-02-01', restoredAt: '2026-03-01' },
        { archivedAt: '2026-04-01' },
      ])
    ).toEqual([
      { start: '2026-01-01', end: '2026-02-01' },
      { start: '2026-03-01', end: '2026-04-01' },
    ]);
  });
});

describe('calculateHabitStats with archiveRuns', () => {
  it('ignores archiveRuns when habit is currently active (no archives)', () => {
    const habit = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' as const },
      createdAt: '2026-01-01',
    };
    const completions = [c('h1', '2026-01-03'), c('h1', '2026-01-02')];
    const stats = calculateHabitStats(habit, completions, parseISO('2026-01-03'));
    expect(stats.currentStreak).toBe(2);
  });

  it('counts only periods within the current active interval', () => {
    const habit = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' as const },
      createdAt: '2026-01-01',
    };
    // archived 2026-01-05, restored 2026-01-10
    // completions in first run: 01-02, 01-03, 01-04
    // completions in second run (current): 01-10, 01-11, 01-12
    const completions = [
      c('h1', '2026-01-02'),
      c('h1', '2026-01-03'),
      c('h1', '2026-01-04'),
      c('h1', '2026-01-10'),
      c('h1', '2026-01-11'),
      c('h1', '2026-01-12'),
    ];
    const archiveRuns = [{ archivedAt: '2026-01-05', restoredAt: '2026-01-10' }];
    const stats = calculateHabitStats(habit, completions, parseISO('2026-01-12'), archiveRuns);
    // current streak should be 3 (01-10, 01-11, 01-12)
    expect(stats.currentStreak).toBe(3);
    // total periods should only count from 01-10 to 01-12 = 3 periods
    expect(stats.totalPeriods).toBe(3);
    expect(stats.completedPeriods).toBe(3);
  });

  it('excludes archived periods from totals and breaks streak', () => {
    const habit = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' as const },
      createdAt: '2026-01-01',
    };
    // first run: 01-01 to 01-04 (4 days all completed)
    // archived 01-05 to 01-09
    // second run: 01-10 to today (01-12)
    const completions = [
      c('h1', '2026-01-01'),
      c('h1', '2026-01-02'),
      c('h1', '2026-01-03'),
      c('h1', '2026-01-04'),
      c('h1', '2026-01-10'),
      c('h1', '2026-01-11'),
    ];
    const archiveRuns = [{ archivedAt: '2026-01-05', restoredAt: '2026-01-10' }];
    const stats = calculateHabitStats(habit, completions, parseISO('2026-01-12'), archiveRuns);
    // current streak: 01-10, 01-11 = 2 (01-12 not done)
    expect(stats.currentStreak).toBe(0); // 01-12 not completed
    expect(stats.previousStreak).toBe(2);
    // total periods: 01-10, 01-11, 01-12 = 3
    expect(stats.totalPeriods).toBe(3);
    expect(stats.completedPeriods).toBe(2);
    // max streak should include first run: 4 (01-01 to 01-04)
    expect(stats.maxStreak).toBe(4);
    expect(stats.streakContinuable).toBe(true);
  });

  it('preserves best streak across multiple archive cycles', () => {
    const habit = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' as const },
      createdAt: '2026-01-01',
    };
    // first run: 5-day streak (01-01 to 01-05)
    // archived 01-06, restored 01-10
    // second run: 3-day streak (01-10 to 01-12), gap on 01-13
    // archived 01-14, restored 01-20
    // third run (current): 2-day streak (01-20 to 01-21), 01-22 not done
    const completions = [
      c('h1', '2026-01-01'), c('h1', '2026-01-02'), c('h1', '2026-01-03'),
      c('h1', '2026-01-04'), c('h1', '2026-01-05'),
      c('h1', '2026-01-10'), c('h1', '2026-01-11'), c('h1', '2026-01-12'),
      c('h1', '2026-01-20'), c('h1', '2026-01-21'),
    ];
    const archiveRuns = [
      { archivedAt: '2026-01-06', restoredAt: '2026-01-10' },
      { archivedAt: '2026-01-14', restoredAt: '2026-01-20' },
    ];
    const stats = calculateHabitStats(habit, completions, parseISO('2026-01-22'), archiveRuns);
    // current streak: 01-20, 01-21 = 2 (but 01-22 not done)
    expect(stats.currentStreak).toBe(0);
    expect(stats.previousStreak).toBe(2);
    // max streak should be 5 from the first run
    expect(stats.maxStreak).toBe(5);
    // total periods only in third run: 01-20, 01-21, 01-22 = 3
    expect(stats.totalPeriods).toBe(3);
    expect(stats.completedPeriods).toBe(2);
  });

  it('works for weekly habits with archive boundaries', () => {
    const habit = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' as const },
      createdAt: '2026-03-09', // Monday
    };
    // week of 03-09 (complete), week of 03-16 (archived, no completions), week of 03-23 (current, complete)
    // archive on 03-17 (Tuesday) so 03-16 week counts toward first run, not current run
    const completions = [
      c('h1', '2026-03-09'), c('h1', '2026-03-10'),
      c('h1', '2026-03-23'), c('h1', '2026-03-24'),
    ];
    const archiveRuns = [{ archivedAt: '2026-03-17', restoredAt: '2026-03-23' }];
    const stats = calculateHabitStats(habit, completions, parseISO('2026-03-27'), archiveRuns);
    // current run: week of 03-23 = 1 period, completed
    expect(stats.totalPeriods).toBe(1);
    expect(stats.completedPeriods).toBe(1);
    // current streak: the current period is complete, so streak = 1
    expect(stats.currentStreak).toBe(1);
    // max streak across both runs: first run (week 03-09 = 1), current (week 03-23 = 1)
    expect(stats.maxStreak).toBe(1);
  });

  it('returns zero stats when viewing an archived habit from today', () => {
    const habit = {
      id: 'h1',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' as const },
      createdAt: '2026-01-01',
    };
    // currently archived, last active period was 01-01 to 01-05
    const completions = [c('h1', '2026-01-02'), c('h1', '2026-01-03'), c('h1', '2026-01-04')];
    const archiveRuns = [{ archivedAt: '2026-01-05' }]; // no restore
    const stats = calculateHabitStats(habit, completions, parseISO('2026-02-01'), archiveRuns);
    // today (02-01) is archived, so stats should be empty
    expect(stats.totalPeriods).toBe(0);
    expect(stats.completedPeriods).toBe(0);
    expect(stats.currentStreak).toBe(0);
    // max streak should still be preserved from the past run
    expect(stats.maxStreak).toBe(3);
  });
});
