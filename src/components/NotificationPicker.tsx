import clsx from 'clsx';
import { Switch } from 'radix-ui';

import { isTimeInPast } from '../utils/date';
import styles from './NotificationPicker.module.css';
import {
  DAYS,
  type NotificationMode,
  type NotificationValue,
  validateNotif,
} from '../utils/notifications';
import { isNative } from '../utils/utils';

const MODES: { id: NotificationMode; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'days-of-week', label: 'Days of week' },
  { id: 'days-of-month', label: 'Days of month' },
  { id: 'interval', label: 'Custom' },
];

export default function NotificationPicker({
  value,
  onChange,
  validated = false,
}: {
  value: NotificationValue;
  onChange: (next: NotificationValue) => void;
  validated?: boolean;
}) {
  if (!isNative && import.meta.env.MODE !== 'development') return null;

  return (
    <>
      <div className='settings-item'>
        <span className='settings-item-label'>Remind me</span>
        <Switch.Root
          checked={value.enabled}
          onCheckedChange={enabled => onChange({ ...value, enabled })}
          className='switch-root'
        >
          <Switch.Thumb className='switch-thumb' />
        </Switch.Root>
      </div>
      {value.enabled && (
        <>
          <div className={styles.notifModeTabs}>
            {MODES.map(({ id, label }) => (
              <button
                key={id}
                type='button'
                className={clsx(styles.notifModeTab, value.mode === id && styles.active)}
                onClick={() => onChange({ ...value, mode: id })}
              >
                {label}
              </button>
            ))}
          </div>
          {value.mode === 'days-of-week' && (
            <div className={styles.notifDayPicker}>
              {DAYS.map(({ label, weekday }) => (
                <button
                  key={weekday}
                  type='button'
                  className={clsx(styles.notifDayBtn, value.days.includes(weekday) && styles.active)}
                  onClick={() => {
                    const days = value.days.includes(weekday)
                      ? value.days.filter(d => d !== weekday)
                      : [...value.days, weekday].sort((a, b) => a - b);
                    onChange({ ...value, days });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {value.mode === 'days-of-month' && (
            <>
              <div className='form-row'>
                <select
                  value=''
                  onChange={e => {
                    const day = parseInt(e.target.value);
                    if (!day || value.monthDays.includes(day)) return;
                    onChange({
                      ...value,
                      monthDays: [...value.monthDays, day].sort((a, b) => a - b),
                    });
                  }}
                >
                  <option value=''>Add a day…</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1)
                    .filter(d => !value.monthDays.includes(d))
                    .map(d => (
                      <option key={d} value={d}>
                        {ordinal(d)}
                      </option>
                    ))}
                </select>
              </div>
              {value.monthDays.length > 0 && (
                <div
                  className={styles.notifDayPicker}
                  style={{ flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' }}
                >
                  {value.monthDays.map(day => (
                    <button
                      key={day}
                      type='button'
                      className={clsx(styles.notifDayBtn, styles.active)}
                      onClick={() =>
                        onChange({ ...value, monthDays: value.monthDays.filter(d => d !== day) })
                      }
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {validated && validateNotif(value) !== null && (
            <p className='error-message'>{validateNotif(value)}</p>
          )}
          {value.mode === 'interval' && (
            <>
              <div className='form-row'>
                <span className='form-label'>Every</span>
                <button
                  type='button'
                  className='btn-stepper'
                  aria-label='Decrease interval'
                  onClick={() =>
                    onChange({ ...value, intervalN: Math.max(1, value.intervalN - 1) })
                  }
                >
                  −
                </button>
                <input
                  type='text'
                  inputMode='numeric'
                  pattern='[0-9]*'
                  className='input-stepper'
                  value={value.intervalN}
                  onChange={e =>
                    onChange({ ...value, intervalN: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <button
                  type='button'
                  className='btn-stepper'
                  aria-label='Increase interval'
                  onClick={() => onChange({ ...value, intervalN: value.intervalN + 1 })}
                >
                  +
                </button>
                <select
                  value={value.intervalUnit}
                  onChange={e =>
                    onChange({ ...value, intervalUnit: e.target.value as 'days' | 'weeks' })
                  }
                >
                  <option value='days'>days</option>
                  <option value='weeks'>weeks</option>
                </select>
              </div>
            </>
          )}
          <div className='form-row'>
            <span className='form-label'>at</span>
            <input
              type='time'
              value={value.time}
              onChange={e => onChange({ ...value, time: e.target.value })}
            />
            {value.mode === 'interval' && (
              <span className='form-label'>
                starting{' '}
                {isTimeInPast(
                  parseInt(value.time.split(':')[0]),
                  parseInt(value.time.split(':')[1]),
                  new Date()
                )
                  ? 'tomorrow'
                  : 'today'}
              </span>
            )}
          </div>
          <div className='form-row'>
            <input
              type='text'
              className='text-input'
              placeholder='Custom message (optional)'
              value={value.customMessage}
              onChange={e => onChange({ ...value, customMessage: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </>
      )}
    </>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
