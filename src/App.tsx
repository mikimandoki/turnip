import { useState } from 'react';

import type { Habit } from './types';

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
  const freq = `${value.frequency.times} times every ${value.frequency.periodLength} ${value.frequency.periodUnit}`;
  return (
    <>
      <button className='habitButton' onClick={onButtonClick}>
        {value.name} {freq} {completionFlag}
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