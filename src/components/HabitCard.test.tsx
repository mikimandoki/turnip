import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HabitContextType } from '../contexts/useHabitContext';
import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { calculateHabitStats } from '../utils/habits';
import HabitCard from './HabitCard';

const mockNavigate = vi.fn();
const mockUpdateCompletion = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

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

vi.mock('../utils/habits', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/habits')>();
  return {
    ...actual,
    calculateHabitStats: vi.fn(() => ({
      currentStreak: 0,
      previousStreak: 0,
      maxStreak: 0,
      completionRate: 0,
      totalPeriods: 0,
      completedPeriods: 0,
      streakContinuable: false,
    })),
  };
});

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
  osNotificationsGranted: false,
  completions: [],
  updateCompletion: mockUpdateCompletion,
};

function mockContext(overrides: Partial<HabitContextType> = {}) {
  vi.mocked(useHabitContext).mockReturnValue({
    ...baseContext,
    ...overrides,
  } as HabitContextType);
}

function renderCard(props: Partial<Parameters<typeof HabitCard>[0]> & { habit?: Habit } = {}) {
  render(<HabitCard habit={habit} index={0} completedCount={0} {...props} />);
}

beforeEach(() => {
  mockContext();
  mockNavigate.mockClear();
  mockUpdateCompletion.mockClear();
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
      const { container } = render(<HabitCard habit={habit} index={0} completedCount={0} />);
      expect(container.querySelector('.progressFill')?.classList.contains('behind')).toBe(true);
    });

    it('applies "in-progress" class when partially complete', () => {
      const { container } = render(<HabitCard habit={multiHabit} index={0} completedCount={1} />);
      expect(container.querySelector('.progressFill')?.classList.contains('inProgress')).toBe(true);
    });

    it('applies "done" class when completedCount meets target', () => {
      const { container } = render(<HabitCard habit={habit} index={0} completedCount={1} />);
      expect(container.querySelector('.progressFill')?.classList.contains('done')).toBe(true);
    });

    it('applies "done" class when completedCount meets multi-target', () => {
      const { container } = render(<HabitCard habit={multiHabit} index={0} completedCount={3} />);
      expect(container.querySelector('.progressFill')?.classList.contains('done')).toBe(true);
    });
  });

  describe('logged-today', () => {
    it('adds logged-today class when completion exists for today', () => {
      mockContext({
        completions: [{ habitId: 'h1', date: '2026-03-31', count: 1 }],
      });
      const { container } = render(<HabitCard habit={habit} index={0} completedCount={1} />);
      expect(container.querySelector('.card')?.classList.contains('loggedToday')).toBe(true);
    });

    it('does not add logged-today class when no completion for today', () => {
      const { container } = render(<HabitCard habit={habit} index={0} completedCount={0} />);
      expect(container.querySelector('.card')?.classList.contains('loggedToday')).toBe(false);
    });
  });

  describe('buttons', () => {
    it('disables both buttons when isFutureDate is true', () => {
      mockContext({ isFutureDate: true });
      renderCard();
      expect(screen.getByRole('button', { name: 'Decrease count' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Increase count' })).toBeDisabled();
    });

    it('disables decrease button when nothing has been logged today', () => {
      renderCard();
      expect(screen.getByRole('button', { name: 'Decrease count' })).toBeDisabled();
    });

    it('enables decrease button when something has been logged today', () => {
      mockContext({
        completions: [{ habitId: 'h1', date: '2026-03-31', count: 1 }],
      });
      renderCard();
      expect(screen.getByRole('button', { name: 'Decrease count' })).not.toBeDisabled();
    });

    it('calls updateCompletion(+1) when increase button is clicked', async () => {
      const user = userEvent.setup();
      renderCard();
      await user.click(screen.getByRole('button', { name: 'Increase count' }));
      expect(mockUpdateCompletion).toHaveBeenCalledWith('h1', 1);
    });

    it('calls updateCompletion(-1) when decrease button is clicked', async () => {
      const user = userEvent.setup();
      mockContext({
        completions: [{ habitId: 'h1', date: '2026-03-31', count: 1 }],
      });
      renderCard();
      await user.click(screen.getByRole('button', { name: 'Decrease count' }));
      expect(mockUpdateCompletion).toHaveBeenCalledWith('h1', -1);
    });

    it('does not navigate when action buttons are clicked', async () => {
      const user = userEvent.setup();
      mockContext({
        completions: [{ habitId: 'h1', date: '2026-03-31', count: 1 }],
      });
      renderCard();
      await user.click(screen.getByRole('button', { name: 'Decrease count' }));
      await user.click(screen.getByRole('button', { name: 'Increase count' }));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('card click', () => {
    it('navigates to habit detail when the card is clicked', async () => {
      const user = userEvent.setup();
      renderCard();
      await user.click(screen.getByRole('button', { name: habit.name }));
      expect(mockNavigate).toHaveBeenCalledWith('/habit/h1');
    });
  });

  describe('streaks', () => {
    it('shows streak badge for a daily habit', () => {
      vi.mocked(calculateHabitStats).mockReturnValue({
        currentStreak: 3,
        previousStreak: 0,
        maxStreak: 3,
        completionRate: 1,
        totalPeriods: 3,
        completedPeriods: 3,
        streakContinuable: false,
      });
      renderCard();
      expect(screen.getByText(/🔥 3 day streak/)).toBeInTheDocument();
    });

    it('shows streak badge for a weekly habit', () => {
      const weeklyHabit: Habit = {
        ...habit,
        frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
      };
      vi.mocked(calculateHabitStats).mockReturnValue({
        currentStreak: 4,
        previousStreak: 0,
        maxStreak: 4,
        completionRate: 1,
        totalPeriods: 4,
        completedPeriods: 4,
        streakContinuable: false,
      });
      renderCard({ habit: weeklyHabit });
      expect(screen.getByText(/🔥 4 week streak/)).toBeInTheDocument();
    });

    it('shows streak badge for a monthly habit', () => {
      const monthlyHabit: Habit = {
        ...habit,
        frequency: { times: 1, periodLength: 1, periodUnit: 'month' },
      };
      vi.mocked(calculateHabitStats).mockReturnValue({
        currentStreak: 2,
        previousStreak: 0,
        maxStreak: 2,
        completionRate: 1,
        totalPeriods: 2,
        completedPeriods: 2,
        streakContinuable: false,
      });
      renderCard({ habit: monthlyHabit });
      expect(screen.getByText(/🔥 2 month streak/)).toBeInTheDocument();
    });

    it('does not show streak badge when currentStreak < 2', () => {
      vi.mocked(calculateHabitStats).mockReturnValue({
        currentStreak: 1,
        previousStreak: 0,
        maxStreak: 1,
        completionRate: 1,
        totalPeriods: 1,
        completedPeriods: 1,
        streakContinuable: false,
      });
      renderCard();
      expect(screen.queryByText(/streak/)).not.toBeInTheDocument();
    });

    it('shows motivational message when streakContinuable and previousStreak >= 2', () => {
      vi.mocked(calculateHabitStats).mockReturnValue({
        currentStreak: 0,
        previousStreak: 5,
        maxStreak: 5,
        completionRate: 0.8,
        totalPeriods: 5,
        completedPeriods: 4,
        streakContinuable: true,
      });
      renderCard();
      expect(screen.getByText(/🔥 5 —/)).toBeInTheDocument();
    });
  });
});
