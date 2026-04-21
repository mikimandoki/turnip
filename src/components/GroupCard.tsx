import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Completion, Habit, HabitGroup } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { useDragDropContext } from '../hooks/useDragDropContext';
import { getCompletionsInPeriod } from '../utils/habits';
import styles from './GroupCard.module.css';
import HabitCard from './HabitCard';

const EMPTY_COMPLETIONS: Completion[] = [];

export default function GroupCard({
  group,
  habits,
  completionsByHabitId,
  isGroupTarget,
}: {
  group: HabitGroup;
  habits: Habit[];
  completionsByHabitId: Map<string, Completion[]>;
  isGroupTarget?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { completions, displayDate } = useHabitContext();
  const { registerCard, groupTargetId } = useDragDropContext();

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-group-card="${group.id}"]`);
    if (!el) return;
    return registerCard(el, { type: 'group', groupId: group.id });
  }, [group.id, registerCard]);

  const sortedHabits = [...habits].sort((a, b) => a.sortOrder - b.sortOrder);

  const totalTarget = habits.reduce((sum, h) => sum + h.frequency.times, 0);
  const totalCompleted = habits.reduce(
    (sum, h) => sum + getCompletionsInPeriod(h, completions, displayDate),
    0
  );
  const progressPercent = totalTarget > 0 ? Math.min(100, (totalCompleted / totalTarget) * 100) : 0;
  const allDone = totalTarget > 0 && totalCompleted >= totalTarget;

  return (
    <div
      className={`${styles.groupCard} ${isGroupTarget || groupTargetId === group.id ? styles.groupTarget : ''}`}
      data-group-id={group.id}
      data-group-card={group.id}
    >
      <button
        className={styles.groupHeader}
        data-group-header-id={group.id}
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
          {sortedHabits.map((habit, index) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              index={index}
              completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
              habitCompletions={completionsByHabitId.get(habit.id) ?? EMPTY_COMPLETIONS}
            />
          ))}
        </div>
      )}
    </div>
  );
}
