import type { Completion, Habit } from '../types';

export function generateDemoData(): { habits: Habit[]; completions: Completion[] } {
  const today = new Date();

  function daysAgo(n: number): string {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  const habits: Habit[] = [
    {
      id: 'demo-1',
      name: '🏃🏻 Morning run',
      sortOrder: 0,
      frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-2',
      name: '📖 Read',
      sortOrder: 1,
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-3',
      name: 'Meditate',
      sortOrder: 2,
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-4',
      name: 'Drink water',
      sortOrder: 3,
      frequency: { times: 8, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-5',
      name: '🛌 Wash sheets',
      sortOrder: 4,
      frequency: { times: 1, periodLength: 2, periodUnit: 'week' },
      createdAt: daysAgo(60),
    },
  ];

  const completions: Completion[] = [];

  for (let i = 0; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    const dow = d.getDay();

    // Morning run: 3x/week target, any day (~43% daily)
    if (Math.random() < 0.43) completions.push({ habitId: 'demo-1', date, count: 1 });

    // Read: daily, ~85% hit rate
    if (Math.random() < 0.85) completions.push({ habitId: 'demo-2', date, count: 1 });

    // Meditate: daily, ~75% hit rate
    if (Math.random() < 0.75) completions.push({ habitId: 'demo-3', date, count: 1 });

    // Drink water: random count between 4–8
    completions.push({ habitId: 'demo-4', date, count: 4 + Math.floor(Math.random() * 5) });

    // Wash sheets: every 2 weeks, alternating Sat/Sun
    const weekNum = Math.floor(i / 7);
    const targetDow = weekNum % 4 === 0 ? 6 : weekNum % 4 === 2 ? 0 : -1;
    if (dow === targetDow) completions.push({ habitId: 'demo-5', date, count: 1 });
  }

  return { habits, completions };
}
