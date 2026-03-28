import { Switch } from 'radix-ui';

import { DAYS, type NotificationValue } from '../utils/notifications';
import { isNative } from '../utils/utils';

export default function NotificationPicker({
  value,
  onChange,
}: {
  value: NotificationValue;
  onChange: (next: NotificationValue) => void;
}) {
  if (!isNative) return null;

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
          <div className='notif-day-picker'>
            {DAYS.map(({ label, weekday }) => (
              <button
                key={weekday}
                type='button'
                className={`notif-day-btn${value.days.includes(weekday) ? ' active' : ''}`}
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
          <div className='form-row'>
            <span className='form-label'>at</span>
            <input
              type='time'
              value={value.time}
              onChange={e => onChange({ ...value, time: e.target.value })}
            />
          </div>
        </>
      )}
    </>
  );
}
