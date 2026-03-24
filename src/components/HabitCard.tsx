import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { getCurrentDate, startDatePeriod } from '../utils/date';
import { describeFrequency } from '../utils/habits';
import { simpleHash } from '../utils/utils';
import Card from './Card';

const motivationalMessages = [
  'keep going!',
  "don't break the chain!",
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

// TODO: simplify props: only habit, completedCount, onUpdate, onDelete
export default function HabitCard({
  habit,
  completedCount,
  targetCount,
  onClick,
  onPositiveButtonClick,
  onNegativeButtonClick,
  onDeleteButtonClick,
}: {
  habit: Habit;
  completedCount: number;
  targetCount: number;
  onClick: () => void;
  onPositiveButtonClick: () => void;
  onNegativeButtonClick: () => void;
  onDeleteButtonClick: () => void;
}) {
  const { isFutureDate, streaks } = useHabitContext();
  const periodStart = startDatePeriod(habit, getCurrentDate());
  const seed = simpleHash(habit.id + periodStart);
  const message = motivationalMessages[seed % motivationalMessages.length];
  const streak = streaks.find(s => s.habitId === habit.id);
  const progressPercent = Math.min(100, (completedCount / targetCount) * 100);
  const status =
    completedCount >= targetCount ? 'done' : completedCount > 0 ? 'in-progress' : 'behind';
  return (
    <Card onClick={onClick}>
      <div className='habit-card-content'>
        <div className='habit-card-info'>
          <div className='habit-card-name'>{habit.name}</div>
          <div className='habit-card-frequency'>{describeFrequency(habit.frequency)}</div>
        </div>
        <div className='habit-card-right'>
          <span className={`completion-count ${status}`}>
            {completedCount}/{targetCount}
          </span>
          <div className='habit-card-actions'>
            <button
              className='btn-action'
              onClick={e => {
                e.stopPropagation();
                onPositiveButtonClick();
              }}
              disabled={isFutureDate}
            >
              +
            </button>
            <button
              className='btn-action'
              onClick={e => {
                e.stopPropagation();
                onNegativeButtonClick();
              }}
              disabled={isFutureDate}
            >
              -
            </button>
            <button
              className='btn-action delete'
              onClick={e => {
                e.stopPropagation();
                onDeleteButtonClick();
              }}
              disabled={isFutureDate}
            >
              X
            </button>
          </div>
        </div>
      </div>
      <div className='progress-bar'>
        <div className={`progress-fill ${status}`} style={{ width: `${progressPercent}%` }} />
      </div>
      {streak && streak.current >= 2 && (
        <div className='streak'>
          🔥 {streak.current} {habit.frequency.periodUnit} streak
        </div>
      )}
      {streak && streak.current < 2 && streak.previous >= 2 && (
        <div className='streak streak-muted'>
          🔥 {streak.previous} — {message}
        </div>
      )}
    </Card>
  );
}
