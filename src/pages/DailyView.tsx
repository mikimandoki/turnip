import { ChevronLeft, ChevronRight, Moon, Settings, Sun } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Completion, Habit } from '../types';

import GroupCard from '../components/GroupCard';
import GroupDialog from '../components/GroupDialog';
import HabitCard from '../components/HabitCard';
import ReorderIndicator from '../components/ReorderIndicator';
import { type SectionItem, useHabitContext } from '../contexts/useHabitContext';
import DevButtons from '../dev/DevButtons';
import { DragDropProvider } from '../hooks/useDragDrop';
import { type DropInfo, useDragDropContext } from '../hooks/useDragDropContext';
import { namedDayOrDate, toDateString } from '../utils/date';
import { isDevUI } from '../utils/dev';
import { getCompletionsInPeriod } from '../utils/habits';
import { getDB } from '../utils/sqlite';
import styles from './DailyView.module.css';

const EMPTY_COMPLETIONS: Completion[] = [];

function DailyViewInner() {
  const navigate = useNavigate();
  const { groupTargetId, reorderInsertIndex, setDropHandler, setUngroupHandler } =
    useDragDropContext();
  const {
    habits,
    completions,
    groups,
    displayDate,
    hasOnboarded,
    isHabitArchived,
    reorderItems,
    reorderWithinGroup,
    createGroup,
    addToGroup,
    removeFromGroup,
    ungroupAndReorder,
    shiftDate,
    setDate,
    clearAll,
    loadDemoData,
    darkMode,
    toggleDarkMode,
  } = useHabitContext();

  const [pendingGroup, setPendingGroup] = useState<{ sourceId: string; targetId: string } | null>(
    null
  );

  const visibleHabits = habits.filter(
    h => h.createdAt <= toDateString(displayDate) && !isHabitArchived(h)
  );
  const standaloneHabits = [...visibleHabits.filter(h => !h.groupId)].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const completionsByHabitId = useMemo(() => {
    const map = new Map<string, Completion[]>();
    for (const c of completions) {
      let arr = map.get(c.habitId);
      if (!arr) {
        arr = [];
        map.set(c.habitId, arr);
      }
      arr.push(c);
    }
    return map;
  }, [completions]);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleAddToGroup = useCallback(
    (habitId: string, groupId: string) => {
      void addToGroup(habitId, groupId);
    },
    [addToGroup]
  );

  const handleCreateGroup = useCallback((habitIdA: string, habitIdB: string) => {
    setPendingGroup({ sourceId: habitIdA, targetId: habitIdB });
  }, []);

  const handleUngroup = useCallback(
    (habitId: string) => {
      void removeFromGroup(habitId);
    },
    [removeFromGroup]
  );

  const visibleGroups = useMemo(
    () => groups.filter(g => visibleHabits.some(h => h.groupId === g.id)),
    [groups, visibleHabits]
  );

  const sections = useMemo(() => {
    const items: SectionItem[] = [];
    for (const h of standaloneHabits) {
      items.push({ type: 'habit', habit: h });
    }
    for (const g of visibleGroups) {
      items.push({ type: 'group', group: g });
    }
    items.sort((a, b) => {
      const aOrder = a.type === 'habit' ? (a.habit.sortOrder ?? 0) : (a.group.sortOrder ?? 0);
      const bOrder = b.type === 'habit' ? (b.habit.sortOrder ?? 0) : (b.group.sortOrder ?? 0);
      return aOrder - bOrder;
    });
    return items;
  }, [standaloneHabits, visibleGroups]);

  const groupHabitsMap = useMemo(() => {
    const map = new Map<string, Habit[]>();
    for (const g of visibleGroups) {
      map.set(
        g.id,
        visibleHabits.filter(h => h.groupId === g.id)
      );
    }
    return map;
  }, [visibleGroups, visibleHabits]);

  useEffect(() => {
    const handler = (info: DropInfo) => {
      const sourceData = info.sourceData;
      const targetData = info.targetData as { habitId?: string; groupId?: string };

      if (info.isOverGroup) {
        if (sourceData.type !== 'habit') return;
        if (sourceData.groupId === targetData.groupId) {
          return;
        }
        if (sourceData.groupId) {
          handleUngroup(sourceData.habitId);
        } else {
          handleAddToGroup(sourceData.habitId, targetData.groupId!);
        }
        return;
      }

      const isGapTarget = targetData.habitId?.startsWith('__gap_');

      if (isGapTarget) {
        const gapIndex = Number(targetData.habitId!.replace('__gap_', ''));
        if (sourceData.type === 'group') {
          void reorderItems(sections, sourceData.groupId, gapIndex);
        } else if (sourceData.type === 'habit') {
          if (sourceData.groupId) {
            void ungroupAndReorder(
              sourceData.habitId,
              targetData.habitId!,
              info.insertBefore ?? true
            );
          } else {
            void reorderItems(sections, sourceData.habitId, gapIndex);
          }
        }
        return;
      }

      // Source is group dropped on non-gap item
      if (sourceData.type === 'group') {
        const targetIndex = sections.findIndex(s => {
          if (targetData.habitId) return s.type === 'habit' && s.habit.id === targetData.habitId;
          if (targetData.groupId) return s.type === 'group' && s.group.id === targetData.groupId;
          return false;
        });
        if (targetIndex === -1) return;
        const gapIndex = targetIndex + (info.insertBefore ? 0 : 1);
        void reorderItems(sections, sourceData.groupId, gapIndex);
        return;
      }

      // Source is habit
      if (sourceData.type !== 'habit') return;

      if (sourceData.groupId) {
        if (
          sourceData.groupId === targetData.groupId &&
          info.dropType === 'between' &&
          info.targetData.type === 'group'
        ) {
          const targetIndex = sections.findIndex(
            s => s.type === 'group' && s.group.id === targetData.groupId
          );
          if (targetIndex !== -1) {
            const gapIndex = targetIndex + (info.insertBefore ? 0 : 1);
            void ungroupAndReorder(sourceData.habitId, `__gap_${gapIndex}`, true);
          }
        } else if (targetData.groupId && sourceData.groupId === targetData.groupId) {
          if (info.dropType === 'between') {
            reorderWithinGroup(sourceData.habitId, targetData.habitId!, info.insertBefore ?? true);
          }
        } else if (targetData.groupId && sourceData.groupId !== targetData.groupId) {
          handleAddToGroup(sourceData.habitId, targetData.groupId);
        } else if (!targetData.groupId) {
          const targetIndex = sections.findIndex(
            s => s.type === 'habit' && s.habit.id === targetData.habitId
          );
          if (targetIndex !== -1) {
            const gapIndex = targetIndex + (info.insertBefore ? 0 : 1);
            void ungroupAndReorder(sourceData.habitId, `__gap_${gapIndex}`, true);
          } else {
            handleUngroup(sourceData.habitId);
          }
        }
        return;
      }

      if (targetData.groupId && info.dropType === 'between') {
        const targetIndex = sections.findIndex(
          s => s.type === 'group' && s.group.id === targetData.groupId
        );
        if (targetIndex !== -1) {
          const gapIndex = targetIndex + (info.insertBefore ? 0 : 1);
          void reorderItems(sections, sourceData.habitId, gapIndex);
        }
        return;
      }

      if (targetData.groupId) {
        handleAddToGroup(sourceData.habitId, targetData.groupId);
        return;
      }

      if (info.dropType === 'on-top') {
        handleCreateGroup(sourceData.habitId, targetData.habitId!);
      } else {
        const targetIndex = sections.findIndex(
          s => s.type === 'habit' && s.habit.id === targetData.habitId
        );
        if (targetIndex === -1) return;
        const gapIndex = targetIndex + (info.insertBefore ? 0 : 1);
        void reorderItems(sections, sourceData.habitId, gapIndex);
      }
    };
    setDropHandler(handler);
  }, [
    setDropHandler,
    handleAddToGroup,
    handleCreateGroup,
    handleUngroup,
    ungroupAndReorder,
    reorderItems,
    reorderWithinGroup,
    sections,
  ]);

  useEffect(() => {
    setUngroupHandler(handleUngroup);
  }, [setUngroupHandler, handleUngroup]);

  useEffect(() => {
    void getDB();
  }, []);

  return (
    <main className='app'>
      <header className='header'>
        <button className='btn-action' onClick={() => shiftDate(-1)} aria-label='Previous day'>
          <ChevronLeft size={16} />
        </button>
        <div
          className={styles.headerDateBtn}
          onClick={() => {
            try {
              dateInputRef.current?.showPicker();
            } catch {
              /* Safari */
            }
          }}
        >
          <h1 className='header-title'>{namedDayOrDate(displayDate)}</h1>
          <input
            ref={dateInputRef}
            className={styles.headerDateInput}
            type='date'
            aria-label='Select date'
            value={toDateString(displayDate)}
            onChange={e => setDate(e.target.value || null)}
          />
        </div>
        <button className='btn-action' onClick={() => shiftDate(1)} aria-label='Next day'>
          <ChevronRight size={16} />
        </button>
      </header>

      {habits.length === 0 && !hasOnboarded && (
        <div className='card'>
          <div className={styles.onboarding}>
            <div className={styles.habitEmojiLarge}>🌱</div>
            <h2>Welcome to Turnip</h2>
            <p>Habits take time to grow. Plant your first one or explore the demo.</p>
          </div>
        </div>
      )}

      {habits.length === 0 && hasOnboarded && (
        <div className='card'>
          <div className={styles.onboarding}>
            <p>No habits yet. Ready to plant something new?</p>
          </div>
        </div>
      )}

      {habits.length > 0 && (
        <>
          <div className={styles.habitList}>
            {sections.map((item, index) => (
              <Fragment key={item.type === 'habit' ? item.habit.id : item.group.id}>
                {reorderInsertIndex === index && <ReorderIndicator index={index} />}
                {item.type === 'habit' ? (
                  <HabitCard
                    index={index}
                    habit={item.habit}
                    completedCount={getCompletionsInPeriod(item.habit, completions, displayDate)}
                    habitCompletions={completionsByHabitId.get(item.habit.id) ?? EMPTY_COMPLETIONS}
                  />
                ) : (
                  <GroupCard
                    group={item.group}
                    index={index}
                    habits={groupHabitsMap.get(item.group.id) ?? []}
                    completionsByHabitId={completionsByHabitId}
                    isGroupTarget={item.group.id === groupTargetId}
                  />
                )}
              </Fragment>
            ))}
            {reorderInsertIndex === sections.length && (
              <ReorderIndicator index={sections.length} isLast />
            )}
          </div>
        </>
      )}

      <div className='btn-row'>
        <button
          className={styles.btnAddHabit}
          onClick={() => void navigate('/add')}
          aria-label='Add new habit'
        >
          Add new habit
        </button>
        <button
          className='btn-action'
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          className='btn-action'
          onClick={() => void navigate('/settings')}
          aria-label='Open settings'
        >
          <Settings size={16} />
        </button>
      </div>

      {!hasOnboarded && habits.length === 0 && (
        <button className={styles.btnAddHabit} onClick={() => void loadDemoData()}>
          Explore demo data
        </button>
      )}

      {isDevUI && <DevButtons onClearAll={() => void clearAll()} />}

      <GroupDialog
        open={pendingGroup !== null}
        onConfirm={name => {
          if (!pendingGroup) return;
          void createGroup(name, pendingGroup.sourceId, pendingGroup.targetId);
          setPendingGroup(null);
        }}
        onCancel={() => setPendingGroup(null)}
      />
    </main>
  );
}

export default function DailyView() {
  return (
    <DragDropProvider>
      <DailyViewInner />
    </DragDropProvider>
  );
}
