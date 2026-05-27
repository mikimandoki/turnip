import { addDays, parseISO, startOfDay } from 'date-fns';
import { ArrowRight } from 'lucide-react';

import type { Frequency } from '../types';

import { endDatePeriod, namedDayOrDateShort, startDatePeriod, toDateString } from '../utils/date';
import styles from './PeriodTimeline.module.css';

function startOfDate(date: Date): Date {
  return startOfDay(date);
}

interface PeriodTimelineProps {
  frequency: Frequency;
  startDate: string;
}

export default function PeriodTimeline({ frequency, startDate }: PeriodTimelineProps) {
  const today = new Date();
  const todayStr = toDateString(today);
  const start = parseISO(startDate);
  const isFuture = startDate > todayStr;
  // Calculate days using date strings to avoid time component issues
  const daysUntilStart = Math.floor(
    (startOfDate(start).getTime() - startOfDate(today).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Don't show timeline for daily habits
  if (frequency.periodUnit === 'day' && frequency.periodLength === 1) {
    return null;
  }

  const habitForPeriodCalc = {
    startDate,
    frequency,
  };

  const period1Start = startDatePeriod(habitForPeriodCalc, start);
  const period1End = endDatePeriod(habitForPeriodCalc, parseISO(period1Start));

  const period2Start = startDatePeriod(habitForPeriodCalc, addDays(parseISO(period1End), 1));
  const period2End = endDatePeriod(habitForPeriodCalc, parseISO(period2Start));

  function getPeriodLabel(index: number): string {
    if (frequency.periodUnit === 'week' && frequency.periodLength === 1) {
      return index === 0 ? 'First week' : 'Second week';
    }
    if (frequency.periodUnit === 'month' && frequency.periodLength === 1) {
      return index === 0 ? 'First month' : 'Second month';
    }
    return index === 0 ? 'First period' : 'Second period';
  }

  function getCompletionCopy(): string {
    const times = frequency.times === 1 ? '1 time' : `${frequency.times} times`;
    const period =
      frequency.periodLength === 1
        ? frequency.periodUnit
        : `${frequency.periodLength} ${frequency.periodUnit}s`;
    return `Complete ${times} per ${period} to maintain your streak.`;
  }

  const futureLabel = isFuture
    ? daysUntilStart === 1
      ? 'Starts tomorrow'
      : `Starts in ${daysUntilStart} days`
    : null;

  return (
    <div className={styles.periodTimeline}>
      <div className={styles.periodTimelineHeader}>
        <span className={styles.periodTimelineTitle}>Your first periods</span>
        {futureLabel && <span className={styles.periodTimelineFutureWarning}>{futureLabel}</span>}
      </div>

      <div className={styles.periodTimelineContent}>
        <div className={styles.periodTimelineRow}>
          <div className={styles.periodBlock}>
            <div className={styles.periodLabel}>{getPeriodLabel(0)}</div>
            <div
              className={styles.periodDates}
            >{`${namedDayOrDateShort(period1Start)} - ${namedDayOrDateShort(period1End)}`}</div>
          </div>
          <div className={styles.periodBlock}>
            <div className={styles.periodLabel}>{getPeriodLabel(1)}</div>
            <div
              className={styles.periodDates}
            >{`${namedDayOrDateShort(period2Start)} - ${namedDayOrDateShort(period2End)}`}</div>
          </div>
          <div className={styles.periodContinues}>
            <ArrowRight size={16} />
          </div>
        </div>
      </div>

      <div className={styles.periodTimelineFooter}>
        <span className={styles.periodTimelineCompletion}>{getCompletionCopy()}</span>
        {isFuture && (
          <span className={styles.periodTimelineFutureNote}>
            ℹ️ This habit won't appear in your daily view until the start date.
          </span>
        )}
      </div>
    </div>
  );
}
