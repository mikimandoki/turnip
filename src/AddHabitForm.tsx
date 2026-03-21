import { useState } from 'react';

import type { Frequency, Habit } from './types';

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

export default function Form({ onAdd }: { onAdd: (habit: Habit) => void }) {
  const [name, setName] = useState('');
  const [times, setTimes] = useState(1);
  const [periodLength, setPeriodLength] = useState(1);
  const [periodUnit, setPeriodUnit] = useState<Frequency['periodUnit']>('day');
  const [errors, setErrors] = useState<string[]>([]);
  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      frequency: { times, periodLength, periodUnit },
      createdAt: new Date().toISOString(),
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
    <form onSubmit={handleSubmit}>
      <div>
        <label>Habit Name</label>
        <input type='text' value={name} onChange={e => setName(e.target.value)} />
        <button type='submit'>Record</button>
      </div>
      <div>
        <input type='number' min={1} value={times} onChange={e => setTimes(+e.target.value)} />
        <label> times every </label>
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
      <div>
        {errors.map((err, i) => (
          <p key={i} style={{ color: 'red' }}>
            {err}
          </p>
        ))}
      </div>
    </form>
  );
}
