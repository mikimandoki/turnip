import { ChevronLeft } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import type { Frequency } from '../types';

import Alert from '../components/Alert';
import NotificationPicker from '../components/NotificationPicker';
import { useHabitContext } from '../contexts/useHabitContext';
import { toDateString } from '../utils/date';
import {
  checkNotificationPermission,
  openAppSettings,
  requestNotificationPermission,
} from '../utils/localNotifications';
import {
  defaultNotifDays,
  defaultNotificationValue,
  type NotificationValue,
  notifModeForUnit,
  validateNotif,
} from '../utils/notifications';
import { NOTIF_BLOCKED_MESSAGE } from '../utils/strings';
import { isNative, validateInputs } from '../utils/utils';
import styles from './AddHabitPage.module.css';

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

export default function AddHabitPage() {
  const navigate = useNavigate();
  const { addHabit, displayDate, recheckNotificationPermission } = useHabitContext();
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
  const [notif, setNotif] = useState<NotificationValue>(defaultNotificationValue);
  const [notifValidated, setNotifValidated] = useState(false);
  const [notifBlockedOpen, setNotifBlockedOpen] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const frequency: Frequency = { times, periodLength, periodUnit };
    const inputErrors = validateInputs({ name: trimmedName, frequency });
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    if (validateNotif(notif)) {
      setNotifValidated(true);
      return;
    }
    setErrors([]);
    await addHabit({
      id: nanoid(),
      name: trimmedName,
      frequency,
      createdAt: toDateString(displayDate),
      notification: notif.enabled ? notif : undefined,
    });
    if (isNative && notif.enabled) {
      const permStatus = await checkNotificationPermission();
      if (permStatus === 'blocked') {
        setNotifBlockedOpen(true);
        return; // navigate on alert dismiss
      }
      if (permStatus === 'prompt') {
        const result = await requestNotificationPermission();
        void recheckNotificationPermission();
        if (result === 'blocked') {
          setNotifBlockedOpen(true);
          return; // navigate on alert dismiss
        }
      }
    }
    void navigate('/');
  }

  return (
    <main className='app'>
      <header className='header'>
        <button className='btn-action' onClick={() => void navigate('/')} aria-label='Go back'>
          <ChevronLeft size={16} />
        </button>
        <div className='header-title header-title-centered'>
          <h1>New habit</h1>
        </div>
      </header>
      <div className='card'>
        <form className={styles.addHabitForm} onSubmit={e => void handleSubmit(e)}>
          <div className='form-row'>
            <input
              type='text'
              name='habit-name'
              placeholder={placeholder}
              value={name}
              aria-label='Habit name'
              className='text-input'
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
              name='times'
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
                  name='period-length'
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
                  name='frequency-unit'
                  aria-label='Frequency unit'
                  onChange={e => {
                    if (e.target.value === 'simple') {
                      setIsCustom(false);
                      setPeriodLengthStr('1');
                      setNotif(n => ({ ...n, mode: notifModeForUnit(periodUnit) }));
                    } else {
                      const unit = e.target.value as Frequency['periodUnit'];
                      setPeriodUnit(unit);
                      setNotif(n => ({ ...n, mode: notifModeForUnit('custom') }));
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
                name='frequency-unit'
                aria-label='Frequency unit'
                onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustom(true);
                    setPeriodLengthStr('2');
                    setNotif(n => ({ ...n, mode: notifModeForUnit('custom') }));
                  } else {
                    const unit = e.target.value as Frequency['periodUnit'];
                    setPeriodUnit(unit);
                    setPeriodLengthStr('1');
                    setNotif(n => ({ ...n, mode: notifModeForUnit(unit) }));
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
            validated={notifValidated}
            onChange={next => {
              setNotifValidated(false);
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
            <button className='btn-base btn-primary' type='submit' aria-label='Add habit'>
              Add habit
            </button>
            <button className='btn-base btn-ghost' type='button' onClick={() => void navigate('/')}>
              Cancel
            </button>
          </div>
          {errors.map(err => (
            <p className='error-message' role='alert' data-testid='error-message' key={err}>
              {err}
            </p>
          ))}
        </form>
      </div>
      <Alert
        open={notifBlockedOpen}
        title='Notifications blocked'
        description={NOTIF_BLOCKED_MESSAGE}
        confirm='Open Settings'
        cancel='Not now'
        variant='primary'
        onOpenChange={isOpen => {
          setNotifBlockedOpen(isOpen);
          if (!isOpen) void navigate('/');
        }}
        onConfirm={() => void openAppSettings()}
      />
    </main>
  );
}
