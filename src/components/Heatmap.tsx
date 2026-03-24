import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import type { Completion, Habit } from '../types';

import { endDatePeriod, startDatePeriod, toDateString } from '../utils/date';

function getDayClass(
  count: number,
  times: number,
  isDailyPeriod: boolean,
  periodComplete: boolean
): string {
  if (isDailyPeriod) {
    if (count === 0) return 'heatmap-empty';
    const ratio = count / times;
    if (ratio >= 1) return 'heatmap-filled';
    if (ratio >= 0.75) return 'heatmap-fill-75';
    if (ratio >= 0.5) return 'heatmap-fill-50';
    return 'heatmap-fill-25';
  }
  if (count > 0) return 'heatmap-filled';
  if (periodComplete) return 'heatmap-period-complete';
  return 'heatmap-empty';
}

export default function Heatmap({
  habit,
  completions,
}: {
  habit: Habit;
  completions: Completion[];
}) {
  // Heatmap is anchored in current month.
  // Don't show future date if user came from future date
  const today = new Date();
  const createdAt = parseISO(habit.createdAt);
  const [heatmapMonth, setHeatmapMonth] = useState(today);
  const canGoForward =
    import.meta.env.DEV || isBefore(startOfMonth(heatmapMonth), startOfMonth(today));
  const canGoBack =
    import.meta.env.DEV || isBefore(startOfMonth(createdAt), startOfMonth(heatmapMonth));
  const days = eachDayOfInterval({
    start: startOfMonth(heatmapMonth),
    end: endOfMonth(heatmapMonth),
  });

  const firstDayOfMonth = startOfMonth(heatmapMonth).getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const padding = Array(mondayOffset).fill(null);

  const completionMap = new Map(
    completions.filter(c => c.habitId === habit.id).map(c => [c.date, c.count])
  );

  const isDailyPeriod = habit.frequency.periodUnit === 'day' && habit.frequency.periodLength === 1;

  const completedPeriods = new Set<string>();
  days.forEach(day => {
    const periodStart = startDatePeriod(habit, day);
    if (completedPeriods.has(periodStart)) return; // already checked

    const periodEnd = endDatePeriod(habit, day);
    const periodTotal = Array.from(completionMap.entries())
      .filter(([date]) => date >= periodStart && date <= periodEnd)
      .reduce((sum, [, count]) => sum + count, 0);

    if (periodTotal >= habit.frequency.times) {
      completedPeriods.add(periodStart);
    }
  });

  return (
    <>
      <div className='heatmap-header'>
        <button
          className='btn-action'
          onClick={() => setHeatmapMonth(subMonths(heatmapMonth, 1))}
          disabled={!canGoBack}
        >
          <ChevronLeft size={16} />
        </button>
        <span>{format(heatmapMonth, 'MMMM yyyy')}</span>
        <button
          className='btn-action'
          onClick={() => setHeatmapMonth(addMonths(heatmapMonth, 1))}
          disabled={!canGoForward}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className='heatmap'>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <div key={i} className='heatmap-dow'>
            {d}
          </div>
        ))}
        {padding.map((_, i) => (
          <div key={`pad-${i}`} className='heatmap-cell heatmap-pad' />
        ))}
        {days.map(day => {
          const dateStr = toDateString(day);
          const count = completionMap.get(dateStr) ?? 0;
          const periodComplete = completedPeriods.has(startDatePeriod(habit, day));
          return (
            <div
              key={dateStr}
              className={`heatmap-cell ${getDayClass(count, habit.frequency.times, isDailyPeriod, periodComplete)}`}
            >
              <span className='heatmap-day-number'>{day.getDate()}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
