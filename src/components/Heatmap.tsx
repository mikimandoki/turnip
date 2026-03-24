import { eachDayOfInterval, parseISO } from 'date-fns';

import type { Completion, Habit } from '../types';

import { getCurrentDate, toDateString } from '../utils/date';

export default function Heatmap({
  habit,
  completions,
}: {
  habit: Habit;
  completions: Completion[];
}) {
  const days = eachDayOfInterval({
    start: parseISO(habit.createdAt),
    end: getCurrentDate(),
  });

  const startDate = parseISO(habit.createdAt);
  const startDay = startDate.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = startDay === 0 ? 6 : startDay - 1;
  const padding = Array(mondayOffset).fill(null);

  const completionMap = new Map(
    completions.filter(c => c.habitId === habit.id).map(c => [c.date, c.count])
  );

  return (
    <div className='heatmap'>
      {padding.map((_, i) => (
        <div key={`pad-${i}`} className='heatmap-cell heatmap-pad' />
      ))}
      {days.map(day => {
        const dateStr = toDateString(day);
        const count = completionMap.get(dateStr) ?? 0;
        return (
          <div
            key={dateStr}
            className={`heatmap-cell ${count > 0 ? 'heatmap-filled' : 'heatmap-empty'}`}
          />
        );
      })}
    </div>
  );
}
