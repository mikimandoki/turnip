import type { Habit } from '../types';

import { describeFrequency } from '../utils/habits';

// TODO: simplify props: only habit, completedCount, onUpdate, onDelete
export default function HabitCard({
  habit,
  completedCount,
  targetCount,
  streak,
  onPositiveButtonClick,
  onNegativeButtonClick,
  onDeleteButtonClick,
}: {
  habit: Habit;
  completedCount: number;
  targetCount: number;
  streak: number;
  onPositiveButtonClick: () => void;
  onNegativeButtonClick: () => void;
  onDeleteButtonClick: () => void;
}) {
  const progressPercent = Math.min(100, (completedCount / targetCount) * 100);
  const status =
    completedCount >= targetCount ? 'done' : completedCount > 0 ? 'in-progress' : 'behind';
  return (
    <>
      <div className='habit-card'>
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
              <button className='btn-action' onClick={onPositiveButtonClick}>
                +
              </button>
              <button className='btn-action' onClick={onNegativeButtonClick}>
                -
              </button>
              <button className='btn-action delete' onClick={onDeleteButtonClick}>
                X
              </button>
            </div>
          </div>
        </div>
        <div className='progress-bar'>
          <div className={`progress-fill ${status}`} style={{ width: `${progressPercent}%` }} />
        </div>
        {streak >= 2 && (
          <div className='streak'>
            🔥 {streak} {habit.frequency.periodUnit} streak
          </div>
        )}
      </div>
    </>
  );
}
