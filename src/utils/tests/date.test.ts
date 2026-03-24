import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { Habit } from '../../types';

import { startDatePeriod } from '../date';

describe('startDatePeriod', () => {
  it('returns start of week for weekly frequency', () => {
    const habit: Pick<Habit, 'createdAt' | 'frequency'> = {
      frequency: { times: 1, periodLength: 1, periodUnit: 'week' },
      createdAt: '2026-03-24',
    };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday

    expect(startDatePeriod(habit, date)).toBe('2026-03-23');
  });
});
