import { describe, expect, it } from 'vitest';

import type { Habit } from '../../types';

import { calculateReorder } from '../habits';

describe('calculateReorder', () => {
  const makeHabits = (ids: string[]): Habit[] =>
    ids.map((id, i) => ({
      id,
      name: id,
      sortOrder: i,
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' as const },
      createdAt: '2026-01-01',
    }));

  describe('basic reordering', () => {
    it('inserts a before c when dragging a (index 0) above c (index 2)', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: 'c',
        insertBefore: true,
      });

      const ids = result.map(h => h.id);
      expect(ids).toEqual(['b', 'a', 'c']);
      expect(result.find(h => h.id === 'a')!.sortOrder).toBe(1);
      expect(result.find(h => h.id === 'b')!.sortOrder).toBe(0);
      expect(result.find(h => h.id === 'c')!.sortOrder).toBe(2);
    });

    it('inserts a after c when dragging a below c with insertBefore=false', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: 'c',
        insertBefore: false,
      });

      const ids = result.map(h => h.id);
      expect(ids).toEqual(['b', 'c', 'a']);
      expect(result.find(h => h.id === 'a')!.sortOrder).toBe(2);
      expect(result.find(h => h.id === 'b')!.sortOrder).toBe(0);
      expect(result.find(h => h.id === 'c')!.sortOrder).toBe(1);
    });

    it('moves c to first position when dragging last item above first', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'c',
        targetHabitId: 'a',
        insertBefore: true,
      });

      const ids = result.map(h => h.id);
      expect(ids).toEqual(['c', 'a', 'b']);
      expect(result.find(h => h.id === 'c')!.sortOrder).toBe(0);
      expect(result.find(h => h.id === 'a')!.sortOrder).toBe(1);
      expect(result.find(h => h.id === 'b')!.sortOrder).toBe(2);
    });
  });

  describe('gap-based drops', () => {
    it('drops at __gap_0 (top of list) - moves b to first', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'b',
        targetHabitId: '__gap_0',
        insertBefore: true,
      });

      expect(result.map(h => h.id)).toEqual(['b', 'a', 'c']);
    });

    it('drops at __gap_2 (middle) - moves a between b and c', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: '__gap_2',
        insertBefore: true,
      });

      expect(result.map(h => h.id)).toEqual(['b', 'a', 'c']);
    });

    it('gap drops ignore insertBefore (same result with false)', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const resultWithTrue = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: '__gap_2',
        insertBefore: true,
      });

      const resultWithFalse = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: '__gap_2',
        insertBefore: false,
      });

      expect(resultWithTrue.map(h => h.id)).toEqual(resultWithFalse.map(h => h.id));
    });

    it('drops at __gap_3 (end of list) - moves a to last', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: '__gap_3',
        insertBefore: true,
      });

      expect(result.map(h => h.id)).toEqual(['b', 'c', 'a']);
    });
  });

  describe('grouped habits', () => {
    it('returns only reordered standalone habits; grouped habits excluded from result', () => {
      const habits: Habit[] = [
        {
          id: 'a',
          name: 'a',
          sortOrder: 0,
          frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
          createdAt: '2026-01-01',
        },
        {
          id: 'b',
          name: 'b',
          sortOrder: 1,
          frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
          createdAt: '2026-01-01',
          groupId: 'group1',
        },
        {
          id: 'c',
          name: 'c',
          sortOrder: 2,
          frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
          createdAt: '2026-01-01',
        },
      ];
      const standaloneHabits = [...habits.filter(h => !h.groupId)].sort(
        (a, b) => a.sortOrder - b.sortOrder
      );

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'c',
        targetHabitId: 'a',
        insertBefore: true,
      });

      expect(result.map(h => h.id)).toEqual(['c', 'a']);
      expect(result.find(h => h.id === 'c')!.sortOrder).toBe(0);
      expect(result.find(h => h.id === 'a')!.sortOrder).toBe(1);
      expect(result.some(h => h.id === 'b')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('dropping habit onto itself is a no-op', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: 'a',
        insertBefore: true,
      });

      expect(result.map(h => h.id)).toEqual(['a', 'b', 'c']);
    });

    it('source not in standaloneHabits returns habits unchanged', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'non-existent',
        targetHabitId: 'a',
        insertBefore: true,
      });

      expect(result).toBe(habits);
    });

    it('target not in standaloneHabits returns habits unchanged', () => {
      const habits = makeHabits(['a', 'b', 'c']);
      const standaloneHabits = [...habits];

      const result = calculateReorder({
        standaloneHabits,
        habits,
        sourceHabitId: 'a',
        targetHabitId: 'non-existent',
        insertBefore: true,
      });

      expect(result).toBe(habits);
    });
  });
});
