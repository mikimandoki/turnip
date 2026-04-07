import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Habit } from '../types';

import Heatmap from './Heatmap';

const dailyHabit: Habit = {
  id: 'h1',
  name: 'Test',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: '2026-03-01',
};

const multiDailyHabit: Habit = {
  id: 'h4',
  name: 'MultiTest',
  frequency: { times: 4, periodLength: 1, periodUnit: 'day' },
  createdAt: '2026-03-01',
};

const weeklyHabit: Habit = {
  id: 'h2',
  name: 'Test',
  frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
  createdAt: '2026-03-02',
};

const monthlyHabit: Habit = {
  id: 'h3',
  name: 'Test',
  frequency: { times: 2, periodLength: 1, periodUnit: 'month' },
  createdAt: '2026-03-01',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-15'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Heatmap', () => {
  describe('rendering', () => {
    it('renders a cell for each day of the month', () => {
      const { container } = render(<Heatmap habit={dailyHabit} completions={[]} />);
      const cells = container.querySelectorAll('.heatmapCell:not(.heatmapPad)');
      expect(cells.length).toBe(31);
    });

    it('renders the correct month label', () => {
      render(<Heatmap habit={dailyHabit} completions={[]} />);
      expect(screen.getByText('March 2026')).toBeInTheDocument();
    });

    it('renders correct padding for first day of month', () => {
      // March 2026 starts on a Sunday — Monday-anchored grid means 6 padding cells
      const { container } = render(<Heatmap habit={dailyHabit} completions={[]} />);
      const pads = container.querySelectorAll('.heatmapPad');
      expect(pads.length).toBe(6);
    });

    it('renders day-of-week headers', () => {
      render(<Heatmap habit={dailyHabit} completions={[]} />);
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
        expect(screen.getByText(d)).toBeInTheDocument();
      });
    });

    it('does not render completions from other habits', () => {
      const { container } = render(
        <Heatmap
          habit={dailyHabit}
          completions={[{ habitId: 'other-habit', date: '2026-03-10', count: 1 }]}
        />
      );
      const filled = container.querySelectorAll('.heatmapFilled');
      expect(filled.length).toBe(0);
    });
  });

  describe('daily habits', () => {
    it('marks a completed day as filled', () => {
      const { container } = render(
        <Heatmap
          habit={dailyHabit}
          completions={[{ habitId: 'h1', date: '2026-03-10', count: 1 }]}
        />
      );
      expect(container.querySelectorAll('.heatmapFilled').length).toBe(1);
    });

    it('marks an incomplete day as empty', () => {
      const { container } = render(<Heatmap habit={dailyHabit} completions={[]} />);
      expect(container.querySelectorAll('.heatmapEmpty').length).toBe(31);
    });

    it('marks partial completions correctly for multi-daily habits', () => {
      render(
        <Heatmap
          habit={multiDailyHabit}
          completions={[
            { habitId: 'h4', date: '2026-03-10', count: 1 }, // 25%
            { habitId: 'h4', date: '2026-03-11', count: 2 }, // 50%
            { habitId: 'h4', date: '2026-03-12', count: 3 }, // 75%
            { habitId: 'h4', date: '2026-03-13', count: 4 }, // 100%
          ]}
        />
      );
      expect
        .soft(screen.getByText('10').closest('.heatmapCell')?.classList.contains('heatmapFill25'))
        .toBe(true);
      expect
        .soft(screen.getByText('11').closest('.heatmapCell')?.classList.contains('heatmapFill50'))
        .toBe(true);
      expect
        .soft(screen.getByText('12').closest('.heatmapCell')?.classList.contains('heatmapFill75'))
        .toBe(true);
      expect
        .soft(screen.getByText('13').closest('.heatmapCell')?.classList.contains('heatmapFilled'))
        .toBe(true);
    });
  });

  describe('weekly habits', () => {
    it('marks an entire week as completed when threshold is met', () => {
      render(
        <Heatmap
          habit={weeklyHabit}
          completions={[
            { habitId: 'h2', date: '2026-03-02', count: 1 },
            { habitId: 'h2', date: '2026-03-03', count: 1 },
            { habitId: 'h2', date: '2026-03-08', count: 1 },
          ]}
        />
      );
      // Mon Mar 2 - Sun Mar 8 — 3 logged, 4 remaining show period-complete
      ['2', '3', '8'].forEach(d => {
        expect
          .soft(screen.getByText(d).closest('.heatmapCell')?.classList.contains('heatmapFilled'))
          .toBe(true);
      });
      ['4', '5', '6', '7'].forEach(d => {
        expect
          .soft(
            screen.getByText(d).closest('.heatmapCell')?.classList.contains('heatmapPeriodComplete')
          )
          .toBe(true);
      });
    });

    it('does not mark a week as completed when threshold is not met', () => {
      const { container } = render(
        <Heatmap
          habit={weeklyHabit}
          completions={[
            { habitId: 'h2', date: '2026-03-02', count: 1 },
            { habitId: 'h2', date: '2026-03-03', count: 1 },
            // only 2 of 3 required
          ]}
        />
      );
      expect(container.querySelectorAll('.heatmapPeriodComplete').length).toBe(0);
    });
  });

  describe('monthly habits', () => {
    it('marks an entire month as completed when threshold is met', () => {
      const { container } = render(
        <Heatmap
          habit={monthlyHabit}
          completions={[
            { habitId: 'h3', date: '2026-03-02', count: 1 },
            { habitId: 'h3', date: '2026-03-08', count: 1 },
          ]}
        />
      );
      ['2', '8'].forEach(d => {
        expect
          .soft(screen.getByText(d).closest('.heatmapCell')?.classList.contains('heatmapFilled'))
          .toBe(true);
      });
      // Spot-check spread of unlogged days
      ['1', '5', '15', '20', '31'].forEach(d => {
        expect
          .soft(
            screen.getByText(d).closest('.heatmapCell')?.classList.contains('heatmapPeriodComplete')
          )
          .toBe(true);
      });
      // No day should be empty
      expect(container.querySelectorAll('.heatmapEmpty').length).toBe(0);
    });

    it('does not mark month as completed when threshold is not met', () => {
      const { container } = render(
        <Heatmap
          habit={monthlyHabit}
          completions={[
            { habitId: 'h3', date: '2026-03-02', count: 1 },
            // only 1 of 2 required
          ]}
        />
      );
      expect(container.querySelectorAll('.heatmapPeriodComplete').length).toBe(0);
    });
  });

  describe('navigation', () => {
    it('disables back button when at habit creation month', () => {
      render(<Heatmap habit={dailyHabit} completions={[]} />);
      const backBtn = screen.getByRole('button', { name: /previous month/i });
      expect(backBtn).toBeDisabled();
    });

    it('disables forward button when at current month', () => {
      render(<Heatmap habit={dailyHabit} completions={[]} />);
      const forwardBtn = screen.getByRole('button', { name: /next month/i });
      expect(forwardBtn).toBeDisabled();
    });

    // fireEvent instead of userEvent: fake timers are active in this file and userEvent's
    // internal setTimeout delays hang indefinitely when the clock is frozen.
    it('navigates back to previous month and shows correct day count', () => {
      const habit: Habit = { ...dailyHabit, createdAt: '2026-01-01' };
      const { container } = render(<Heatmap habit={habit} completions={[]} />);
      fireEvent.click(screen.getByRole('button', { name: /previous month/i }));
      const cells = container.querySelectorAll('.heatmapCell:not(.heatmapPad)');
      expect.soft(screen.getByText('February 2026')).toBeInTheDocument();
      expect.soft(cells.length).toBe(28);
    });
  });
});
