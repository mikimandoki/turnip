import { useState } from 'react';

import type { Frequency, Habit } from './types';

/**
 * Validation logic: 
 * - No empty name
 * - times and periodLength >=1 
 * - Times*unit must fit into length (no 8x a week)
 */

export default function Form({ onAdd }: { onAdd: (habit: Habit) => void }) {
  const [name, setName] = useState('');
  const [times, setTimes] = useState(1);
  const [periodLength, setPeriodLength] = useState(1);
  const [periodUnit, setPeriodUnit] = useState<Frequency['periodUnit']>('day');
  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      frequency: { times, periodLength, periodUnit },
      createdAt: new Date().toISOString(),
    };
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
    </form>
  );
}
