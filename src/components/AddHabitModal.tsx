import { Switch } from 'radix-ui';
import { useState } from 'react';

import type { Frequency } from '../types';

import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/localNotifications';
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
  onAdd: (data: {
    name: string;
    frequency: Frequency;
    notification?: { enabled: boolean; time: string };
  }) => void;
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
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState('09:00');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const frequency: Frequency = { times, periodLength, periodUnit };
    const inputErrors = validateInputs({ name: trimmedName, frequency });
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    if (notifEnabled) {
      const granted =
        (await checkNotificationPermission()) || (await requestNotificationPermission());
      if (!granted) {
        setErrors([
          'Notification permission was denied. You can enable it in your device settings.',
        ]);
        return;
      }
    }
    setErrors([]);
    onAdd({
      name: trimmedName,
      frequency,
      notification: notifEnabled ? { enabled: true, time: notifTime } : undefined,
    });
    setName('');
    setTimes(1);
    setPeriodLength(1);
    setPeriodUnit('day');
    setNotifEnabled(false);
    setNotifTime('09:00');
  }

  return (
    <form className='add-habit-form' onSubmit={e => void handleSubmit(e)}>
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
      <div className='settings-item'>
        <span className='settings-item-label'>Remind me</span>
        <Switch.Root
          checked={notifEnabled}
          onCheckedChange={setNotifEnabled}
          className='switch-root'
        >
          <Switch.Thumb className='switch-thumb' />
        </Switch.Root>
      </div>
      {notifEnabled && (
        <div className='form-row'>
          <span className='form-label'>at</span>
          <input type='time' value={notifTime} onChange={e => setNotifTime(e.target.value)} />
        </div>
      )}
      {errors.map(err => (
        <p className='error-message' key={err}>
          {err}
        </p>
      ))}
      <div className='form-row'>
        <button className='btn-base btn-primary' type='submit'>
          Add habit
        </button>
        <button className='btn-base btn-ghost' type='button' onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
