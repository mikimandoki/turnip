import type { Habit } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { describeFrequency } from '../utils/habits';
import Card from './Card';

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
        <div className='streak streak-muted'>🔥 {streak.previous} — keep going!</div>
      )}
    </Card>
  );
}
