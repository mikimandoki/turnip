import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { startDatePeriod } from '../date';

describe('startDatePeriod', () => {
  it('returns start of week for weekly frequency', () => {
    const frequency = { times: 1, periodLength: 1, periodUnit: 'week' as const };
    const date = parseISO('2026-03-25'); // March 25 2026, Wednesday
    const createdAt = '2026-03-24';

    expect(startDatePeriod(frequency, date, createdAt)).toBe('2026-03-23');
  });
});
