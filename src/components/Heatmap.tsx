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
import { useMemo, useState } from 'react';

import type { AriaLabel, Completion, Habit } from '../types';

import { endDatePeriod, startDatePeriod, toDateString } from '../utils/date';
import { isInArchivedInterval } from '../utils/habits';
import styles from './Heatmap.module.css';

function getDayClass(
  count: number,
  times: number,
  isDailyPeriod: boolean,
  periodComplete: boolean,
  archived: boolean
): string {
  if (archived) return styles.heatmapArchived;
  if (isDailyPeriod) {
    if (count === 0) return styles.heatmapEmpty;
    const ratio = count / times;
    if (ratio >= 1) return styles.heatmapFilled;
    if (ratio >= 0.75) return styles.heatmapFill75;
    if (ratio >= 0.5) return styles.heatmapFill50;
    return styles.heatmapFill25;
  }
  if (count > 0) return styles.heatmapFilled;
  if (periodComplete) return styles.heatmapPeriodComplete;
  return styles.heatmapEmpty;
}

export default function Heatmap({
  habit,
  completions,
}: {
  habit: Habit;
  completions: Completion[];
}) {
  const today = new Date();
  const createdAt = parseISO(habit.createdAt);
  const [heatmapMonth, setHeatmapMonth] = useState(today);
  const canGoForward =
    import.meta.env.MODE === 'development' ||
    isBefore(startOfMonth(heatmapMonth), startOfMonth(today));
  const canGoBack =
    import.meta.env.MODE === 'development' ||
    isBefore(startOfMonth(createdAt), startOfMonth(heatmapMonth));
  const days = eachDayOfInterval({
    start: startOfMonth(heatmapMonth),
    end: endOfMonth(heatmapMonth),
  });

  const firstDayOfMonth = startOfMonth(heatmapMonth).getDay();
  const mondayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const padding = Array(mondayOffset).fill(null);

  const completionMap = useMemo(
    () => new Map(completions.filter(c => c.habitId === habit.id).map(c => [c.date, c.count])),
    [completions, habit.id]
  );

  const isDailyPeriod = habit.frequency.periodUnit === 'day' && habit.frequency.periodLength === 1;

  const completedPeriods = useMemo(() => {
    const set = new Set<string>();
    days.forEach(day => {
      const periodStart = startDatePeriod(habit, day);
      if (set.has(periodStart)) return;
      const periodEnd = endDatePeriod(habit, day);
      const periodTotal = Array.from(completionMap.entries())
        .filter(([date]) => date >= periodStart && date <= periodEnd)
        .reduce((sum, [, count]) => sum + count, 0);
      if (periodTotal >= habit.frequency.times) {
        set.add(periodStart);
      }
    });
    return set;
  }, [days, habit, completionMap]);

  const allDaysArchived = useMemo(
    () =>
      days.length > 0 &&
      days.every(d => {
        const ds = toDateString(d);
        return ds < habit.createdAt || isInArchivedInterval(ds, habit.archiveRuns);
      }),
    [days, habit.createdAt, habit.archiveRuns]
  );

  return (
    <>
      <div className={styles.heatmapHeader}>
        <button
          className='btn-action'
          onClick={() => setHeatmapMonth(subMonths(heatmapMonth, 1))}
          disabled={!canGoBack}
          aria-label='Previous month'
        >
          <ChevronLeft size={16} />
        </button>
        <span>{format(heatmapMonth, 'MMMM yyyy')}</span>
        <button
          className='btn-action'
          onClick={() => setHeatmapMonth(addMonths(heatmapMonth, 1))}
          disabled={!canGoForward}
          aria-label='Next month'
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {allDaysArchived && (
        <div className={styles.heatmapInactiveLabel}>Inactive period</div>
      )}
      <div className={styles.heatmap}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <div key={i} className={styles.heatmapDow}>
            {d}
          </div>
        ))}
        {padding.map((_, i) => (
          <div key={`pad-${i}`} className={`${styles.heatmapCell} ${styles.heatmapPad}`} />
        ))}
        {days.map(day => {
          const dateStr = toDateString(day);
          const count = completionMap.get(dateStr) ?? 0;
          const periodComplete = completedPeriods.has(startDatePeriod(habit, day));
          const archived = dateStr >= habit.createdAt && isInArchivedInterval(dateStr, habit.archiveRuns);
          const label =
            `${format(day, 'MMMM d')}: ${count} of ${habit.frequency.times} completion${habit.frequency.times === 1 ? '' : 's'}` as AriaLabel;
          return (
            <div
              key={dateStr}
              className={`${styles.heatmapCell} ${getDayClass(count, habit.frequency.times, isDailyPeriod, periodComplete, archived)}`}
              aria-label={label}
            >
              <span className={styles.heatmapDayNumber}>{day.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className={styles.heatmapLegend}>
        <div className={styles.heatmapLegendItem}>
          <div className={`${styles.legendSwatch} ${styles.legendSwatchActive}`} />
          <span>Active</span>
        </div>
        <div className={styles.heatmapLegendItem}>
          <div className={`${styles.legendSwatch} ${styles.legendSwatchArchived}`} />
          <span>Archived</span>
        </div>
        <div className={styles.heatmapLegendItem}>
          <div className={`${styles.legendSwatch} ${styles.legendSwatchEmpty}`} />
          <span>Not logged</span>
        </div>
      </div>
    </>
  );
}
