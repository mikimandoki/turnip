import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';

import {
  buildDailyNotifications,
  buildDowNotifications,
  buildIntervalNotifications,
  buildSafeDomNotifications,
  buildUnsafeDomNotifications,
} from '../localNotifications';

const BASE = 1000;
const body = () => 'nudge';
const HABIT_ID = 'test-habit';
const TITLE = 'Test Habit';

// Helper to extract the `at` date from a windowed notification's schedule.
const at = (n: { schedule?: unknown }): Date => (n.schedule as { at: Date }).at;

// ─── buildDailyNotifications ────────────────────────────────────────────────

describe('buildDailyNotifications', () => {
  it('returns exactly one notification', () => {
    expect(buildDailyNotifications(BASE, TITLE, body, 9, 0)).toHaveLength(1);
  });

  it('uses base as id', () => {
    const [n] = buildDailyNotifications(BASE, TITLE, body, 9, 0);
    expect(n.id).toBe(BASE);
  });

  it('sets repeating schedule at correct time', () => {
    const [n] = buildDailyNotifications(BASE, TITLE, body, 9, 30);
    expect(n.schedule).toEqual({ on: { hour: 9, minute: 30 }, repeats: true });
  });
});

// ─── buildDowNotifications ──────────────────────────────────────────────────

describe('buildDowNotifications', () => {
  it('returns one notification per weekday', () => {
    expect(buildDowNotifications(BASE, TITLE, body, 9, 0, [2, 4])).toHaveLength(2);
  });

  it('uses base+weekday as id', () => {
    const result = buildDowNotifications(BASE, TITLE, body, 9, 0, [2, 5]);
    expect(result.map(n => n.id)).toEqual([BASE + 2, BASE + 5]);
  });

  it('sets weekday in repeating schedule', () => {
    const [n] = buildDowNotifications(BASE, TITLE, body, 9, 0, [3]);
    expect(n.schedule).toEqual({ on: { hour: 9, minute: 0, weekday: 3 }, repeats: true });
  });

  it('collapses to a single daily notification when all 7 days are selected', () => {
    const result = buildDowNotifications(BASE, TITLE, body, 9, 0, [1, 2, 3, 4, 5, 6, 7]);
    expect.soft(result).toHaveLength(1);
    expect.soft(result[0].id).toBe(BASE);
    expect.soft(result[0].schedule).toEqual({ on: { hour: 9, minute: 0 }, repeats: true });
  });
});

// ─── buildSafeDomNotifications ──────────────────────────────────────────────

describe('buildSafeDomNotifications', () => {
  it('returns one notification per day', () => {
    expect(buildSafeDomNotifications(BASE, TITLE, body, 9, 0, [1, 15, 28])).toHaveLength(3);
  });

  it('uses base+day as id', () => {
    const result = buildSafeDomNotifications(BASE, TITLE, body, 9, 0, [5, 20]);
    expect(result.map(n => n.id)).toEqual([BASE + 5, BASE + 20]);
  });

  it('sets day in repeating schedule', () => {
    const [n] = buildSafeDomNotifications(BASE, TITLE, body, 9, 30, [10]);
    expect(n.schedule).toEqual({ on: { day: 10, hour: 9, minute: 30 }, repeats: true });
  });
});

// ─── buildUnsafeDomNotifications ────────────────────────────────────────────

