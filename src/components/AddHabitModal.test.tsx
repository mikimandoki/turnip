import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHabitContext } from '../contexts/useHabitContext';
import { validateInputs } from '../utils/utils';
import AddHabitModal from './AddHabitModal';

vi.mock('../contexts/useHabitContext', () => ({
  useHabitContext: vi.fn(),
}));

vi.mock('../utils/utils', () => ({
  isNative: false,
  validateInputs: vi.fn(() => []),
}));

vi.mock('./NotificationPicker', () => ({
  default: () => null,
}));

function setup() {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(<AddHabitModal onAdd={onAdd} onCancel={onCancel} />);
  return { user, onAdd, onCancel };
}

beforeEach(() => {
  vi.mocked(useHabitContext).mockReturnValue({
    recheckNotificationPermission: vi.fn(),
  } as unknown as ReturnType<typeof useHabitContext>);
});

describe('AddHabitModal', () => {
  describe('rendering', () => {
    it('renders name input, stepper buttons, unit select and action buttons', () => {
      setup();
      expect.soft(screen.getByRole('textbox', { name: 'Habit name' })).toBeInTheDocument();
      expect.soft(screen.getByRole('button', { name: 'Decrease times' })).toBeInTheDocument();
      expect.soft(screen.getByRole('button', { name: 'Increase times' })).toBeInTheDocument();
      expect.soft(screen.getByRole('combobox')).toBeInTheDocument();
      expect.soft(screen.getByRole('button', { name: 'Add habit' })).toBeInTheDocument();
      expect.soft(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('defaults to 1 per day', () => {
      setup();
      expect.soft(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect.soft(screen.getByDisplayValue('day')).toBeInTheDocument();
    });
  });

  describe('times stepper', () => {
    it('increments times', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Increase times' }));
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    it('decrements times', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Increase times' }));
      await user.click(screen.getByRole('button', { name: 'Decrease times' }));
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('does not go below 1', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Decrease times' }));
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });
  });

  describe('unit select', () => {
    it('switches to week', async () => {
      const { user } = setup();
      await user.selectOptions(screen.getByRole('combobox'), 'week');
      expect(screen.getByDisplayValue('week')).toBeInTheDocument();
    });

    it('switches to custom mode when custom… is selected', async () => {
      const { user } = setup();
      await user.selectOptions(screen.getByRole('combobox'), 'custom');
      expect.soft(screen.getByRole('button', { name: 'Decrease period' })).toBeInTheDocument();
      expect.soft(screen.getByRole('button', { name: 'Increase period' })).toBeInTheDocument();
    });

    it('defaults periodLength to 2 when entering custom mode', async () => {
      const { user } = setup();
      await user.selectOptions(screen.getByRole('combobox'), 'custom');
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  describe('custom mode', () => {
    it('increments periodLength', async () => {
      const { user } = setup();
      await user.selectOptions(screen.getByRole('combobox'), 'custom');
      await user.click(screen.getByRole('button', { name: 'Increase period' }));
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    it('does not decrement periodLength below 2', async () => {
      const { user } = setup();
      await user.selectOptions(screen.getByRole('combobox'), 'custom');
      await user.click(screen.getByRole('button', { name: 'Decrease period' }));
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    it('returns to simple mode when simple… is selected', async () => {
      const { user } = setup();
      await user.selectOptions(screen.getByRole('combobox'), 'custom');
      await user.selectOptions(screen.getByRole('combobox'), 'simple');
      expect
        .soft(screen.queryByRole('button', { name: 'Decrease period' }))
        .not.toBeInTheDocument();
      expect.soft(screen.getByDisplayValue('day')).toBeInTheDocument();
    });
  });

  describe('submission', () => {
    it('calls onAdd with correct frequency for simple mode', async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.click(screen.getByRole('button', { name: 'Increase times' }));
      await user.selectOptions(screen.getByRole('combobox'), 'week');
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Exercise',
          frequency: { times: 2, periodLength: 1, periodUnit: 'week' },
        })
      );
    });

    it('calls onAdd with correct frequency for custom mode', async () => {
      const { user, onAdd } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.selectOptions(screen.getByRole('combobox'), 'custom');
      await user.click(screen.getByRole('button', { name: 'Increase period' }));
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: { times: 1, periodLength: 3, periodUnit: 'day' },
        })
      );
    });

    it('resets form after successful submit', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.click(screen.getByRole('button', { name: 'Increase times' }));
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect.soft(screen.getByRole('textbox', { name: 'Habit name' })).toHaveValue('');
      expect.soft(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect.soft(screen.getByDisplayValue('day')).toBeInTheDocument();
    });

    it('shows error when name is empty', async () => {
      const { user, onAdd } = setup();
      vi.mocked(validateInputs).mockReturnValueOnce(['Name is required']);
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect.soft(screen.getByText('Name is required')).toBeInTheDocument();
      expect.soft(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('calls onCancel when cancel is clicked', async () => {
      const { user, onCancel } = setup();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
