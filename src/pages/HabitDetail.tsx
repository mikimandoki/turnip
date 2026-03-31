import { parseISO } from 'date-fns';
import { Check, ChevronLeft, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import Alert from '../components/Alert';
import { HabitEmoji } from '../components/HabitEmoji';
import Heatmap from '../components/Heatmap';
import NotificationPicker from '../components/NotificationPicker';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate } from '../utils/date';
import { calculateHabitStats, describeFrequency, getTotalCompletions, parseHabitEmoji } from '../utils/habits';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/localNotifications';
import { DAYS, defaultNotifDays, type NotificationValue } from '../utils/notifications';
import { formatCount, isNative, validateInputs } from '../utils/utils';

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, completions, deleteHabit, editHabit, recheckNotificationPermission } =
    useHabitContext();
  const habit = habits.find(h => h.id === id);
  const habitStats = habit ? calculateHabitStats(habit, completions, new Date()) : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit?.name ?? '');
  const [editNotif, setEditNotif] = useState<NotificationValue>({
    enabled: habit?.notification?.enabled ?? false,
    time: habit?.notification?.time ?? '09:00',
    days: habit?.notification?.days ?? [1, 2, 3, 4, 5, 6, 7],
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { emoji, cleanName } = parseHabitEmoji(habit?.name ?? '');

  if (!habit) return <div>Habit not found</div>;

  const isNonSimpleDaily = habit.frequency.times > 1 || habit.frequency.periodUnit !== 'day';
  const timesLogged = isNonSimpleDaily ? getTotalCompletions(habit, completions, new Date()) : null;
  const avgPerPeriod =
    timesLogged !== null && habitStats && habitStats.totalPeriods > 0
      ? Math.round((timesLogged / habitStats.totalPeriods) * 10) / 10
      : null;

  async function handleSave() {
    if (!habit) return;
    const trimmedName = editName.trim();
    const updated = { ...habit, name: trimmedName };
    const inputErrors = validateInputs(updated);
    if (editNotif.enabled && editNotif.days.length === 0) {
      inputErrors.push('Select at least one day for reminders');
    }
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    if (isNative && editNotif.enabled) {
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
    editHabit(habit, {
      name: trimmedName,
      notification: editNotif.enabled
        ? { enabled: true, time: editNotif.time, days: editNotif.days }
        : undefined,
    });
    setEditName(trimmedName);
    setIsEditing(false);
  }

  function buildDayLabels(days: number[]): string {
    return DAYS.filter(d => days.includes(d.weekday))
      .map(d => d.label)
      .join(' ');
  }

  return (
    <>
      <div className='app'>
        <div className='header'>
          <button className='btn-action' onClick={() => void navigate('/')}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className='card'>
          <div className='habit-card-content'>
            <HabitEmoji emoji={emoji} />
            <div className='habit-card-info'>
              {isEditing ? (
                <input
                  className='edit-name-input'
                  type='text'
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              ) : (
                <div className='habit-card-title'>{cleanName}</div>
              )}
              {errors.map(err => (
                <p className='error-message' key={err}>
                  {err}
                </p>
              ))}
              <div className='habit-card-subtitle'>{describeFrequency(habit.frequency)}</div>
              <div className='habit-card-subtitle'>
                Created {namedDayOrDate(parseISO(habit.createdAt))}
              </div>
              {isNative && !isEditing && habit.notification?.enabled && (
                <div className='habit-card-subtitle'>
                  Reminds at{' '}
                  {new Date(`1970-01-01T${habit.notification.time}`).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {habit.notification.days && habit.notification.days.length > 0
                    ? ` · ${buildDayLabels(habit.notification.days)}`
                    : ''}
                </div>
              )}
            </div>
            <div className='habit-card-actions'>
              {isEditing ? (
                <>
                  <button className='btn-action' onClick={() => void handleSave()}>
                    <Check size={16} />
                  </button>
                  <button
                    className='btn-action'
                    onClick={() => {
                      setErrors([]);
                      setIsEditing(false);
                      setEditName(habit.name);
                      setEditNotif({
                        enabled: habit.notification?.enabled ?? false,
                        time: habit.notification?.time ?? '09:00',
                        days: habit.notification?.days ?? [1, 2, 3, 4, 5, 6, 7],
                      });
                    }}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button className='btn-action' onClick={() => setIsEditing(true)}>
                    <Pencil size={16} />
                  </button>
                  <button className='btn-action delete' onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          {isNative && isEditing && (
            <div className='habit-detail-notif'>
              <NotificationPicker
                value={editNotif}
                onChange={next => {
                  if (!editNotif.enabled && next.enabled) {
                    setEditNotif({
                      ...next,
                      days: defaultNotifDays(habit.frequency),
                    });
                  } else {
                    setEditNotif(next);
                  }
                }}
              />
            </div>
          )}
        </div>
        <div className='card'>
          <div className='stats-grid'>
            <div className='stat-box'>
              <div className='stat-value'>
                {habitStats?.streakContinuable
                  ? habitStats.previousStreak
                  : habitStats?.currentStreak}
              </div>
              <div className='stat-label'>current streak</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>{habitStats?.maxStreak}</div>
              <div className='stat-label'>best streak</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>{habitStats?.completedPeriods}</div>
              <div className='stat-label'>completions</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>
                {Math.round((habitStats?.completionRate ?? 0) * 100)}%
              </div>
              <div className='stat-label'>completion rate</div>
            </div>
            {isNonSimpleDaily && (
              <>
                <div className='stat-box'>
                  <div className='stat-value'>{formatCount(timesLogged!)}</div>
                  <div className='stat-label'>times logged</div>
                </div>
                <div className='stat-box'>
                  <div className='stat-value'>{avgPerPeriod}</div>
                  <div className='stat-label'>
                    average per{' '}
                    {habit.frequency.periodLength === 1 ? habit.frequency.periodUnit : 'period'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className='card'>
          <Heatmap habit={habit} completions={completions} />
        </div>
      </div>
      <Alert
        title={`Delete "${parseHabitEmoji(habit.name).cleanName}"?`}
        description={
          'Are you sure you want to delete this habit?\n\nThis will remove all your progress. This cannot be undone.'
        }
        confirm='Delete'
        cancel='Cancel'
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          deleteHabit(habit);
          void navigate('/');
        }}
      />
    </>
  );
}
