import { parseISO } from 'date-fns';
import { Check, ChevronLeft, Pencil, Trash2, X } from 'lucide-react';
import { useMemo, useReducer } from 'react';
import { useNavigate, useParams } from 'react-router';

import type { Frequency } from '../types';

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
import styles from './HabitDetail.module.css';

type EditState = {
  isEditing: boolean;
  editName: string;
  editNotif: NotificationValue;
  errors: string[];
  notifValidated: boolean;
  deleteOpen: boolean;
  notifBlockedOpen: boolean;
};

type EditAction =
  | { type: 'CANCEL_EDIT'; habitName: string; defaultNotif: NotificationValue }
  | { type: 'CLEAR_NOTIF_VALIDATED' }
  | { type: 'CLOSE_DELETE_MODAL' }
  | { type: 'CLOSE_NOTIF_BLOCKED_MODAL' }
  | { type: 'OPEN_DELETE_MODAL' }
  | { type: 'OPEN_NOTIF_BLOCKED_MODAL' }
  | { type: 'SAVE_SUCCESS'; name: string }
  | { type: 'SET_ERRORS'; errors: string[] }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_NOTIF_VALIDATED' }
  | { type: 'SET_NOTIF'; notif: NotificationValue }
  | { type: 'START_EDIT' };

function getDefaultEditNotif(habit: {
  frequency: Pick<Frequency, 'periodLength' | 'periodUnit'>;
  notification?: NotificationValue;
}) {
  return {
    ...defaultNotificationValue(),
    mode: notifModeForUnit(
      habit.frequency.periodLength > 1 ? 'custom' : habit.frequency.periodUnit
    ),
    ...habit.notification,
  };
}

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'START_EDIT':
      return { ...state, isEditing: true };
    case 'CANCEL_EDIT':
      return {
        ...state,
        isEditing: false,
        errors: [],
        notifValidated: false,
        editName: action.habitName,
        editNotif: action.defaultNotif,
      };
    case 'SET_NAME':
      return { ...state, editName: action.name };
    case 'SET_NOTIF':
      return { ...state, editNotif: action.notif, notifValidated: false };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SET_NOTIF_VALIDATED':
      return { ...state, notifValidated: true };
    case 'CLEAR_NOTIF_VALIDATED':
      return { ...state, notifValidated: false };
    case 'OPEN_DELETE_MODAL':
      return { ...state, deleteOpen: true };
    case 'CLOSE_DELETE_MODAL':
      return { ...state, deleteOpen: false };
    case 'OPEN_NOTIF_BLOCKED_MODAL':
      return { ...state, notifBlockedOpen: true };
    case 'CLOSE_NOTIF_BLOCKED_MODAL':
      return { ...state, notifBlockedOpen: false };
    case 'SAVE_SUCCESS':
      return {
        ...state,
        isEditing: false,
        editName: action.name,
        errors: [],
        notifValidated: false,
      };
    default:
      return state;
  }
}

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, completions, deleteHabit, editHabit, recheckNotificationPermission } =
    useHabitContext();
  const habit = habits.find(h => h.id === id);
  const habitStats = useMemo(
    () => (habit ? calculateHabitStats(habit, completions, new Date()) : undefined),
    [habit, completions]
  );

  const [
    { isEditing, editName, editNotif, errors, notifValidated, deleteOpen, notifBlockedOpen },
    dispatch,
  ] = useReducer(editReducer, {
    isEditing: false,
    editName: habit?.name ?? '',
    editNotif: habit ? getDefaultEditNotif(habit) : defaultNotificationValue(),
    errors: [],
    notifValidated: false,
    deleteOpen: false,
    notifBlockedOpen: false,
  });

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
      dispatch({ type: 'SET_ERRORS', errors: inputErrors });
      return;
    }
    if (validateNotif(editNotif)) {
      dispatch({ type: 'SET_NOTIF_VALIDATED' });
      return;
    }
    if (isNative && editNotif.enabled) {
      const permStatus = await checkNotificationPermission();
      if (permStatus === 'blocked') {
        dispatch({ type: 'OPEN_NOTIF_BLOCKED_MODAL' });
      } else if (permStatus === 'prompt') {
        const result = await requestNotificationPermission();
        if (result === 'blocked') dispatch({ type: 'OPEN_NOTIF_BLOCKED_MODAL' });
        void recheckNotificationPermission();
      }
    }
    await editHabit(habit, {
      name: trimmedName,
      notification: editNotif.enabled ? editNotif : undefined,
    });
    dispatch({ type: 'SAVE_SUCCESS', name: trimmedName });
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
                  onChange={e => dispatch({ type: 'SET_NAME', name: e.target.value })}
                  aria-label='Habit name input'
                />
              ) : (
                <div className={styles.habitCardTitle}>{cleanName}</div>
              )}
              {errors.map(err => (
                <p className='error-message' key={err} aria-label='Error message'>
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
                  <button
                    className='btn-action'
                    onClick={() => void handleSave()}
                    aria-label='Save edits'
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className='btn-action'
                    aria-label='Cancel edits'
                    onClick={() =>
                      dispatch({
                        type: 'CANCEL_EDIT',
                        habitName: habit.name,
                        defaultNotif: getDefaultEditNotif(habit),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className='btn-action'
                    onClick={() => dispatch({ type: 'START_EDIT' })}
                    aria-label='Edit habit'
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className='btn-action delete'
                    onClick={() => dispatch({ type: 'OPEN_DELETE_MODAL' })}
                    aria-label='Delete habit'
                  >
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
                  if (!editNotif.enabled && next.enabled) {
                    dispatch({
                      type: 'SET_NOTIF',
                      notif: { ...next, days: defaultNotifDays(habit.frequency) },
                    });
                  } else {
                    dispatch({ type: 'SET_NOTIF', notif: next });
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
        onOpenChange={open => dispatch({ type: open ? 'OPEN_DELETE_MODAL' : 'CLOSE_DELETE_MODAL' })}
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
        onOpenChange={open =>
          dispatch({ type: open ? 'OPEN_NOTIF_BLOCKED_MODAL' : 'CLOSE_NOTIF_BLOCKED_MODAL' })
        }
        onConfirm={() => void openAppSettings()}
      />
    </>
  );
}
