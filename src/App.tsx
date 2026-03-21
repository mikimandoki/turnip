import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { useState } from 'react';

import type { Completion, Frequency, Habit } from './types';

import AddHabitForm from './AddHabitForm';
import { loadFromStorage, saveToStorage } from './localStorage';

const now = new Date()
const today = toDateString(now)

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
  switch(frequency.periodUnit) {
    case 'day':
      return toDateString(startOfDay(now))
    case 'week':
      return toDateString(startOfWeek(now, {weekStartsOn: 1}))
    case 'month':
      return toDateString(startOfMonth(now))
  }
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function getCompletionsInPeriod(habit: Habit, completions: Completion[]): number {
  const periodStart = startDatePeriod(habit.frequency)
  return completions
  .filter(c => c.habitId === habit.id && c.date >= periodStart && c.date <= today)
  .reduce((sum, c) => sum + c.count, 0)
}

function HabitSquare({
  value,
  isDone,
  onButtonClick,
}: {
  value: Habit;
  isDone: boolean;
  onButtonClick: () => void;
}) {
  const completionFlag = isDone ? '✅' : '❌';
  return (
    <>
      <button className='habitButton' onClick={onButtonClick}>
        {value.name} {describeFrequency(value.frequency)} {completionFlag}
      </button>
      <br />
    </>
  );
}

export default function App() {
  const [completions, setCompletions] = useState<Completion[]>(() =>
    loadFromStorage('completions', [])
  );
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', []));
  function toggleCompletion(habitId: string) {
    const existing = completions.find(c => c.habitId === habitId && c.date === today)
    let updated: Completion[]
    if (existing) {
      updated = completions.map(c => 
        c.habitId === habitId && c.date === today
        ? { ...c, count: c.count + 1}
        : c
      )
    } else {
      updated = [...completions, { habitId, date: today, count: 1}]
    }
    setCompletions(updated);
    saveToStorage('completions', updated);
  }

  function habitCompleted(habit: Habit): boolean {
    const completed = getCompletionsInPeriod(habit, completions)
    return Boolean(completed >= habit.frequency.times)
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
          <HabitSquare
            key={habit.id}
            value={habit}
            isDone={habitCompleted(habit)}
            onButtonClick={() => toggleCompletion(habit.id)}
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
