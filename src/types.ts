// A habit the user wants to track
export interface Habit {
  id: string;
  name: string;
  frequency: Frequency;
  createdAt: string; // ISO date string
}

// How often the habit should be done
// "times" completions per "period" of "periodLength" days/weeks/months
//
// Examples:
//   Every day:              { times: 1, periodLength: 1, periodUnit: "day" }
//   3x per week:            { times: 3, periodLength: 1, periodUnit: "week" }
//   Every 2 weeks:          { times: 1, periodLength: 2, periodUnit: "week" }
//   5x every 3 weeks:       { times: 5, periodLength: 3, periodUnit: "week" }
//   10x per month:          { times: 10, periodLength: 1, periodUnit: "month" }
export interface Frequency {
  times: number;
  periodLength: number;
  periodUnit: 'day' | 'month' | 'week';
}

// A single completion of a habit
export interface Completion {
  habitId: string;
  date: string; // ISO date string, e.g. "2026-03-19"
}
