import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HabitContextType } from '../contexts/useHabitContext';
import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import HabitCard from './HabitCard';

vi.mock('../contexts/useHabitContext', () => ({
  useHabitContext: vi.fn(),
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({ ref: vi.fn(), isDragging: false }),
}));

vi.mock('../utils/utils', () => ({
  isNative: false,
  simpleHash: () => 0,
}));

const habit: Habit = {
  id: 'h1',
  name: 'Exercise',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: '2026-01-01',
};

const multiHabit: Habit = {
  ...habit,
  frequency: { times: 3, periodLength: 1, periodUnit: 'day' },
};

const baseContext: Partial<HabitContextType> = {
  displayDate: new Date('2026-03-31'),
  isFutureDate: false,
  stats: [],
  osNotificationsGranted: false,
  completions: [],
};

function mockContext(overrides: Partial<HabitContextType> = {}) {
  vi.mocked(useHabitContext).mockReturnValue({
    ...baseContext,
    ...overrides,
  } as HabitContextType);
}

function renderCard(props: Partial<Parameters<typeof HabitCard>[0]> & { habit?: Habit } = {}) {
  const onLog = vi.fn();
  const onClick = vi.fn();
  render(
    <HabitCard
      habit={habit}
      index={0}
      completedCount={0}
      onClick={onClick}
      onLog={onLog}
      {...props}
    />
  );
  return { onLog, onClick };
}

beforeEach(() => {
  mockContext();
});

