import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HabitContextType } from '../contexts/useHabitContext';
import type { Habit, HabitGroup } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import GroupDetail from './GroupDetail';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'g1' }),
}));

vi.mock('../contexts/useHabitContext', () => ({
  useHabitContext: vi.fn(),
}));

const makeHabit = (id: string, name: string, groupId: string): Habit => ({
  id,
  name,
  sortOrder: 0,
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: '2026-01-01',
  groupId,
});

const group: HabitGroup = { id: 'g1', name: 'Health', sortOrder: 0 };
const emojiGroup: HabitGroup = { id: 'g1', name: '💪 Health', sortOrder: 0 };

const memberHabit: Habit = makeHabit('h1', 'Morning run', 'g1');

let editGroup: ReturnType<typeof vi.fn>;
let deleteGroup: ReturnType<typeof vi.fn>;

function mockContext(overrides: Partial<HabitContextType> = {}) {
  vi.mocked(useHabitContext).mockReturnValue({
    habits: [memberHabit],
    completions: [],
    groups: [group],
    editGroup,
    deleteGroup,
    recheckNotificationPermission: vi.fn(),
    ...overrides,
  } as unknown as HabitContextType);
}

function setup() {
  const user = userEvent.setup();
  render(<GroupDetail />);
  return { user };
}

beforeEach(() => {
  editGroup = vi.fn();
  deleteGroup = vi.fn();
  mockContext();
  mockNavigate.mockReset();
});

describe('GroupDetail', () => {
  describe('rendering', () => {
    it('shows the group name', () => {
      setup();
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    it('shows the member habit name', () => {
      setup();
      expect(screen.getByText('Morning run')).toBeInTheDocument();
    });

    it('shows "Group not found" when group is missing', () => {
      mockContext({ groups: [] });
      setup();
      expect(screen.getByText('Group not found')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('pre-fills the name input with the current group name', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      expect(screen.getByRole('textbox', { name: 'Group name input' })).toHaveValue('Health');
    });

    it('calls editGroup with trimmed name and exits edit mode on save', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      await user.clear(screen.getByRole('textbox', { name: 'Group name input' }));
      await user.type(screen.getByRole('textbox', { name: 'Group name input' }), '  Fitness  ');
      await user.click(screen.getByRole('button', { name: 'Save edits' }));
      expect(editGroup).toHaveBeenCalledWith('g1', { name: 'Fitness' });
      expect(screen.queryByRole('textbox', { name: 'Group name input' })).not.toBeInTheDocument();
    });

    it('shows validation errors and does not call editGroup', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      await user.clear(screen.getByRole('textbox', { name: 'Group name input' }));
      await user.click(screen.getByRole('button', { name: 'Save edits' }));
      expect(editGroup).not.toHaveBeenCalled();
    });
  });

  describe('edit cancel', () => {
    it('restores original name when re-entering edit mode after cancel', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      await user.clear(screen.getByRole('textbox', { name: 'Group name input' }));
      await user.type(screen.getByRole('textbox', { name: 'Group name input' }), 'New Name');
      await user.click(screen.getByRole('button', { name: 'Cancel edits' }));
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      expect(screen.getByRole('textbox', { name: 'Group name input' })).toHaveValue('Health');
    });
  });

  describe('delete', () => {
    it('opens delete confirmation modal on delete button click', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Delete group' }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('calls deleteGroup and navigates to / on confirm', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Delete group' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('g1'));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('closes modal without deleting on cancel', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Delete group' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteGroup).not.toHaveBeenCalled();
    });
  });

  describe('emoji name', () => {
    it('displays the clean name in the header', () => {
      mockContext({ groups: [emojiGroup] });
      setup();
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    it('pre-fills the name input with the full emoji + name in edit mode', async () => {
      mockContext({ groups: [emojiGroup] });
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      expect(screen.getByRole('textbox', { name: 'Group name input' })).toHaveValue('💪 Health');
    });

    it('saves the edited name including the new emoji', async () => {
      mockContext({ groups: [emojiGroup] });
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      await user.clear(screen.getByRole('textbox', { name: 'Group name input' }));
      await user.type(screen.getByRole('textbox', { name: 'Group name input' }), '🏋️ Fitness');
      await user.click(screen.getByRole('button', { name: 'Save edits' }));
      expect(editGroup).toHaveBeenCalledWith('g1', { name: '🏋️ Fitness' });
    });

    it('restores the original emoji name in the input after cancel', async () => {
      mockContext({ groups: [emojiGroup] });
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      await user.clear(screen.getByRole('textbox', { name: 'Group name input' }));
      await user.type(screen.getByRole('textbox', { name: 'Group name input' }), '🏋️ Fitness');
      await user.click(screen.getByRole('button', { name: 'Cancel edits' }));
      await user.click(screen.getByRole('button', { name: 'Edit group' }));
      expect(screen.getByRole('textbox', { name: 'Group name input' })).toHaveValue('💪 Health');
    });
  });
});
