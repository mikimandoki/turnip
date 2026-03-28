import { parseISO } from 'date-fns';
import { Check, ChevronLeft, Pencil, Trash2, X } from 'lucide-react';
import { Switch } from 'radix-ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import Alert from '../components/Alert';
import { HabitEmoji } from '../components/HabitEmoji';
import Heatmap from '../components/Heatmap';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate } from '../utils/date';
import { calculateHabitStats, describeFrequency, parseHabitEmoji } from '../utils/habits';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../utils/localNotifications';
import { validateInputs } from '../utils/utils';

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, completions, deleteHabit, editHabit } = useHabitContext();
  const habit = habits.find(h => h.id === id);
  const habitStats = habit ? calculateHabitStats(habit, completions, new Date()) : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit?.name ?? '');
  const [editNotifEnabled, setEditNotifEnabled] = useState(habit?.notification?.enabled ?? false);
  const [editNotifTime, setEditNotifTime] = useState(habit?.notification?.time ?? '09:00');
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { emoji, cleanName } = parseHabitEmoji(habit?.name ?? '');

  if (!habit) return <div>Habit not found</div>;

  async function handleSave() {
    if (!habit) return;
    const trimmedName = editName.trim();
    const updated = { ...habit, name: trimmedName };
    const inputErrors = validateInputs(updated);
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    if (editNotifEnabled) {
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
    editHabit(habit, {
      name: trimmedName,
      notification: editNotifEnabled ? { enabled: true, time: editNotifTime } : undefined,
    });
    setEditName(trimmedName);
    setIsEditing(false);
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
              {!isEditing && habit.notification?.enabled && (
                <div className='habit-card-subtitle'>
                  Reminds at{' '}
                  {new Date(`1970-01-01T${habit.notification.time}`).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
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
                      setEditNotifEnabled(habit.notification?.enabled ?? false);
                      setEditNotifTime(habit.notification?.time ?? '09:00');
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
          {isEditing && (
            <div className='habit-detail-notif'>
              <div className='settings-item'>
                <span className='settings-item-label'>Remind me</span>
                <Switch.Root
                  checked={editNotifEnabled}
                  onCheckedChange={setEditNotifEnabled}
                  className='switch-root'
                >
                  <Switch.Thumb className='switch-thumb' />
                </Switch.Root>
              </div>
              {editNotifEnabled && (
                <div className='form-row'>
                  <span className='form-label'>at</span>
                  <input
                    type='time'
                    value={editNotifTime}
                    onChange={e => setEditNotifTime(e.target.value)}
                  />
                </div>
              )}
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
              <div className='stat-value'>
                {Math.round((habitStats?.completionRate ?? 0) * 100)}%
              </div>
              <div className='stat-label'>completion rate</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>{habitStats?.completedPeriods}</div>
              <div className='stat-label'>total completions</div>
            </div>
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
