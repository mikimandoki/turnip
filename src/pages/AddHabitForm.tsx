import { nanoid } from 'nanoid';
import { useState } from 'react';

import type { Frequency, Habit } from '../types';

import { getCurrentDate, toDateString } from '../utils/date';
function validateInputs(habit: Habit): string[] {
  const errors: string[] = [];
  if (!habit.name.trim()) {
    errors.push('Name is required');
  }
  if (habit.name.length > 50) {
    errors.push('Habit name too long');
  }
  if (isNaN(habit.frequency.times) || isNaN(habit.frequency.periodLength)) {
    errors.push('Frequency must be a number');
  }
  if (habit.frequency.times < 1 || habit.frequency.periodLength < 1) {
    errors.push('Frequency must be at least 1');
  }
  return errors;
}

export default function AddHabitForm({
  onAdd,
  onCancel,
}: {
  onAdd: (habit: Habit) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [times, setTimes] = useState(1);
  const [periodLength, setPeriodLength] = useState(1);
  const [periodUnit, setPeriodUnit] = useState<Frequency['periodUnit']>('day');
  const [errors, setErrors] = useState<string[]>([]);
  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const newHabit: Habit = {
      id: nanoid(),
      name: name.trim(),
      frequency: { times, periodLength, periodUnit },
      createdAt: toDateString(getCurrentDate()),
    };
    const inputErrors = validateInputs(newHabit);
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return; // stop here, don't add the habit
    }
    setErrors([]);
    onAdd(newHabit);
    setName('');
    setTimes(1);
    setPeriodLength(1);
    setPeriodUnit('day');
  }
  return (
    <form className='add-habit-form' onSubmit={handleSubmit}>
      <div className='form-row'>
        <input
          type='text'
          placeholder='Habit name'
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      <div className='form-row'>
        <input type='number' min={1} value={times} onChange={e => setTimes(+e.target.value)} />
        <span className='form-label'>times every</span>
        <input
          type='number'
          min={1}
          value={periodLength}
          onChange={e => setPeriodLength(+e.target.value)}
        />
        <select
          value={periodUnit}
          onChange={e => setPeriodUnit(e.target.value as Frequency['periodUnit'])}
        >
          <option value='day'>days</option>
          <option value='week'>weeks</option>
          <option value='month'>months</option>
        </select>
      </div>
      {errors.map(err => (
        <p className='error-message' key={err}>
          {err}
        </p>
      ))}
      <div className='form-row'>
        <button className='btn-submit' type='submit'>
          Add habit
        </button>
        <button className='btn-cancel' type='button' onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
