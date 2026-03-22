import { parseISO, subDays, subMonths, subWeeks } from 'date-fns';
import { useState } from 'react';

import type { Completion, Frequency, Habit } from './types';

import AddHabitForm from './AddHabitForm';
import {
  endDatePeriod,
  getCurrentDate,
  setDateOverride,
  startDatePeriod,
  toDateString,
} from './utils/date';
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
  const now = getCurrentDate();
  const today = toDateString(now);
  const periodStart = startDatePeriod(habit.frequency, now);
  return completions
    .filter(c => c.habitId === habit.id && c.date >= periodStart && c.date <= today)
    .reduce((sum, c) => sum + c.count, 0);
}

function calculateStreak(habit: Habit, completions: Completion[]): number {
  let streak = 0;
  let checkDate = getCurrentDate();

  while (true) {
    const periodStart = startDatePeriod(habit.frequency, checkDate);

    // Don't check periods before the habit existed
    if (periodStart < habit.createdAt) break;

    const periodEnd = endDatePeriod(habit.frequency, checkDate);
    const count = completions
      .filter(c => c.habitId === habit.id && c.date >= periodStart && c.date <= periodEnd)
      .reduce((sum, c) => sum + c.count, 0);

    if (count >= habit.frequency.times) {
      streak++;
    } else {
      break; // Streak broken
    }

    switch (habit.frequency.periodUnit) {
      case 'day':
        checkDate = subDays(checkDate, 1);
        break;
      case 'month':
        checkDate = subMonths(checkDate, 1);
        break;
      case 'week':
        checkDate = subWeeks(checkDate, 1);
        break;
    }
  }
  return streak;
}

// TODO: Move to separate file, simplify props: only habit, completedCount, onUpdate, onDelete
function HabitRow({
  habit,
  completedCount,
  targetCount,
  streak,
  onPositiveButtonClick,
  onNegativeButtonClick,
  onDeleteButtonClick,
}: {
  habit: Habit;
  completedCount: number;
  targetCount: number;
  streak: number;
  onPositiveButtonClick: () => void;
  onNegativeButtonClick: () => void;
  onDeleteButtonClick: () => void;
}) {
  const completionFlag = completedCount >= targetCount ? '✅' : '❌';
  const streakFlag = streak > 1 ? `🔥 ${streak}` : '';
  return (
    <div className='habitrow'>
      <div className='habitrow-info'>
        {habit.name} {describeFrequency(habit.frequency)}
      </div>
      <div className='habitrow-progress'>
        {completedCount}/{targetCount} {completionFlag} {streakFlag}
      </div>
      <div className='habitrow-actions'>
        <button className='habitrow-button' onClick={onPositiveButtonClick}>
          +
        </button>
        <button className='habitrow-button' onClick={onNegativeButtonClick}>
          -
        </button>
        <button className='habitrow-button' onClick={onDeleteButtonClick}>
          X
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [completions, setCompletions] = useState<Completion[]>(() =>
    loadFromStorage('completions', [])
  );
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage('habits', []));
  const [debugDate, setDebugDate] = useState<string>('');
  function updateCompletion(habitId: string, increment: number) {
    const today = toDateString(getCurrentDate());
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
            streak={calculateStreak(habit, completions)}
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
      {import.meta.env.DEV && (
      <div>
        <input
          type='date'
          value={debugDate}
          onChange={e => {
            setDebugDate(e.target.value);
            setDateOverride(e.target.value ? parseISO(e.target.value) : null);
          }}
        />
      </div>
      )}
    </>
  );
}
