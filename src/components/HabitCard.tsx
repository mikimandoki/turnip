import { useSortable } from '@dnd-kit/react/sortable';
import clsx from 'clsx';
import { BellOff, BellRing, Check, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { startDatePeriod, toDateString } from '../utils/date';
import { calculateHabitStats, describeFrequency, parseHabitEmoji } from '../utils/habits';
import { isNative, simpleHash } from '../utils/utils';
import styles from './HabitCard.module.css';
import { HabitEmoji } from './HabitEmoji';

const motivationalMessages = [
  'keep going!',
  "don't break the streak!",
  "you've got this!",
  'stay consistent!',
  'almost there!',
  'keep it up!',
  'one day at a time!',
  'showing up is half the battle!',
  'momentum builds!',
  'discipline beats motivation!',
  'trust the process!',
  'small steps, big results!',
];

export default function HabitCard({
  habit,
  index,
  completedCount,
  onClick,
  onLog,
}: {
  habit: Habit;
  index: number;
  completedCount: number;
  onClick: () => void;
  onLog: (delta: number) => void;
}) {
  const [showTick, setShowTick] = useState(false);
  const { displayDate, isFutureDate, osNotificationsGranted, completions } = useHabitContext();
  const targetCount = habit.frequency.times;
  const loggedToday = completions.some(
    c => c.habitId === habit.id && c.date === toDateString(displayDate) && c.count > 0
  );
  const { ref, isDragging } = useSortable({ id: habit.id, index });
  // TODO: `completions` comes from context and is a new array reference on every render, so this
  // useMemo will almost never skip. To make it effective, either memoize the completions array in
  // context, or pass only the relevant completions for this habit as a prop.
  const habitStats = useMemo(
    () => calculateHabitStats(habit, completions, displayDate),
    [habit, completions, displayDate]
  );
  const periodStart = startDatePeriod(habit, displayDate);
  const seed = simpleHash(habit.id + periodStart);
  const message = motivationalMessages[seed % motivationalMessages.length];
  const { emoji, cleanName } = parseHabitEmoji(habit.name);
  const progressPercent = Math.min(100, (completedCount / targetCount) * 100);
  const status =
    completedCount >= targetCount ? 'done' : completedCount > 0 ? 'in-progress' : 'behind';
  const statusClass = {
    done: styles.done,
    'in-progress': styles.inProgress,
    behind: styles.behind,
  };
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={clsx('card', isDragging && styles.dragging, loggedToday && styles.loggedToday)}
      aria-label='Habit card'
    >
      <div className={styles.habitCardContent}>
        <HabitEmoji emoji={emoji} />
        <div className={styles.habitCardInfo}>
          <div className={styles.habitCardTitle} data-testid='habit-title'>
            {cleanName}
          </div>
          <div className={styles.habitCardSubtitle}>{describeFrequency(habit.frequency)}</div>
        </div>
        <div className={styles.habitCardRight}>
          {isNative &&
            habit.notification?.enabled &&
            (osNotificationsGranted ? (
              <BellRing size={12} className={styles.habitCardNotifIcon} />
            ) : (
              <BellOff size={12} className={styles.habitCardNotifIcon} />
            ))}
          <span
            className={clsx(styles.completionCount, statusClass[status])}
            data-testid='completion-count'
          >
            {completedCount}/{targetCount}
          </span>
          <div className={styles.habitCardActions}>
            <button
              aria-label='Decrease count'
              className='btn-action'
              onClick={e => {
                e.stopPropagation();
                onLog(-1);
              }}
              disabled={isFutureDate || !loggedToday}
            >
              <Minus size={16} />
            </button>
            <button
              aria-label='Increase count'
              className='btn-action'
              onClick={e => {
                e.stopPropagation();
                onLog(1);
                setShowTick(true);
              }}
              disabled={isFutureDate}
            >
              {showTick ? (
                <Check
                  size={16}
                  className='btn-check-flash'
                  onAnimationEnd={() => setShowTick(false)}
                />
              ) : (
                <Plus size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.progressBar} data-testid='progress-bar'>
        <div
          className={clsx(styles.progressFill, statusClass[status])}
          style={{ width: `${progressPercent}%` }}
          data-status={status}
        />
      </div>
      {habitStats && habitStats.currentStreak >= 2 && (
        <div className={styles.streak} data-testid='streak-indicator-ongoing'>
          🔥 {habitStats.currentStreak} {habit.frequency.periodUnit} streak
        </div>
      )}
      {habitStats && habitStats.streakContinuable && habitStats.previousStreak >= 2 && (
        <div
          className={clsx(styles.streak, styles.streakMuted)}
          data-testid='streak-indicator-continuable'
        >
          🔥 {habitStats.previousStreak} — {message}
        </div>
      )}
    </div>
  );
}
