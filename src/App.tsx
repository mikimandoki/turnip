import { useState } from 'react';

import type { Completion, Frequency, Habit } from './types';

import AddHabitForm from './AddHabitForm';
import { startDatePeriod, toDateString } from './utils/date';
import { clearStorage, loadFromStorage, saveToStorage } from './utils/localStorage';

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

// TODO: Handle periodlength > 1
// How many completions have been logged in the current period
function getCompletionsInPeriod(habit: Habit, completions: Completion[]): number {
  const now = new Date();
  const today = toDateString(now);
  const periodStart = startDatePeriod(habit.frequency, now);
  return completions
    .filter(c => c.habitId === habit.id && c.date >= periodStart && c.date <= today)
    .reduce((sum, c) => sum + c.count, 0);
}

// TODO: Move to separate file, simplify props: only habit, completedCount, onUpdate, onDelete
function HabitRow({
  habit,
  completedCount,
  targetCount,
  onPositiveButtonClick,
  onNegativeButtonClick,
  onDeleteButtonClick,
}: {
  habit: Habit;
  completedCount: number;
  targetCount: number;
  onPositiveButtonClick: () => void;
  onNegativeButtonClick: () => void;
  onDeleteButtonClick: () => void;
}) {
  const completionFlag = completedCount >= targetCount ? '✅' : '❌';
  return (
    <div>
      {habit.name} {describeFrequency(habit.frequency)} {completedCount}/{targetCount} {completionFlag}
      <button className='habitButton' onClick={onPositiveButtonClick}>
        +
      </button>
      <button className='habitButton' onClick={onNegativeButtonClick}>
        -
      </button>
      <button className='habitButton' onClick={onDeleteButtonClick}>
        X
      </button>
    </div>
  );
}

export default function App() {
  const [completions, setCompletions] = useState<Completion[]>(() =>
    loadFromStorage('completions', [])
  );
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', []));

  function updateCompletion(habitId: string, increment: number) {
    const today = toDateString(new Date());
    const existing = completions.find(c => c.habitId === habitId && c.date === today);
    let updated: Completion[];
    if (existing) {
      const newCount = existing.count + increment;
      if (newCount < 0) return; // Don't decrement below 0
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

  function addHabit(newHabit: Habit) {
    const updated = [...habits, newHabit];
    setHabits(updated);
    saveToStorage('habits', updated);
  }

  function deleteHabit(habit: Habit) {
    if (!confirm(`Delete "${habit.name}" ?`)) return;
    // Can't just delete the entire key from localStorage
    // Gotta remove the habit and its completion from both keys
    const updatedHabits = habits.filter(h => h.id !== habit.id);
    const updatedCompletions = completions.filter(c => c.habitId !== habit.id);
    setHabits(updatedHabits);
    setCompletions(updatedCompletions);
    saveToStorage('habits', updatedHabits);
    saveToStorage('completions', updatedCompletions);
  }
  return (
    <>
      <div className='habit'>
        {habits.map(habit => (
          <HabitRow
            key={habit.id}
            habit={habit}
            completedCount={getCompletionsInPeriod(habit, completions)}
            targetCount={habit.frequency.times}
            onPositiveButtonClick={() => updateCompletion(habit.id, 1)}
            onNegativeButtonClick={() => updateCompletion(habit.id, -1)}
            onDeleteButtonClick={() => deleteHabit(habit)}
          />
        ))}
      </div>
      <div>
        <AddHabitForm onAdd={addHabit} />
      </div>
      <div>
        <button
          onClick={() => {
            clearStorage();
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
