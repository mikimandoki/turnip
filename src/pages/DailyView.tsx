import { ChevronLeft, ChevronRight, Moon, Settings, Sun } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Completion } from '../types';

import GroupCard from '../components/GroupCard';
import GroupDialog from '../components/GroupDialog';
import HabitCard from '../components/HabitCard';
import ReorderIndicator from '../components/ReorderIndicator';
import { useHabitContext } from '../contexts/useHabitContext';
import DevButtons from '../dev/DevButtons';
import { DragDropProvider } from '../hooks/useDragDrop';
import { useDragDropContext } from '../hooks/useDragDropContext';
import { namedDayOrDate, toDateString } from '../utils/date';
import { isDevUI } from '../utils/dev';
import { getCompletionsInPeriod } from '../utils/habits';
import { getDB } from '../utils/sqlite';
import styles from './DailyView.module.css';

const EMPTY_COMPLETIONS: Completion[] = [];

function DropHandler({
  onReorder,
  onAddToGroup,
  onCreateGroup,
}: {
  onReorder: (habitId: string, targetHabitId: string, insertBefore: boolean) => void;
  onAddToGroup: (habitId: string, groupId: string) => void;
  onCreateGroup: (habitIdA: string, habitIdB: string) => void;
}) {
  const { setDropHandler } = useDragDropContext();

  useEffect(() => {
    const handler = (info: {
      sourceData:
        | { type: 'group'; groupId: string }
        | { type: 'habit'; habitId: string; groupId?: string };
      targetData:
        | { type: 'group'; groupId: string }
        | { type: 'habit'; habitId: string; groupId?: string };
      isOverGroup: boolean;
      dropType: 'between' | 'on-top';
      insertBefore?: boolean;
    }) => {
      if (info.isOverGroup) {
        if (info.sourceData.type !== 'habit') return;
        const targetGroupId = (info.targetData as { groupId: string }).groupId;
        onAddToGroup(info.sourceData.habitId, targetGroupId);
        return;
      }

      if (info.sourceData.type !== 'habit' || info.targetData.type !== 'habit') return;

      if (info.dropType === 'on-top') {
        onCreateGroup(info.sourceData.habitId, info.targetData.habitId);
      } else {
        onReorder(info.sourceData.habitId, info.targetData.habitId, info.insertBefore ?? true);
      }
    };
    setDropHandler(handler);
  }, [setDropHandler, onReorder, onAddToGroup, onCreateGroup]);

  return null;
}

function UngroupHandler({ onUngroup }: { onUngroup: (habitId: string) => void }) {
  const { setUngroupHandler } = useDragDropContext();

  useEffect(() => {
    setUngroupHandler(habitId => {
      onUngroup(habitId);
    });
  }, [setUngroupHandler, onUngroup]);

  return null;
}

function DailyViewInner() {
  const navigate = useNavigate();
  const { groupTargetId, reorderInsertIndex } = useDragDropContext();
  const {
    habits,
    completions,
    groups,
    displayDate,
    hasOnboarded,
    reorderHabits,
    createGroup,
    addToGroup,
    removeFromGroup,
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

  const visibleHabits = habits.filter(h => h.createdAt <= toDateString(displayDate));
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

  const handleReorder = (sourceHabitId: string, targetHabitId: string, insertBefore: boolean) => {
    const sourceHabit = habits.find(h => h.id === sourceHabitId);
    if (!sourceHabit) return;

    let targetIndex: number;
    if (targetHabitId.startsWith('__gap_')) {
      targetIndex = Number(targetHabitId.replace('__gap_', ''));
    } else {
      const targetIdx = standaloneHabits.findIndex(h => h.id === targetHabitId);
      if (targetIdx === -1) return;
      targetIndex = insertBefore ? targetIdx : targetIdx + 1;
    }

    const sourceIdx = standaloneHabits.findIndex(h => h.id === sourceHabitId);
    if (sourceIdx === -1) return;

    const reordered = [...standaloneHabits];
    const [moved] = reordered.splice(sourceIdx, 1);
    const adjustedIdx = sourceIdx < targetIndex ? targetIndex - 1 : targetIndex;
    reordered.splice(adjustedIdx, 0, moved);

    const visibleIds = new Set(standaloneHabits.map(h => h.id));
    const final = habits.map(h => {
      if (visibleIds.has(h.id)) {
        const next = reordered.find(r => r.id === h.id);
        return next ? { ...h, sortOrder: reordered.indexOf(next) } : h;
      }
      return h;
    });

    void reorderHabits(final);
  };

  const handleAddToGroup = (habitId: string, groupId: string) => {
    void addToGroup(habitId, groupId);
  };

  const handleCreateGroup = (habitIdA: string, habitIdB: string) => {
    setPendingGroup({ sourceId: habitIdA, targetId: habitIdB });
  };

  const handleUngroup = (habitId: string) => {
    void removeFromGroup(habitId);
  };

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
          <DropHandler
            onReorder={handleReorder}
            onAddToGroup={handleAddToGroup}
            onCreateGroup={handleCreateGroup}
          />
          <UngroupHandler onUngroup={handleUngroup} />

          <div className={styles.habitList} data-drop-zone='standalone'>
            {standaloneHabits.map((habit, index) => (
              <>
                {reorderInsertIndex === index && (
                  <ReorderIndicator index={index} isLast={index === standaloneHabits.length} />
                )}
                <HabitCard
                  key={habit.id}
                  index={index}
                  habit={habit}
                  completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
                  habitCompletions={completionsByHabitId.get(habit.id) ?? EMPTY_COMPLETIONS}
                />
              </>
            ))}
            {reorderInsertIndex === standaloneHabits.length && (
              <ReorderIndicator index={standaloneHabits.length} isLast />
            )}
          </div>

          {groups.filter(g => visibleHabits.some(h => h.groupId === g.id)).length > 0 && (
            <div className={styles.habitList}>
              {groups
                .filter(g => visibleHabits.some(h => h.groupId === g.id))
                .map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    habits={visibleHabits.filter(h => h.groupId === group.id)}
                    completionsByHabitId={completionsByHabitId}
                    isGroupTarget={group.id === groupTargetId}
                  />
                ))}
            </div>
          )}
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
