import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { namedDayOrDateShort } from '../utils/date';
import PeriodTimeline from './PeriodTimeline';

describe('PeriodTimeline', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns null for daily habits', () => {
    const { container } = render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 1, periodUnit: 'day' }}
        startDate='2026-04-01'
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('weekly habit starting Wednesday: period 1 is Wed-Tue, period 2 is next Wed-Tue', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 1, periodUnit: 'week' }}
        startDate='2026-03-25'
      />
    );
    expect(screen.getByText('First week')).toBeInTheDocument();
    expect(screen.getByText('Second week')).toBeInTheDocument();
    const p1 = namedDayOrDateShort('2026-03-25') + ' - ' + namedDayOrDateShort('2026-03-31');
    const p2 = namedDayOrDateShort('2026-04-01') + ' - ' + namedDayOrDateShort('2026-04-07');
    expect(screen.getByText(p1)).toBeInTheDocument();
    expect(screen.getByText(p2)).toBeInTheDocument();
  });

  it('monthly habit starting March 17: period 1 is Mar 17-Apr 16, period 2 is Apr 17-May 16', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 1, periodUnit: 'month' }}
        startDate='2026-03-17'
      />
    );
    expect(screen.getByText('First month')).toBeInTheDocument();
    expect(screen.getByText('Second month')).toBeInTheDocument();
    const p1 = namedDayOrDateShort('2026-03-17') + ' - ' + namedDayOrDateShort('2026-04-16');
    const p2 = namedDayOrDateShort('2026-04-17') + ' - ' + namedDayOrDateShort('2026-05-16');
    expect(screen.getByText(p1)).toBeInTheDocument();
    expect(screen.getByText(p2)).toBeInTheDocument();
  });

  it('2-week habit starting March 17: period 1 is Mar 17-Mar 30, period 2 is Mar 31-Apr 13', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 2, periodUnit: 'week' }}
        startDate='2026-03-17'
      />
    );
    expect(screen.getByText('First period')).toBeInTheDocument();
    expect(screen.getByText('Second period')).toBeInTheDocument();
    const p1 = namedDayOrDateShort('2026-03-17') + ' - ' + namedDayOrDateShort('2026-03-30');
    const p2 = namedDayOrDateShort('2026-03-31') + ' - ' + namedDayOrDateShort('2026-04-13');
    expect(screen.getByText(p1)).toBeInTheDocument();
    expect(screen.getByText(p2)).toBeInTheDocument();
  });

  it('shows completion copy for 1x week', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 1, periodUnit: 'week' }}
        startDate='2026-03-25'
      />
    );
    expect(
      screen.getByText('Complete 1 time per week to maintain your streak.')
    ).toBeInTheDocument();
  });

  it('shows completion copy for 3x week', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 3, periodLength: 1, periodUnit: 'week' }}
        startDate='2026-03-25'
      />
    );
    expect(
      screen.getByText('Complete 3 times per week to maintain your streak.')
    ).toBeInTheDocument();
  });

  it('shows completion copy for 1x per 2 days', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 2, periodUnit: 'day' }}
        startDate='2026-03-25'
      />
    );
    expect(
      screen.getByText('Complete 1 time per 2 days to maintain your streak.')
    ).toBeInTheDocument();
  });

  it('shows future warning for upcoming start date', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 1, periodUnit: 'week' }}
        startDate='2026-04-05'
      />
    );
    expect(screen.getByText('Starts in 4 days')).toBeInTheDocument();
    expect(
      screen.getByText("ℹ️ This habit won't appear in your daily view until the start date.")
    ).toBeInTheDocument();
  });

  it('shows "Starts tomorrow" for tomorrow', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 1, periodUnit: 'week' }}
        startDate='2026-04-02'
      />
    );
    expect(screen.getByText('Starts tomorrow')).toBeInTheDocument();
  });

  it('shows the title', () => {
    render(
      <PeriodTimeline
        frequency={{ times: 1, periodLength: 1, periodUnit: 'week' }}
        startDate='2026-03-25'
      />
    );
    expect(screen.getByText('Your first periods')).toBeInTheDocument();
  });
});
