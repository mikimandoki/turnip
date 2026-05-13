import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

import type { Completion, Habit, HabitGroup } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { useDragDropContext } from '../hooks/useDragDropContext';
import { getCompletionsInPeriod } from '../utils/habits';
import styles from './GroupCard.module.css';
import HabitCard from './HabitCard';
import indicatorStyles from './ReorderIndicator.module.css';

const EMPTY_COMPLETIONS: Completion[] = [];

export default function GroupCard({
  group,
  habits,
  completionsByHabitId,
  isGroupTarget,
  index,
}: {
  group: HabitGroup;
  habits: Habit[];
  completionsByHabitId: Map<string, Completion[]>;
  isGroupTarget?: boolean;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { completions, displayDate } = useHabitContext();
  const { registerCard, groupTargetId, groupReorderGroupId, groupReorderIndex, dragState } =
    useDragDropContext();

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

  const isGroupReorderActive =
    dragState.isActive &&
    dragState.source?.type === 'habit' &&
    dragState.source.groupId === group.id;
  return (
    <div
      className={`${styles.groupCard} ${isGroupTarget || groupTargetId === group.id ? styles.groupTarget : ''}`}
      data-group-id={group.id}
      data-group-card={group.id}
      data-habit-index={index}
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
          {sortedHabits.map((habit, idx) => (
            <Fragment key={habit.id}>
              {isGroupReorderActive &&
                groupReorderGroupId === group.id &&
                groupReorderIndex === idx &&
                dragState.isActive && <div className={indicatorStyles.groupLine} />}
              <HabitCard
                habit={habit}
                index={idx}
                completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
                habitCompletions={completionsByHabitId.get(habit.id) ?? EMPTY_COMPLETIONS}
              />
            </Fragment>
          ))}
          {isGroupReorderActive &&
            groupReorderGroupId === group.id &&
            (groupReorderIndex === sortedHabits.length || groupReorderIndex === 999) &&
            dragState.isActive && <div className={indicatorStyles.groupLine} />}
        </div>
      )}
    </div>
  );
}