describe('buildUnsafeDomNotifications', () => {
  // Jan–Mar 2026 window; not all months have 31 days
  const from = new Date(2026, 0, 1); // Jan 1 midnight
  const until = new Date(2026, 3, 1); // Apr 1 midnight

  it('yields one occurrence per eligible month', () => {
    const result = buildUnsafeDomNotifications(HABIT_ID, TITLE, body, 9, 0, [31], from, until);
    expect(result).toHaveLength(3); // Jan 31, Feb 28 (clamped), Mar 31
  });

  it('clamps day 31 to Feb 28 in a non-leap year', () => {
    const result = buildUnsafeDomNotifications(HABIT_ID, TITLE, body, 9, 0, [31], from, until);
    const feb = result.find(n => at(n).getMonth() === 1);
    expect.soft(feb).toBeDefined();
    expect.soft(at(feb!).getDate()).toBe(28);
  });

  it('clamps day 29 to Feb 28 in a non-leap year', () => {
    const result = buildUnsafeDomNotifications(HABIT_ID, TITLE, body, 9, 0, [29], from, until);
    const feb = result.find(n => at(n).getMonth() === 1);
    expect(at(feb!).getDate()).toBe(28);
  });

  it(`doesn't clamp day 29 in March`, () => {
    const result = buildUnsafeDomNotifications(HABIT_ID, TITLE, body, 9, 0, [29], from, until);
    const mar = result.find(n => at(n).getMonth() === 2);
    expect(at(mar!).getDate()).toBe(29);
  });

  it('all occurrences are strictly after from', () => {
    const result = buildUnsafeDomNotifications(HABIT_ID, TITLE, body, 9, 0, [31], from, until);
    result.forEach(n => expect(at(n).getTime()).toBeGreaterThan(from.getTime()));
  });

  it('excludes occurrences on or before from', () => {
    // from is Jan 31 at 10am; day 31 that month (9am) is already past
    const lateFrom = new Date(2026, 0, 31, 10, 0);
    const result = buildUnsafeDomNotifications(HABIT_ID, TITLE, body, 9, 0, [31], lateFrom, until);
    expect(result.every(n => at(n).getMonth() !== 0)).toBe(true); // Jan skipped
  });
});

// ─── buildIntervalNotifications ─────────────────────────────────────────────

describe('buildIntervalNotifications', () => {
  it('first occurrence is the next 9am after a mid-afternoon from', () => {
    const from = new Date(2026, 3, 3, 16, 30); // Apr 3 4:30pm
    const result = buildIntervalNotifications(
      HABIT_ID,
      TITLE,
      body,
      9,
      0,
      10,
      from,
      addDays(from, 30)
    );
    const first = at(result[0]);
    expect.soft(first.getTime()).toBeGreaterThan(from.getTime());
    expect.soft(first.getDate()).toBe(4); // Apr 4
    expect.soft(first.getHours()).toBe(9);
    expect.soft(first.getMinutes()).toBe(0);
  });

  it('all occurrences are strictly after from', () => {
    const from = new Date(2026, 3, 3, 16, 30);
    const result = buildIntervalNotifications(
      HABIT_ID,
      TITLE,
      body,
      9,
      0,
      10,
      from,
      addDays(from, 30)
    );
    result.forEach(n => expect.soft(at(n).getTime()).toBeGreaterThan(from.getTime()));
  });

  it('returns 3 occurrences for a 10-day interval in a 30-day window', () => {
    const from = new Date(2026, 3, 3, 16, 30);
    const result = buildIntervalNotifications(
      HABIT_ID,
      TITLE,
      body,
      9,
      0,
      10,
      from,
      addDays(from, 30)
    );
    expect(result).toHaveLength(3); // Apr 4, Apr 14, Apr 24
  });

  it('exact-boundary: anchor at exactly from is scheduled immediately (maintenance continuation)', () => {
    // Simulates maintenance passing horizon+intervalDays as `from`.
    // anchor lands exactly on from (9am === 9am), so anchor < from is false → used directly.
    const from = new Date(2026, 3, 14, 9, 0); // Apr 14 9am
    const result = buildIntervalNotifications(
      HABIT_ID,
      TITLE,
      body,
      9,
      0,
      10,
      from,
      addDays(from, 30)
    );
    expect(at(result[0]).getTime()).toBe(from.getTime());
  });

  it('returns empty array when window is too narrow to fit any occurrence', () => {
    // from=4:30pm, until=11:59pm same day — next 9am is tomorrow, outside window
    const from = new Date(2026, 3, 3, 16, 30);
    const until = new Date(2026, 3, 3, 23, 59);
    const result = buildIntervalNotifications(HABIT_ID, TITLE, body, 9, 0, 10, from, until);
    expect(result).toHaveLength(0);
  });

  it('returns exactly 1 occurrence for a long interval that fits once', () => {
    // intervalDays=25, window=20 days → first occurrence (Apr 4) fits, second (Apr 29) does not
    const from = new Date(2026, 3, 3, 16, 30);
    const result = buildIntervalNotifications(
      HABIT_ID,
      TITLE,
      body,
      9,
      0,
      25,
      from,
      addDays(from, 20)
    );
    expect(result).toHaveLength(1);
  });
});
