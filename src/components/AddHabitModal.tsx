import { useState } from 'react';

import type { Frequency } from '../types';

import { validateInputs } from '../utils/utils';

const placeholderExamples = [
  '💪 Go to the gym',
  '📖 Read a book',
  '🧘 Meditate',
  '✍️ Journal',
  '🏃 Go for a run',
  '💧 Drink water',
  '🛏️ Make the bed',
  '🎸 Practice guitar',
  '🥗 Eat a healthy meal',
];

export default function AddHabitModal({
  onAdd,
  onCancel,
}: {
  onAdd: (data: { name: string; frequency: Frequency }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [times, setTimes] = useState(1);
  const [periodLength, setPeriodLength] = useState(1);
  const [periodUnit, setPeriodUnit] = useState<Frequency['periodUnit']>('day');
  const [errors, setErrors] = useState<string[]>([]);
  const [placeholder] = useState(
    () => placeholderExamples[Math.floor(Math.random() * placeholderExamples.length)]
  );

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const frequency: Frequency = { times, periodLength, periodUnit };
    const inputErrors = validateInputs({ name: trimmedName, frequency });
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    setErrors([]);
    onAdd({ name: trimmedName, frequency });
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
          placeholder={placeholder}
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
