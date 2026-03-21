import { useState } from 'react';

import type { Frequency, Habit } from './types';

import AddHabitForm from './AddHabitForm';

const DUMMY_HABITS: Habit[] = [
  {
    id: '1',
    name: 'Gym',
    frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
    createdAt: '2026-03-19',
  },
  {
    id: '2',
    name: 'Read',
    frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
    createdAt: '2026-03-19',
  },
];

function describeFrequency(frequency: Frequency) {
  const unit = frequency.periodLength === 1 ? frequency.periodUnit : `${frequency.periodLength} ${frequency.periodUnit}s`
  const times = frequency.times === 1 ? '' : `${frequency.times}x `
  if (frequency.periodLength === 1) {
    switch (frequency.periodUnit) {
      case 'day': 
        return `${times}daily`
      case 'month':
        return `${times}monthly`
      case 'week': 
        return `${times}weekly`
    };
  } else {
    return `${times}every ${unit}`
  }
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
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [habits, setHabits] = useState<Habit[]>(DUMMY_HABITS);
  function toggleCompletion(habitId: string) {
    setCompletions({ ...completions, [habitId]: !completions[habitId] });
  }
  function addHabit(newHabit: Habit) {
    setHabits([...habits, newHabit]);
  }
  return (
    <>
      <div className='habit'>
        {habits.map(habit => (
          <HabitSquare
            key={habit.id}
            value={habit}
            isDone={completions[habit.id]}
            onButtonClick={() => toggleCompletion(habit.id)}
          />
        ))}
      </div>
      <div>
        <AddHabitForm onAdd={addHabit} />
      </div>
    </>
  );
}