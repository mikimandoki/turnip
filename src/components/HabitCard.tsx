import clsx from 'clsx';
import { BellOff, BellRing, Check, Minus, Plus } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { AriaLabel, Completion, Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { useDragDropContext } from '../hooks/useDragDropContext';
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

function HabitCard({
  habit,
  index,
  completedCount,
  habitCompletions,
}: {
  habit: Habit;
  index: number;
  completedCount: number;
  habitCompletions: Completion[];
}) {
  const [showTick, setShowTick] = useState(false);
  const navigate = useNavigate();
  const { displayDate, isFutureDate, osNotificationsGranted, updateCompletion } = useHabitContext();
  const { dragState, registerCard, groupCreateTargetId } = useDragDropContext();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    return registerCard(el, { type: 'habit', habitId: habit.id, groupId: habit.groupId });
  }, [habit.id, habit.groupId, registerCard]);

  const handleClick = useCallback(() => void navigate(`/habit/${habit.id}`), [habit.id, navigate]);
  const handleLog = useCallback(
    (delta: number) => void updateCompletion(habit.id, delta),
    [habit.id, updateCompletion]
  );
  const targetCount = habit.frequency.times;
  const loggedToday = habitCompletions.some(
    c => c.date === toDateString(displayDate) && c.count > 0
  );
  const isDragging = dragState.source?.type === 'habit' && dragState.source.habitId === habit.id;
  const isGroupCreateTarget = groupCreateTargetId === habit.id;
  const habitStats = useMemo(
    () => calculateHabitStats(habit, habitCompletions, displayDate),
    [habit, habitCompletions, displayDate]
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
      ref={cardRef}
      role='button'
      onClick={handleClick}
      className={clsx(
        'card',
        isDragging && styles.dragging,
        loggedToday && styles.loggedToday,
        isGroupCreateTarget && styles.groupTarget
      )}
      aria-label={cleanName as AriaLabel}
      data-testid='habit-card'
      data-habit-id={habit.id}
      data-habit-index={String(index)}
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
              <BellRing size={12} className={styles.habitCardNotifIcon} aria-hidden='true' />
            ) : (
              <BellOff size={12} className={styles.habitCardNotifIcon} aria-hidden='true' />
            ))}
          <span
            className={clsx(styles.completionCount, statusClass[status])}
            data-testid='completion-count'
            aria-live='polite'
            aria-atomic='true'
          >
            {completedCount}/{targetCount}
          </span>
          <div className={styles.habitCardActions}>
            <button
              aria-label='Decrease count'
              className='btn-action'
              onClick={e => {
                e.stopPropagation();
                handleLog(-1);
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
                handleLog(1);
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
      <div
        className={styles.progressBar}
        data-testid='progress-bar'
        role='progressbar'
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={targetCount}
        aria-label={`${completedCount} of ${targetCount} completions`}
      >
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

const HabitCardMemo = memo(HabitCard, (prev, next) => {
  return (
    prev.habit.id === next.habit.id &&
    prev.habit.name === next.habit.name &&
    prev.completedCount === next.completedCount &&
    prev.index === next.index &&
    prev.habitCompletions === next.habitCompletions
  );
});

export default HabitCardMemo;
