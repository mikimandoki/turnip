import { startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Switch } from 'radix-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Frequency } from '../types';

import Alert from '../components/Alert';
import NotificationPicker from '../components/NotificationPicker';
import PeriodTimeline from '../components/PeriodTimeline';
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
  const { addHabit, recheckNotificationPermission, weekStartsOn } = useHabitContext();
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
  const [note, setNote] = useState('');
  const [notif, setNotif] = useState<NotificationValue>(defaultNotificationValue);
  const [notifValidated, setNotifValidated] = useState(false);
  const [notifBlockedOpen, setNotifBlockedOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>(toDateString(new Date()));
  const [dateWarningOpen, setDateWarningOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [flexiblePeriod, setFlexiblePeriod] = useState(false);
  const userOverrodeDate = useRef(false);

  const today = useMemo(() => new Date(), []);
  const todayStr = toDateString(today);

  const defaultStartDate = useMemo(() => {
    if (isCustom) {
      return todayStr;
    }
    switch (periodUnit) {
      case 'day':
        return todayStr;
      case 'week':
        return toDateString(startOfWeek(today, { weekStartsOn }));
      case 'month':
        return toDateString(startOfMonth(today));
    }
  }, [isCustom, periodUnit, today, todayStr, weekStartsOn]);

  function getPeriodExplainer(): string {
    if (isCustom) {
      return 'Custom habits start on your chosen start date.';
    }
    switch (periodUnit) {
      case 'day':
        return '';
      case 'week':
        return `Weekly habits start on ${weekStartsOn === 0 ? 'Sunday' : 'Monday'} by default. You can change your start date if you want to.`;
      case 'month':
        return 'Monthly habits start on the 1st by default. You can change your start date if you want to.';
    }
  }

  useEffect(() => {
    if (!userOverrodeDate.current) {
      setStartDate(defaultStartDate);
    }
  }, [defaultStartDate]);

  function handleStartDateChange(value: string) {
    userOverrodeDate.current = true;
    setStartDate(value);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const frequency: Frequency = { times, periodLength, periodUnit, flexiblePeriod };
    const inputErrors = validateInputs({ name: trimmedName, frequency });
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    if (validateNotif(notif)) {
      setNotifValidated(true);
      return;
    }

    const start = new Date(startDate);
    const daysDiff = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (Math.abs(daysDiff) > 90 && !pendingSubmit) {
      setDateWarningOpen(true);
      setPendingSubmit(true);
      return;
    }

    setErrors([]);
    await addHabit({
      id: nanoid(),
      name: trimmedName,
      note: note.trim() || undefined,
      sortOrder: 0,
      frequency,
      createdAt: todayStr,
      startDate,
      notification: notif.enabled ? notif : undefined,
    });
    if (isNative && notif.enabled) {
      const permStatus = await checkNotificationPermission();
      if (permStatus === 'blocked') {
        setNotifBlockedOpen(true);
        return;
      }
      if (permStatus === 'prompt') {
        const result = await requestNotificationPermission();
        void recheckNotificationPermission();
        if (result === 'blocked') {
          setNotifBlockedOpen(true);
          return;
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
                      userOverrodeDate.current = false;
                      if (unit === 'day') {
                        setStartDate(todayStr);
                      } else if (unit === 'week') {
                        setStartDate(toDateString(startOfWeek(today, { weekStartsOn })));
                      } else if (unit === 'month') {
                        setStartDate(toDateString(startOfMonth(today)));
                      }
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
                    userOverrodeDate.current = false;
                    if (unit === 'day') {
                      setStartDate(todayStr);
                    } else if (unit === 'week') {
                      setStartDate(toDateString(startOfWeek(today, { weekStartsOn })));
                    } else if (unit === 'month') {
                      setStartDate(toDateString(startOfMonth(today)));
                    }
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
          <div className={styles.startDateSection}>
            <label className='form-label' htmlFor='start-date'>
              Start date
            </label>
            {getPeriodExplainer() && (
              <span className={styles.startDateExplainer}>{getPeriodExplainer()}</span>
            )}
            <input
              id='start-date'
              type='date'
              value={startDate}
              onChange={e => handleStartDateChange(e.target.value)}
              className='text-input'
              style={{ marginTop: '8px' }}
            />
            {!(periodUnit === 'day' && periodLength === 1) && (
              <PeriodTimeline
                frequency={{ times, periodLength, periodUnit, flexiblePeriod }}
                startDate={startDate}
              />
            )}
            <div className={styles.flexibleRow}>
              <label className={styles.flexibleLabel}>
                <span>Flexible periods</span>
                <Switch.Root
                  checked={flexiblePeriod}
                  onCheckedChange={setFlexiblePeriod}
                  className='switch-root'
                  aria-label='Flexible periods'
                >
                  <Switch.Thumb className='switch-thumb' />
                </Switch.Root>
              </label>
              <span className={styles.flexibleExplainer}>
                Next period starts the day after you complete, not on a fixed schedule.
              </span>
            </div>
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
          <div>
            <textarea
              className='text-input'
              aria-label='Note'
              placeholder='Private note (optional)'
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', width: '100%' }}
              maxLength={1000}
            />
            {note.length >= 900 && (
              <p
                className={note.length === 1000 ? 'error-message' : styles.noteCounter}
                role={note.length === 1000 ? 'alert' : undefined}
              >
                {1000 - note.length} characters remaining
              </p>
            )}
          </div>
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
        open={dateWarningOpen}
        title='Start date is far in the past or future'
        description={
          startDate > todayStr
            ? `This habit will start on ${startDate}, which is more than 3 months from today. It won't appear in your daily view until then.\n\nAre you sure you want to continue?`
            : `This habit will start on ${startDate}, which is more than 3 months ago. Your completions will be counted from this date forward.\n\nAre you sure you want to continue?`
        }
        confirm='Continue'
        cancel='Change date'
        variant='primary'
        onOpenChange={isOpen => {
          setDateWarningOpen(isOpen);
          if (!isOpen) setPendingSubmit(false);
        }}
        onConfirm={() => {
          setDateWarningOpen(false);
          setPendingSubmit(false);
          const fakeEvent = { preventDefault: () => {} } as React.SyntheticEvent;
          void handleSubmit(fakeEvent);
        }}
      />
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
