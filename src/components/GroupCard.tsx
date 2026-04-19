import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import type { Completion, Habit, HabitGroup } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { getCompletionsInPeriod } from '../utils/habits';
import styles from './GroupCard.module.css';
import HabitCard from './HabitCard';

const EMPTY_COMPLETIONS: Completion[] = [];

export default function GroupCard({
  group,
  habits,
  completionsByHabitId,
}: {
  group: HabitGroup;
  habits: Habit[];
  completionsByHabitId: Map<string, Completion[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const { completions, displayDate } = useHabitContext();

  const totalTarget = habits.reduce((sum, h) => sum + h.frequency.times, 0);
  const totalCompleted = habits.reduce(
    (sum, h) => sum + getCompletionsInPeriod(h, completions, displayDate),
    0
  );
  const progressPercent = totalTarget > 0 ? Math.min(100, (totalCompleted / totalTarget) * 100) : 0;
  const allDone = totalTarget > 0 && totalCompleted >= totalTarget;

  return (
    <div className={styles.groupCard}>
      <button
        className={styles.groupHeader}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className={styles.groupChevron}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={styles.groupName}>{group.name}</span>
        <span className={styles.groupCount}>{habits.length} habits</span>
        <span className={`${styles.groupProgress} ${allDone ? styles.done : ''}`}>
          {totalCompleted}/{totalTarget}
        </span>
      </button>

      <div className={styles.groupProgressBar}>
        <div
          className={`${styles.groupProgressFill} ${allDone ? styles.done : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {expanded && (
        <div className={styles.groupHabits}>
          {habits.map((habit, index) => (
            <HabitCard
              key={habit.id}
              index={index}
              habit={habit}
              completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
              habitCompletions={completionsByHabitId.get(habit.id) ?? EMPTY_COMPLETIONS}
            />
          ))}
        </div>
      )}
    </div>
  );
}
