import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HabitContextType } from '../contexts/useHabitContext';
import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { calculateHabitStats } from '../utils/habits';
import { validateInputs } from '../utils/utils';
import HabitDetail from './HabitDetail';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'h1' }),
}));

vi.mock('../contexts/useHabitContext', () => ({
  useHabitContext: vi.fn(),
}));

vi.mock('../utils/utils', () => ({
  isNative: false,
  validateInputs: vi.fn(() => []),
  formatCount: vi.fn((n: number) => String(n)),
}));

vi.mock('../utils/localNotifications', () => ({
  checkNotificationPermission: vi.fn(),
  requestNotificationPermission: vi.fn(),
  openAppSettings: vi.fn(),
}));

vi.mock('../components/Heatmap', () => ({ default: () => null }));
vi.mock('../components/NotificationPicker', () => ({ default: () => null }));

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

const habitWithNote: Habit = { ...habit, note: 'My private note' };

let editHabit: ReturnType<typeof vi.fn>;
let deleteHabit: ReturnType<typeof vi.fn>;

function mockContext(overrides: Partial<HabitContextType> = {}) {
  vi.mocked(useHabitContext).mockReturnValue({
    habits: [habit],
    completions: [],
    deleteHabit,
    editHabit,
    recheckNotificationPermission: vi.fn(),
    ...overrides,
  } as unknown as HabitContextType);
}

function setup() {
  const user = userEvent.setup();
  render(<HabitDetail />);
  return { user };
}

beforeEach(() => {
  editHabit = vi.fn();
  deleteHabit = vi.fn();
  mockContext();
  mockNavigate.mockReset();
  vi.mocked(validateInputs).mockReturnValue([]);
  vi.mocked(calculateHabitStats).mockReturnValue({
    currentStreak: 0,
    previousStreak: 0,
    maxStreak: 0,
    completionRate: 0,
    totalPeriods: 0,
    completedPeriods: 0,
    streakContinuable: false,
  });
});

describe('HabitDetail', () => {
  describe('rendering', () => {
    it('shows the habit name', () => {
      setup();
      expect(screen.getByText('Exercise')).toBeInTheDocument();
    });

    it('shows "Habit not found" when habit is missing', () => {
      mockContext({ habits: [] });
      setup();
      expect(screen.getByText('Habit not found')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('pre-fills the name input with the current habit name', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      expect(screen.getByRole('textbox', { name: 'Habit name input' })).toHaveValue('Exercise');
    });

    it('calls editHabit with trimmed name and exits edit mode on save', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      await user.clear(screen.getByRole('textbox', { name: 'Habit name input' }));
      await user.type(screen.getByRole('textbox', { name: 'Habit name input' }), '  Running  ');
      await user.click(screen.getByRole('button', { name: 'Save edits' }));
      expect(editHabit).toHaveBeenCalledWith(habit, expect.objectContaining({ name: 'Running' }));
      expect(screen.queryByRole('textbox', { name: 'Habit name input' })).not.toBeInTheDocument();
    });

    it('shows validation errors and does not call editHabit', async () => {
      vi.mocked(validateInputs).mockReturnValueOnce(['Name is required']);
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      await user.clear(screen.getByRole('textbox', { name: 'Habit name input' }));
      await user.click(screen.getByRole('button', { name: 'Save edits' }));
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(editHabit).not.toHaveBeenCalled();
    });
  });

  describe('edit cancel', () => {
    it('restores original name when re-entering edit mode after cancel', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      await user.clear(screen.getByRole('textbox', { name: 'Habit name input' }));
      await user.type(screen.getByRole('textbox', { name: 'Habit name input' }), 'New Name');
      await user.click(screen.getByRole('button', { name: 'Cancel edits' }));
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      expect(screen.getByRole('textbox', { name: 'Habit name input' })).toHaveValue('Exercise');
    });

    it('name input is not empty when re-entering edit mode after cancel', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      await user.clear(screen.getByRole('textbox', { name: 'Habit name input' }));
      await user.click(screen.getByRole('button', { name: 'Cancel edits' }));
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      expect(screen.getByRole('textbox', { name: 'Habit name input' })).not.toHaveValue('');
    });
  });

  describe('delete', () => {
    it('opens delete confirmation modal on delete button click', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Delete habit' }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('calls deleteHabit and navigates to / on confirm', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Delete habit' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(deleteHabit).toHaveBeenCalledWith(habit));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('closes modal without deleting on cancel', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Delete habit' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteHabit).not.toHaveBeenCalled();
    });
  });

  describe('note', () => {
    it('displays note text when habit has a note', () => {
      mockContext({ habits: [habitWithNote] });
      setup();
      expect(screen.getByText('My private note')).toBeInTheDocument();
    });

    it('does not render a note card when habit has no note', () => {
      setup();
      expect(screen.queryByRole('textbox', { name: 'Note' })).not.toBeInTheDocument();
      expect(screen.queryByText('My private note')).not.toBeInTheDocument();
    });

    it('shows note textarea in edit mode even when habit has no note', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      expect(screen.getByRole('textbox', { name: 'Note' })).toBeInTheDocument();
    });

    it('pre-fills note textarea with the existing note', async () => {
      mockContext({ habits: [habitWithNote] });
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue('My private note');
    });

    it('calls editHabit with the typed note', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      await user.type(screen.getByRole('textbox', { name: 'Note' }), 'New note');
      await user.click(screen.getByRole('button', { name: 'Save edits' }));
      expect(editHabit).toHaveBeenCalledWith(habit, expect.objectContaining({ note: 'New note' }));
    });

    it('calls editHabit with undefined when note is cleared', async () => {
      mockContext({ habits: [habitWithNote] });
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      await user.clear(screen.getByRole('textbox', { name: 'Note' }));
      await user.click(screen.getByRole('button', { name: 'Save edits' }));
      const updates = editHabit.mock.calls[0][1] as { note?: string };
      expect(updates.note).toBeUndefined();
    });

    it('restores original note after cancel', async () => {
      mockContext({ habits: [habitWithNote] });
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      await user.clear(screen.getByRole('textbox', { name: 'Note' }));
      await user.type(screen.getByRole('textbox', { name: 'Note' }), 'Something else');
      await user.click(screen.getByRole('button', { name: 'Cancel edits' }));
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue('My private note');
    });

    it('shows character counter when note exceeds 900 characters', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
        target: { value: 'a'.repeat(950) },
      });
      expect(screen.getByText('50 characters remaining')).toBeInTheDocument();
    });

    it('shows error at the 1000-character limit', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit habit' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
        target: { value: 'a'.repeat(1000) },
      });
      expect(screen.getByRole('alert')).toHaveTextContent('0 characters remaining');
    });
  });

  describe('stats', () => {
    it('shows currentStreak in the current streak box when not streakContinuable', () => {
      vi.mocked(calculateHabitStats).mockReturnValue({
        currentStreak: 7,
        previousStreak: 3,
        maxStreak: 10,
        completionRate: 0.9,
        totalPeriods: 10,
        completedPeriods: 9,
        streakContinuable: false,
      });
      setup();
      const label = screen.getByText('current streak');
      expect(label.parentElement).toHaveTextContent('7');
    });

    it('shows previousStreak in the current streak box when streakContinuable', () => {
      vi.mocked(calculateHabitStats).mockReturnValue({
        currentStreak: 0,
        previousStreak: 5,
        maxStreak: 5,
        completionRate: 0.8,
        totalPeriods: 5,
        completedPeriods: 4,
        streakContinuable: true,
      });
      setup();
      const label = screen.getByText('current streak');
      expect(label.parentElement).toHaveTextContent('5');
    });
  });
});
