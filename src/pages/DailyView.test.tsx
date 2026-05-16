import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import DailyView from './DailyView';

const mockNavigate = vi.fn();
const mockShiftDate = vi.fn();
const mockSetDate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../contexts/useHabitContext', () => ({
  useHabitContext: vi.fn(),
}));

vi.mock('../utils/sqlite', () => ({
  getDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/dev', () => ({
  isDevUI: false,
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: vi.fn(() => () => {}),
  dropTargetForElements: vi.fn(() => () => {}),
  monitorForElements: vi.fn(() => () => {}),
}));

vi.mock('../components/HabitCard', () => ({
  default: ({ habit }: { habit: Habit }) => <div role='listitem'>{habit.name}</div>,
}));

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Test habit',
  sortOrder: 0,
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: '2026-04-01',
  ...overrides,
});

const baseContext = {
  habits: [],
  completions: [],
  groups: [],
  displayDate: new Date('2026-04-11'),
  hasOnboarded: true,
  updateCompletion: vi.fn(),
  reorderHabits: vi.fn(),
  createGroup: vi.fn(),
  shiftDate: mockShiftDate,
  setDate: mockSetDate,
  clearAll: vi.fn(),
  loadDemoData: vi.fn(),
  darkMode: false,
  toggleDarkMode: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useHabitContext).mockReturnValue(baseContext as never);
  mockShiftDate.mockClear();
  mockSetDate.mockClear();
});

describe('DailyView onboarding states', () => {
  it('shows welcome screen when no habits and not onboarded', () => {
    vi.mocked(useHabitContext).mockReturnValue({
      ...baseContext,
      habits: [],
      hasOnboarded: false,
    } as never);
    render(<DailyView />);
    expect.soft(screen.getByText('Welcome to Turnip')).toBeInTheDocument();
    expect.soft(screen.getByText(/explore demo data/i)).toBeInTheDocument();
  });

  it('calls loadDemoData when explore demo button is clicked', async () => {
    const loadDemoData = vi.fn();
    vi.mocked(useHabitContext).mockReturnValue({
      ...baseContext,
      habits: [],
      hasOnboarded: false,
      loadDemoData,
    } as never);
    render(<DailyView />);
    await userEvent.click(screen.getByText(/explore demo data/i));
    expect(loadDemoData).toHaveBeenCalled();
  });

  it('shows empty state when no habits and already onboarded', () => {
    render(<DailyView />);
    expect.soft(screen.getByText(/no habits yet/i)).toBeInTheDocument();
    expect.soft(screen.queryByText('Welcome to Turnip')).not.toBeInTheDocument();
  });

  it('shows habit cards and no onboarding when habits exist', () => {
    vi.mocked(useHabitContext).mockReturnValue({
      ...baseContext,
      habits: [makeHabit({ id: 'h1', name: 'Morning run' })],
    } as never);
    render(<DailyView />);
    expect.soft(screen.getByText('Morning run')).toBeInTheDocument();
    expect.soft(screen.queryByText('Welcome to Turnip')).not.toBeInTheDocument();
    expect.soft(screen.queryByText(/no habits yet/i)).not.toBeInTheDocument();
  });
});

describe('DailyView visible habits filter', () => {
  it('hides habits created after the display date', () => {
    vi.mocked(useHabitContext).mockReturnValue({
      ...baseContext,
      displayDate: new Date('2026-04-11'),
      habits: [
        makeHabit({ id: 'h1', name: 'Old habit', createdAt: '2026-04-01' }),
        makeHabit({ id: 'h2', name: 'Future habit', createdAt: '2026-04-12' }),
      ],
    } as never);
    render(<DailyView />);
    expect.soft(screen.getByText('Old habit')).toBeInTheDocument();
    expect.soft(screen.queryByText('Future habit')).not.toBeInTheDocument();
  });

  it('shows habits created on the display date', () => {
    vi.mocked(useHabitContext).mockReturnValue({
      ...baseContext,
      displayDate: new Date('2026-04-11'),
      habits: [makeHabit({ id: 'h1', name: 'Same day habit', createdAt: '2026-04-11' })],
    } as never);
    render(<DailyView />);
    expect(screen.getByText('Same day habit')).toBeInTheDocument();
  });
});

describe('DailyView actions', () => {
  it('navigates to /add when add habit button is clicked', async () => {
    render(<DailyView />);
    await userEvent.click(screen.getByRole('button', { name: /add new habit/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/add');
  });

  it('navigates to /settings when settings button is clicked', async () => {
    render(<DailyView />);
    await userEvent.click(screen.getByRole('button', { name: /open settings/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('calls toggleDarkMode when dark mode button is clicked', async () => {
    const toggleDarkMode = vi.fn();
    vi.mocked(useHabitContext).mockReturnValue({ ...baseContext, toggleDarkMode } as never);
    render(<DailyView />);
    await userEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(toggleDarkMode).toHaveBeenCalled();
  });
});

describe('DailyView header', () => {
  it('renders the current date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11'));
    try {
      render(<DailyView />);
      expect(screen.getByText('Today')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('calls shiftDate(-1) when previous day button is clicked', async () => {
    render(<DailyView />);
    await userEvent.click(screen.getByRole('button', { name: /previous day/i }));
    expect(mockShiftDate).toHaveBeenCalledWith(-1);
  });

  it('calls shiftDate(1) when next day button is clicked', async () => {
    render(<DailyView />);
    await userEvent.click(screen.getByRole('button', { name: /next day/i }));
    expect(mockShiftDate).toHaveBeenCalledWith(1);
  });

  it('date input calls setDate when changed', () => {
    render(<DailyView />);
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    // jsdom doesn't fully implement date inputs; fireEvent.change sets the value via React's event system
    fireEvent.change(input, { target: { value: '2026-04-15' } });
    expect(mockSetDate).toHaveBeenCalledWith('2026-04-15');
  });

  it('date button click attempts to open the picker', async () => {
    render(<DailyView />);
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    const showPicker = vi.fn();
    // showPicker is not implemented in jsdom; attach a spy so we can assert it was called
    Object.defineProperty(input, 'showPicker', { value: showPicker, configurable: true });

    // Click the date button (parent div of the input)
    await userEvent.click(input.parentElement!);
    expect(showPicker).toHaveBeenCalled();
  });
});
