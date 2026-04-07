import { parseISO } from 'date-fns';
import { Check, ChevronLeft, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import styles from './HabitDetail.module.css';
import { useNavigate, useParams } from 'react-router';

import Alert from '../components/Alert';
import { HabitEmoji } from '../components/HabitEmoji';
import Heatmap from '../components/Heatmap';
import NotificationPicker from '../components/NotificationPicker';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate } from '../utils/date';
import {
  calculateHabitStats,
  describeFrequency,
  getTotalCompletions,
  parseHabitEmoji,
} from '../utils/habits';
import {
  checkNotificationPermission,
  openAppSettings,
  requestNotificationPermission,
} from '../utils/localNotifications';
import {
  DAYS,
  defaultNotifDays,
  defaultNotificationValue,
  type NotificationValue,
  notifModeForUnit,
  validateNotif,
} from '../utils/notifications';
import { NOTIF_BLOCKED_MESSAGE } from '../utils/strings';
import { formatCount, isNative, validateInputs } from '../utils/utils';

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, completions, deleteHabit, editHabit, recheckNotificationPermission } =
    useHabitContext();
  const habit = habits.find(h => h.id === id);
  // TODO: calculateHabitStats is memoized with useMemo in HabitCard but called raw here.
  // Memoize for consistency and to avoid recalculating on every render.
  const habitStats = habit ? calculateHabitStats(habit, completions, new Date()) : undefined;
  // TODO: these 6 state variables all belong to the same edit flow and move together.
  // Replace with a single useReducer (or grouped state object) to simplify reset logic and
  // avoid stale-closure bugs when multiple setters fire in the same event.
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit?.name ?? '');
  const [editNotif, setEditNotif] = useState<NotificationValue>({
    ...defaultNotificationValue(),
    mode: notifModeForUnit(
      (habit?.frequency.periodLength ?? 1) > 1 ? 'custom' : (habit?.frequency.periodUnit ?? 'day')
    ),
    ...habit?.notification,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [notifValidated, setNotifValidated] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notifBlockedOpen, setNotifBlockedOpen] = useState(false);
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
    if (inputErrors.length > 0) {
      setErrors(inputErrors);
      return;
    }
    if (validateNotif(editNotif)) {
      setNotifValidated(true);
      return;
    }
    if (isNative && editNotif.enabled) {
      const permStatus = await checkNotificationPermission();
      if (permStatus === 'blocked') {
        setNotifBlockedOpen(true);
      } else if (permStatus === 'prompt') {
        const result = await requestNotificationPermission();
        if (result === 'blocked') setNotifBlockedOpen(true);
        void recheckNotificationPermission();
      }
    }
    setErrors([]);
    await editHabit(habit, {
      name: trimmedName,
      notification: editNotif.enabled ? editNotif : undefined,
    });
    setEditName(trimmedName);
    setIsEditing(false);
  }

  function buildNotifSuffix(notif: NotificationValue): string {
    switch (notif.mode) {
      case 'days-of-week':
        return (
          ' · ' +
          DAYS.filter(d => notif.days.includes(d.weekday))
            .map(d => d.label)
            .join(' ')
        );
      case 'days-of-month':
        return ' · days ' + notif.monthDays.join(', ');
      case 'interval':
        return ` · every ${notif.intervalN} ${notif.intervalUnit}`;
      default:
        return '';
    }
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
          <div className={styles.habitCardContent}>
            <HabitEmoji emoji={emoji} />
            <div className={styles.habitCardInfo}>
              {isEditing ? (
                <input
                  className={styles.editNameInput}
                  type='text'
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              ) : (
                <div className={styles.habitCardTitle}>{cleanName}</div>
              )}
              {errors.map(err => (
                <p className='error-message' key={err}>
                  {err}
                </p>
              ))}
              <div className={styles.habitCardSubtitle}>{describeFrequency(habit.frequency)}</div>
              <div className={styles.habitCardSubtitle}>
                Created {namedDayOrDate(parseISO(habit.createdAt))}
              </div>
              {isNative && !isEditing && habit.notification?.enabled && (
                <div className={styles.habitCardSubtitle}>
                  Reminds at{' '}
                  {new Date(`1970-01-01T${habit.notification.time}`).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {buildNotifSuffix(habit.notification)}
                </div>
              )}
            </div>
            <div className={styles.habitCardActions}>
              {isEditing ? (
                <>
                  <button className='btn-action' onClick={() => void handleSave()}>
                    <Check size={16} />
                  </button>
                  <button
                    className='btn-action'
                    onClick={() => {
                      setErrors([]);
                      setNotifValidated(false);
                      setIsEditing(false);
                      setEditName(habit.name);
                      setEditNotif({
                        ...defaultNotificationValue(),
                        mode: notifModeForUnit(
                          habit.frequency.periodLength > 1 ? 'custom' : habit.frequency.periodUnit
                        ),
                        ...habit.notification,
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
            <div className={styles.habitDetailNotif}>
              <NotificationPicker
                value={editNotif}
                validated={notifValidated}
                onChange={next => {
                  setNotifValidated(false);
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
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>
                {habitStats?.streakContinuable
                  ? habitStats.previousStreak
                  : habitStats?.currentStreak}
              </div>
              <div className={styles.statLabel}>current streak</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{habitStats?.maxStreak}</div>
              <div className={styles.statLabel}>best streak</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{habitStats?.completedPeriods}</div>
              <div className={styles.statLabel}>completions</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>
                {Math.round((habitStats?.completionRate ?? 0) * 100)}%
              </div>
              <div className={styles.statLabel}>completion rate</div>
            </div>
            {isNonSimpleDaily && (
              <>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{formatCount(timesLogged!)}</div>
                  <div className={styles.statLabel}>times logged</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{avgPerPeriod}</div>
                  <div className={styles.statLabel}>
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
          // We call the async logic here, but the handler itself returns void
          void (async () => {
            await deleteHabit(habit);
            void navigate('/');
          })();
        }}
      />
      <Alert
        open={notifBlockedOpen}
        title='Notifications blocked'
        description={NOTIF_BLOCKED_MESSAGE}
        confirm='Open Settings'
        cancel='Not now'
        variant='primary'
        onOpenChange={setNotifBlockedOpen}
        onConfirm={() => void openAppSettings()}
      />
    </>
  );
}
