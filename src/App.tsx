import { useState } from 'react';

import type { Frequency, Habit } from './types';

import AddHabitForm from './AddHabitForm';
import { loadFromStorage, saveToStorage } from './localStorage';

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
  const [completions, setCompletions] = useState<Record<string, boolean>>(() =>
    loadFromStorage('completions', {})
  );
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', []));
  function toggleCompletion(habitId: string) {
    const updated = { ...completions, [habitId]: !completions[habitId] };
    setCompletions(updated);
    saveToStorage('completions', updated);
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
            isDone={completions[habit.id]}
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
            setCompletions({});
          }}
        >
          Delete All
        </button>
      </div>
    </>
  );
}
