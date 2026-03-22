import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { useState } from 'react';

import type { Completion, Frequency, Habit } from './types';

import AddHabitForm from './AddHabitForm';
import { loadFromStorage, saveToStorage } from './localStorage';

const now = new Date();
const today = toDateString(now);

function describeFrequency(frequency: Frequency) {
  const unit =
    frequency.periodLength === 1
      ? frequency.periodUnit
      : `${frequency.periodLength} ${frequency.periodUnit}s`;
  const times = frequency.times === 1 ? '' : `${frequency.times}x `;
  if (frequency.periodLength === 1) {
    switch (frequency.periodUnit) {
      case 'day':
        return `${times}daily`;
      case 'month':
        return `${times}monthly`;
      case 'week':
        return `${times}weekly`;
    }
  } else {
    return `${times}every ${unit}`;
  }
}

function startDatePeriod(frequency: Frequency): string {
  switch (frequency.periodUnit) {
    case 'day':
      return toDateString(startOfDay(now));
    case 'week':
      return toDateString(startOfWeek(now, { weekStartsOn: 1 }));
    case 'month':
      return toDateString(startOfMonth(now));
  }
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getCompletionsInPeriod(habit: Habit, completions: Completion[]): number {
  const periodStart = startDatePeriod(habit.frequency);
  return completions
    .filter(c => c.habitId === habit.id && c.date >= periodStart && c.date <= today)
    .reduce((sum, c) => sum + c.count, 0);
}

function HabitRow({
  value,
  completedCount,
  targetCount,
  isDone,
  onPositiveButtonClick,
  onNegativeButtonClick,
}: {
  value: Habit;
  isDone: boolean;
  completedCount: number;
  targetCount: number;
  onPositiveButtonClick: () => void;
  onNegativeButtonClick: () => void;
}) {
  const completionFlag = isDone ? '✅' : '❌';
  return (
    <>
      <div>
        {value.name} {describeFrequency(value.frequency)} {completedCount}/{targetCount}{' '}
        {completionFlag}
        <button className='habitButton' onClick={onPositiveButtonClick}>
          +
        </button>
        <button className='habitButton' onClick={onNegativeButtonClick}>
          -
        </button>
      </div>
    </>
  );
}

export default function App() {
  const [completions, setCompletions] = useState<Completion[]>(() =>
    loadFromStorage('completions', [])
  );
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', []));
  function updateCompletion(habitId: string, increment: number) {
    const existing = completions.find(c => c.habitId === habitId && c.date === today);
    let updated: Completion[];
    if (existing) {
      const newCount = existing.count + increment;
      if (newCount < 0) return;
      updated = completions.map(c =>
        c.habitId === habitId && c.date === today ? { ...c, count: newCount } : c
      );
    } else {
      if (increment < 0) return;
      updated = [...completions, { habitId, date: today, count: increment }];
    }
    setCompletions(updated);
    saveToStorage('completions', updated);
  }

  function habitCompleted(habit: Habit): boolean {
    const completed = getCompletionsInPeriod(habit, completions);
    return Boolean(completed >= habit.frequency.times);
  }

  function addHabit(newHabit: Habit) {
    const updated = [...habits, newHabit];
    setHabits(updated);
    saveToStorage('habits', updated);
  }
  return (
    <>
      <div className='habit'>
        {habits.map(habit => (
          <HabitRow
            key={habit.id}
            value={habit}
            isDone={habitCompleted(habit)}
            completedCount={getCompletionsInPeriod(habit, completions)}
            targetCount={habit.frequency.times}
            onPositiveButtonClick={() => updateCompletion(habit.id, 1)}
            onNegativeButtonClick={() => updateCompletion(habit.id, -1)}
          />
        ))}
      </div>
      <div>
        <AddHabitForm onAdd={addHabit} />
      </div>
      <div>
        <button
          onClick={() => {
            localStorage.clear();
            setHabits([]);
            setCompletions([]);
          }}
        >
          Delete All
        </button>
      </div>
    </>
  );
}