describe('HabitCard', () => {
  describe('rendering', () => {
    it('renders the habit name', () => {
      renderCard();
      expect(screen.getByText('Exercise')).toBeInTheDocument();
    });

    it('renders the habit name without emoji prefix', () => {
      renderCard({ habit: { ...habit, name: '🏋️ Exercise' } });
      expect(screen.getByText('Exercise')).toBeInTheDocument();
    });

    it('renders the completion count', () => {
      renderCard({ completedCount: 0 });
      expect(screen.getByText('0/1')).toBeInTheDocument();
    });

    it('renders the correct target count from habit frequency', () => {
      renderCard({ habit: multiHabit, completedCount: 2 });
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    // NOTE: describeFrequency is tested separately so this is just to see the freq renders at all
    it('renders the frequency description', () => {
      renderCard();
      expect(screen.getByText('daily')).toBeInTheDocument();
    });
  });

  describe('progress status', () => {
    it('applies "behind" class when completedCount is 0', () => {
      const { container } = render(
        <HabitCard habit={habit} index={0} completedCount={0} onClick={vi.fn()} onLog={vi.fn()} />
      );
      expect(container.querySelector('.progress-fill')?.classList.contains('behind')).toBe(true);
    });

    it('applies "in-progress" class when partially complete', () => {
      const { container } = render(
        <HabitCard
          habit={multiHabit}
          index={0}
          completedCount={1}
          onClick={vi.fn()}
          onLog={vi.fn()}
        />
      );
      expect(container.querySelector('.progress-fill')?.classList.contains('in-progress')).toBe(
        true
      );
    });

    it('applies "done" class when completedCount meets target', () => {
      const { container } = render(
        <HabitCard habit={habit} index={0} completedCount={1} onClick={vi.fn()} onLog={vi.fn()} />
      );
      expect(container.querySelector('.progress-fill')?.classList.contains('done')).toBe(true);
    });

    it('applies "done" class when completedCount meets multi-target', () => {
      const { container } = render(
        <HabitCard
          habit={multiHabit}
          index={0}
          completedCount={3}
          onClick={vi.fn()}
          onLog={vi.fn()}
        />
      );
      expect(container.querySelector('.progress-fill')?.classList.contains('done')).toBe(true);
    });
  });

  describe('logged-today', () => {
    it('adds logged-today class when completion exists for today', () => {
      mockContext({
        completions: [{ habitId: 'h1', date: '2026-03-31', count: 1 }],
      });
      const { container } = render(
        <HabitCard habit={habit} index={0} completedCount={1} onClick={vi.fn()} onLog={vi.fn()} />
      );
      expect(container.querySelector('.card')?.classList.contains('logged-today')).toBe(true);
    });

    it('does not add logged-today class when no completion for today', () => {
      const { container } = render(
        <HabitCard habit={habit} index={0} completedCount={0} onClick={vi.fn()} onLog={vi.fn()} />
      );
      expect(container.querySelector('.card')?.classList.contains('logged-today')).toBe(false);
    });
  });

  describe('buttons', () => {
    it('disables both buttons when isFutureDate is true', () => {
      mockContext({ isFutureDate: true });
      renderCard();
      expect(screen.getByRole('button', { name: 'Decrease count' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Increase count' })).toBeDisabled();
    });

    it('does not call onClick when action buttons are clicked', () => {
      const { onClick } = renderCard();
      fireEvent.click(screen.getByRole('button', { name: 'Decrease count' }));
      fireEvent.click(screen.getByRole('button', { name: 'Increase count' }));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('card click', () => {
    it('calls onClick when the card is clicked', () => {
      const { onClick, container } = (() => {
        const onClick = vi.fn();
        const { container } = render(
          <HabitCard habit={habit} index={0} completedCount={0} onClick={onClick} onLog={vi.fn()} />
        );
        return { onClick, container };
      })();
      fireEvent.click(container.querySelector('.card')!);
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('streaks', () => {
    it('shows streak badge for a daily habit', () => {
      mockContext({
        stats: [
          {
            habitId: 'h1',
            currentStreak: 3,
            previousStreak: 0,
            maxStreak: 3,
            completionRate: 1,
            totalPeriods: 3,
            completedPeriods: 3,
            streakContinuable: false,
          },
        ],
      });
      renderCard();
      expect(screen.getByText(/🔥 3 day streak/)).toBeInTheDocument();
    });

    it('shows streak badge for a weekly habit', () => {
      const weeklyHabit: Habit = {
        ...habit,
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
      };
      mockContext({
        stats: [
          {
            habitId: 'h1',
            currentStreak: 4,
            previousStreak: 0,
            maxStreak: 4,
            completionRate: 1,
            totalPeriods: 4,
            completedPeriods: 4,
            streakContinuable: false,
          },
        ],
      });
      renderCard({ habit: weeklyHabit });
      expect(screen.getByText(/🔥 4 week streak/)).toBeInTheDocument();
    });

    it('shows streak badge for a monthly habit', () => {
      const monthlyHabit: Habit = {
        ...habit,
        frequency: { times: 1, periodLength: 1, periodUnit: 'month' },
      };
      mockContext({
        stats: [
          {
            habitId: 'h1',
            currentStreak: 2,
            previousStreak: 0,
            maxStreak: 2,
            completionRate: 1,
            totalPeriods: 2,
            completedPeriods: 2,
            streakContinuable: false,
          },
        ],
      });
      renderCard({ habit: monthlyHabit });
      expect(screen.getByText(/🔥 2 month streak/)).toBeInTheDocument();
    });

    it('does not show streak badge when currentStreak < 2', () => {
      mockContext({
        stats: [
          {
            habitId: 'h1',
            currentStreak: 1,
            previousStreak: 0,
            maxStreak: 1,
            completionRate: 1,
            totalPeriods: 1,
            completedPeriods: 1,
            streakContinuable: false,
          },
        ],
      });
      renderCard();
      expect(screen.queryByText(/streak/)).not.toBeInTheDocument();
    });

    it('shows motivational message when streakContinuable and previousStreak >= 2', () => {
      mockContext({
        stats: [
          {
            habitId: 'h1',
            currentStreak: 0,
            previousStreak: 5,
            maxStreak: 5,
            completionRate: 0.8,
            totalPeriods: 5,
            completedPeriods: 4,
            streakContinuable: true,
          },
        ],
      });
      renderCard();
      expect(screen.getByText(/🔥 5 —/)).toBeInTheDocument();
    });
  });
});
