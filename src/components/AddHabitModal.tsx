import { useState } from 'react';

import type { Frequency } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/localNotifications';
import { defaultNotifDays, type NotificationValue } from '../utils/notifications';
import { isNative, validateInputs } from '../utils/utils';
import NotificationPicker from './NotificationPicker';

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
    notification?: { enabled: boolean; time: string; days: number[] };
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [timesStr, setTimesStr] = useState('1');
  const [periodLengthStr, setPeriodLengthStr] = useState('1');
  const [periodUnit, setPeriodUnit] = useState<Frequency['periodUnit']>('day');
  const [isCustom, setIsCustom] = useState(false);
  const times = Math.max(1, parseInt(timesStr) || 1);
  const periodLength = Math.max(1, parseInt(periodLengthStr) || 1);
  const [errors, setErrors] = useState<string[]>([]);
  const [placeholder] = useState(
    () => placeholderExamples[Math.floor(Math.random() * placeholderExamples.length)]
  );
  const { recheckNotificationPermission } = useHabitContext();
  const [notif, setNotif] = useState<NotificationValue>({
    enabled: false,
    time: '09:00',
    days: [1, 2, 3, 4, 5, 6, 7],
  });

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const frequency: Frequency = { times, periodLength, periodUnit };
    const inputErrors = validateInputs({ name: trimmedName, frequency });
    if (notif.enabled && notif.days.length === 0) {
      inputErrors.push('Select at least one day for reminders');
    }
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    if (isNative && notif.enabled) {
      const granted =
        (await checkNotificationPermission()) || (await requestNotificationPermission());
      if (!granted) {
        setErrors([
          'Notification permission was denied. You can enable it in your device settings.',
        ]);
        return;
      }
      void recheckNotificationPermission();
    }
    setErrors([]);
    onAdd({
      name: trimmedName,
      frequency,
      notification: notif.enabled
        ? { enabled: true, time: notif.time, days: notif.days }
        : undefined,
    });
    setName('');
    setTimesStr('1');
    setPeriodLengthStr('1');
    setPeriodUnit('day');
    setIsCustom(false);
    setNotif({ enabled: false, time: '09:00', days: [1, 2, 3, 4, 5, 6, 7] });
  }

  return (
    <form className='add-habit-form' onSubmit={e => void handleSubmit(e)}>
      <div className='form-row'>
        <input
          type='text'
          placeholder={placeholder}
          value={name}
          aria-label='Habit name'
          onChange={e => setName(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      <div className='form-row'>
        <button
          type='button'
          className='btn-stepper'
          aria-label='Decrease times'
          onClick={() => setTimesStr(String(Math.max(1, times - 1)))}
        >
          −
        </button>
        <input
          type='text'
          inputMode='numeric'
          pattern='[0-9]*'
          className='input-stepper'
          aria-label='Times'
          value={timesStr}
          onChange={e => setTimesStr(e.target.value.replace(/\D/g, ''))}
          onBlur={() => setTimesStr(String(times))}
        />
        <button
          type='button'
          className='btn-stepper'
          aria-label='Increase times'
          onClick={() => setTimesStr(String(times + 1))}
        >
          +
        </button>
        <span className='form-label'>per</span>
        {isCustom ? (
          <>
            <button
              type='button'
              className='btn-stepper'
              aria-label='Decrease period'
              onClick={() => setPeriodLengthStr(String(Math.max(2, periodLength - 1)))}
            >
              −
            </button>
            <input
              type='text'
              inputMode='numeric'
              pattern='[0-9]*'
              className='input-stepper'
              aria-label='Period length'
              value={periodLengthStr}
              onChange={e => setPeriodLengthStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => setPeriodLengthStr(String(periodLength))}
            />
            <button
              type='button'
              className='btn-stepper'
              aria-label='Increase period'
              onClick={() => setPeriodLengthStr(String(periodLength + 1))}
            >
              +
            </button>
            <select
              value={periodUnit}
              onChange={e => {
                if (e.target.value === 'simple') {
                  setIsCustom(false);
                  setPeriodLengthStr('1');
                } else {
                  setPeriodUnit(e.target.value as Frequency['periodUnit']);
                }
              }}
            >
              <option value='day'>days</option>
              <option value='week'>weeks</option>
              <option value='month'>months</option>
              <option value='simple'>simple…</option>
            </select>
          </>
        ) : (
          <select
            value={periodUnit}
            onChange={e => {
              if (e.target.value === 'custom') {
                setIsCustom(true);
                setPeriodLengthStr('2');
              } else {
                setPeriodUnit(e.target.value as Frequency['periodUnit']);
                setPeriodLengthStr('1');
              }
            }}
          >
            <option value='day'>day</option>
            <option value='week'>week</option>
            <option value='month'>month</option>
            <option value='custom'>custom…</option>
          </select>
        )}
      </div>
      <NotificationPicker
        value={notif}
        onChange={next => {
          if (!notif.enabled && next.enabled) {
            setNotif({
              ...next,
              days: defaultNotifDays({ times, periodLength, periodUnit }),
            });
          } else {
            setNotif(next);
          }
        }}
      />
      <div className='form-row'>
        <button className='btn-base btn-primary' type='submit'>
          Add habit
        </button>
        <button className='btn-base btn-ghost' type='button' onClick={onCancel}>
          Cancel
        </button>
      </div>
      {errors.map(err => (
        <p className='error-message' key={err}>
          {err}
        </p>
      ))}
    </form>
  );
}
