import { format, startOfMonth, startOfWeek } from 'date-fns';

import type { ArchiveRun, Completion, Habit, HabitGroup } from '../types';

export function generateDemoData(
  weekStartsOn: 0 | 1 = 1
): { habits: Habit[]; completions: Completion[]; groups: HabitGroup[] } {
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return format(d, 'yyyy-MM-dd');
  }

  function firstDayOfWeekAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return format(startOfWeek(d, { weekStartsOn }), 'yyyy-MM-dd');
  }

  function firstOfMonthAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return format(startOfMonth(d), 'yyyy-MM-dd');
  }

  const archivedAt = daysAgo(30);
  const restoredAt = daysAgo(15);
  const archiveRun: ArchiveRun = { archivedAt, restoredAt };

  const groups: HabitGroup[] = [
    { id: 'demo-group-1', name: '🌅 Morning routine', sortOrder: 0 },
  ];

  const habits: Habit[] = [
    {
      id: 'demo-1',
      name: '🏃🏻 Morning run',
      sortOrder: 0,
      frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
      createdAt: daysAgo(60),
      startDate: firstDayOfWeekAgo(60),
      groupId: 'demo-group-1',
    },
    {
      id: 'demo-2',
      name: '📖 Read',
      sortOrder: 1,
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
      startDate: daysAgo(60),
    },
    {
      id: 'demo-3',
      name: '🎸 Guitar lesson',
      sortOrder: 2,
      frequency: { times: 6, periodLength: 1, periodUnit: 'month' },
      createdAt: daysAgo(60),
      startDate: firstOfMonthAgo(60),
    },
    {
      id: 'demo-4',
      name: '💧 Drink water',
      sortOrder: 3,
      frequency: { times: 8, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
      startDate: daysAgo(60),
    },
    {
      id: 'demo-5',
      name: '🛌 Wash sheets',
      sortOrder: 4,
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: daysAgo(60),
      startDate: firstDayOfWeekAgo(60),
    },
    {
      id: 'demo-6',
      name: '💊 Vitamins',
      sortOrder: 5,
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
      startDate: daysAgo(60),
      groupId: 'demo-group-1',
      archiveRuns: [archiveRun],
    },
  ];

  const completions: Completion[] = [];

  for (let i = 0; i <= 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = format(d, 'yyyy-MM-dd');
    const dow = d.getDay();

    // Morning run: 3x/week target, any day (~43% daily)
    if (Math.random() < 0.43) completions.push({ habitId: 'demo-1', date, count: 1 });

    // Read: daily, ~85% hit rate
    if (Math.random() < 0.85) completions.push({ habitId: 'demo-2', date, count: 1 });

    // Guitar lesson: 6x per month
    const monthKey = date.slice(0, 7);
    const monthlyCompletions = completions.filter(
      c => c.habitId === 'demo-3' && c.date.startsWith(monthKey)
    ).length;
    if (monthlyCompletions < 7 && Math.random() < 0.35) {
      completions.push({ habitId: 'demo-3', date, count: 1 });
    }

    // Drink water: random count between 4–8 (always logged)
    completions.push({ habitId: 'demo-4', date, count: 4 + Math.floor(Math.random() * 5) });

    // Wash sheets: every 2 weeks, alternating Sat/Sun
    const weekNum = Math.floor(i / 7);
    const targetDow = weekNum % 4 === 0 ? 6 : weekNum % 4 === 2 ? 0 : -1;
    if (dow === targetDow) completions.push({ habitId: 'demo-5', date, count: 1 });

    // Vitamins: archived for ~14 days mid-run (days 30-16 ago are archived)
    const daysAgoFromToday = i;
    if (daysAgoFromToday > 30 && daysAgoFromToday <= 60) {
      if (Math.random() < 0.8) completions.push({ habitId: 'demo-6', date, count: 1 });
    }
    if (daysAgoFromToday >= 0 && daysAgoFromToday < 15) {
      if (Math.random() < 0.8) completions.push({ habitId: 'demo-6', date, count: 1 });
    }
    if (daysAgoFromToday === 30 || daysAgoFromToday === 15) {
      if (Math.random() < 0.8) completions.push({ habitId: 'demo-6', date, count: 1 });
    }
  }

  return { habits, completions, groups };
}
