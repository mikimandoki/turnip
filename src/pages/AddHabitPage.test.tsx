import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHabitContext } from '../contexts/useHabitContext';
import { validateInputs } from '../utils/utils';
import AddHabitPage from './AddHabitPage';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/useHabitContext', () => ({
  useHabitContext: vi.fn(),
}));

vi.mock('../utils/utils', () => ({
  isNative: false,
  validateInputs: vi.fn(() => []),
}));

vi.mock('../components/NotificationPicker', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: {
      enabled: boolean;
      mode: string;
      days: number[];
      monthDays: number[];
      time: string;
      customMessage: string;
      intervalN: number;
      intervalUnit: string;
    };
    onChange: (v: typeof value) => void;
  }) => (
    <>
      {!value.enabled && (
        <button type='button' onClick={() => onChange({ ...value, enabled: true })}>
          Enable notifications
        </button>
      )}
      {value.enabled && (
        <>
          <button
            type='button'
            onClick={() => onChange({ ...value, mode: 'days-of-week', days: [] })}
          >
            Set days-of-week no days
          </button>
          <button
            type='button'
            onClick={() => onChange({ ...value, mode: 'days-of-month', monthDays: [] })}
          >
            Set days-of-month no days
          </button>
          <button type='button' onClick={() => onChange({ ...value, mode: 'daily' })}>
            Switch to daily
          </button>
        </>
      )}
    </>
  ),
}));

vi.mock('../utils/date', () => ({
  toDateString: () => '2026-04-01',
}));

let addHabit: ReturnType<typeof vi.fn>;

function setup() {
  const user = userEvent.setup();
  render(<AddHabitPage />);
  return { user };
}

beforeEach(() => {
  addHabit = vi.fn();
  vi.mocked(useHabitContext).mockReturnValue({
    addHabit,
    displayDate: new Date('2026-04-01'),
    recheckNotificationPermission: vi.fn(),
  } as unknown as ReturnType<typeof useHabitContext>);
  mockNavigate.mockReset();
});

describe('AddHabitPage', () => {
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
    it('calls addHabit with correct frequency for simple mode', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.click(screen.getByRole('button', { name: 'Increase times' }));
      await user.selectOptions(screen.getByRole('combobox'), 'week');
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(addHabit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Exercise',
          frequency: { times: 2, periodLength: 1, periodUnit: 'week' },
        })
      );
    });

    it('calls addHabit with correct frequency for custom mode', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.selectOptions(screen.getByRole('combobox'), 'custom');
      await user.click(screen.getByRole('button', { name: 'Increase period' }));
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(addHabit).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: { times: 1, periodLength: 3, periodUnit: 'day' },
        })
      );
    });

    it('navigates to / after successful submit', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('shows error when name is empty', async () => {
      const { user } = setup();
      vi.mocked(validateInputs).mockReturnValueOnce(['Name is required']);
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect.soft(screen.getByText('Name is required')).toBeInTheDocument();
      expect.soft(addHabit).not.toHaveBeenCalled();
    });
  });

  describe('notification validation', () => {
    it('does not submit when days-of-week mode has no days selected', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.click(screen.getByRole('button', { name: 'Enable notifications' }));
      await user.click(screen.getByRole('button', { name: 'Set days-of-week no days' }));
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(addHabit).not.toHaveBeenCalled();
    });

    it('does not submit when days-of-month mode has no days selected', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.click(screen.getByRole('button', { name: 'Enable notifications' }));
      await user.click(screen.getByRole('button', { name: 'Set days-of-month no days' }));
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(addHabit).not.toHaveBeenCalled();
    });
  });

  describe('note', () => {
    it('renders the note textarea', () => {
      setup();
      expect(screen.getByRole('textbox', { name: 'Note' })).toBeInTheDocument();
    });

    it('passes note to addHabit when filled in', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.type(screen.getByRole('textbox', { name: 'Note' }), 'My private note');
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      expect(addHabit).toHaveBeenCalledWith(expect.objectContaining({ note: 'My private note' }));
    });

    it('omits note from addHabit when left blank', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      const called = addHabit.mock.calls[0][0] as { note?: string };
      expect(called.note).toBeUndefined();
    });

    it('omits note from addHabit when whitespace only', async () => {
      const { user } = setup();
      await user.type(screen.getByRole('textbox', { name: 'Habit name' }), 'Exercise');
      await user.type(screen.getByRole('textbox', { name: 'Note' }), '   ');
      await user.click(screen.getByRole('button', { name: 'Add habit' }));
      const called = addHabit.mock.calls[0][0] as { note?: string };
      expect(called.note).toBeUndefined();
    });

    it('shows character counter when note exceeds 900 characters', () => {
      setup();
      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
        target: { value: 'a'.repeat(950) },
      });
      expect(screen.getByText('50 characters remaining')).toBeInTheDocument();
    });

    it('does not show counter below 900 characters', () => {
      setup();
      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
        target: { value: 'a'.repeat(899) },
      });
      expect(screen.queryByText(/characters remaining/)).not.toBeInTheDocument();
    });

    it('shows error at the 1000-character limit', () => {
      setup();
      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
        target: { value: 'a'.repeat(1000) },
      });
      expect(screen.getByRole('alert')).toHaveTextContent('0 characters remaining');
    });
  });

  describe('cancel', () => {
    it('navigates to / when cancel is clicked', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
