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
      frequency: { times: 3, periodLength: 1, periodUnit: 'week' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-2',
      name: '📖 Read',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-3',
      name: 'Meditate',
      frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-4',
      name: 'Drink water',
      frequency: { times: 8, periodLength: 1, periodUnit: 'day' },
      createdAt: daysAgo(60),
    },
    {
      id: 'demo-5',
      name: '🛌 Wash sheets',
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

    // Morning run: Mon/Wed/Fri, occasionally missed
    if ((dow === 1 || dow === 3 || dow === 5) && i % 13 !== 5) {
      completions.push({ habitId: 'demo-1', date, count: 1 });
    }

    // Read: daily, skip a few days for realism
    if (i % 8 !== 3 && i % 11 !== 7) {
      completions.push({ habitId: 'demo-2', date, count: 1 });
    }

    // Meditate: daily, slightly fewer misses
    if (i % 9 !== 2 && i % 17 !== 11) {
      completions.push({ habitId: 'demo-3', date, count: 1 });
    }

    // Drink water: 8x per day, some days fewer
    const glasses = i % 7 === 4 ? 5 : i % 5 === 3 ? 6 : 8;
    completions.push({ habitId: 'demo-4', date, count: glasses });

    // Wash sheets: once every 2 weeks on Sunday
    if (dow === 0 && i % 14 < 7) {
      completions.push({ habitId: 'demo-5', date, count: 1 });
    }
  }

  return { habits, completions };
}
