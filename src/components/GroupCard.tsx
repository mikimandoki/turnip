import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Completion, Habit, HabitGroup } from '../types';

import { useHabitContext } from '../contexts/useHabitContext';
import { useDragDropContext } from '../hooks/useDragDropContext';
import { getCompletionsInPeriod, parseHabitEmoji } from '../utils/habits';
import styles from './GroupCard.module.css';
import HabitCard from './HabitCard';
import habitCardStyles from './HabitCard.module.css';
import { HabitEmoji } from './HabitEmoji';
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
  const navigate = useNavigate();
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
  const { emoji, cleanName } = parseHabitEmoji(group.name);

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
      <div
        className={styles.groupHeader}
        onClick={() => setExpanded(x => !x)}
        role='button'
        tabIndex={0}
      >
        <span className={styles.groupChevron}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <div className={habitCardStyles.habitCardContent} style={{ flex: 1 }}>
          <HabitEmoji emoji={emoji} />
          <div className={habitCardStyles.habitCardInfo}>
            <span className={habitCardStyles.habitCardTitle}>{cleanName}</span>
            <span className={habitCardStyles.habitCardSubtitle}>
              {habits.length} {habits.length === 1 ? 'habit' : 'habits'}
            </span>
          </div>
        </div>
        <button
          className='btn-action'
          onClick={e => {
            e.stopPropagation();
            void navigate(`/group/${group.id}`);
          }}
          aria-label='Open group'
        >
          <Info size={16} />
        </button>
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
