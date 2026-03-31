import { useSortable } from '@dnd-kit/react/sortable';
import { BellOff, BellRing, Check, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { startDatePeriod, toDateString } from '../utils/date';
import { calculateHabitStats, describeFrequency, parseHabitEmoji } from '../utils/habits';
import { isNative, simpleHash } from '../utils/utils';
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
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={['card', isDragging ? 'dragging' : '', loggedToday ? 'logged-today' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className='habit-card-content'>
        <HabitEmoji emoji={emoji} />
        <div className='habit-card-info'>
          <div className='habit-card-title'>
            {cleanName}
            {isNative &&
              habit.notification?.enabled &&
              (osNotificationsGranted ? (
                <BellRing size={12} className='habit-card-notif-icon' />
              ) : (
                <BellOff size={12} className='habit-card-notif-icon' />
              ))}
          </div>
          <div className='habit-card-subtitle'>{describeFrequency(habit.frequency)}</div>
        </div>
        <div className='habit-card-right'>
          <span className={`completion-count ${status}`}>
            {completedCount}/{targetCount}
          </span>
          <div className='habit-card-actions'>
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
      <div className='progress-bar'>
        <div className={`progress-fill ${status}`} style={{ width: `${progressPercent}%` }} />
      </div>
      {habitStats && habitStats.currentStreak >= 2 && (
        <div className='streak'>
          🔥 {habitStats.currentStreak} {habit.frequency.periodUnit} streak
        </div>
      )}
      {habitStats && habitStats.streakContinuable && habitStats.previousStreak >= 2 && (
        <div className='streak streak-muted'>
          🔥 {habitStats.previousStreak} — {message}
        </div>
      )}
    </div>
  );
}
