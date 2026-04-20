import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { ChevronLeft, ChevronRight, Moon, Settings, Sun } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';

import type { Completion } from '../types';

import GroupCard from '../components/GroupCard';
import GroupDialog from '../components/GroupDialog';
import HabitCard from '../components/HabitCard';
import { useHabitContext } from '../contexts/useHabitContext';
import DevButtons from '../dev/DevButtons';
import { useGroupDrag } from '../hooks/useGroupDrag';
import { namedDayOrDate, toDateString } from '../utils/date';
import { isDevUI } from '../utils/dev';
import { applyDragReorder, getCompletionsInPeriod } from '../utils/habits';
import { getDB } from '../utils/sqlite';
import styles from './DailyView.module.css';

const EMPTY_COMPLETIONS: Completion[] = [];

export default function DailyView() {
  const navigate = useNavigate();
  const {
    habits,
    completions,
    groups,
    displayDate,
    hasOnboarded,
    reorderHabits,
    createGroup,
    shiftDate,
    setDate,
    clearAll,
    loadDemoData,
    darkMode,
    toggleDarkMode,
  } = useHabitContext();

  const visibleHabits = habits.filter(h => h.createdAt <= toDateString(displayDate));
  const standaloneHabits = visibleHabits.filter(h => !h.groupId);

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

  const groupDrag = useGroupDrag(standaloneHabits);

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
          <DragDropProvider
            onDragStart={groupDrag.onDragStart}
            onDragMove={groupDrag.onDragMove}
            onDragEnd={event => {
              groupDrag.onDragEnd(event);

              if (event.canceled) return;
              const { source } = event.operation;
              if (!isSortable(source)) return;
              const from = source.initialIndex;
              const to = source.index;
              if (from === to) return;
              const reordered = applyDragReorder(habits, standaloneHabits, from, to);
              void reorderHabits(reordered);
            }}
          >
            <div className={styles.habitList}>
              {standaloneHabits.map((habit, index) => (
                <HabitCard
                  key={habit.id}
                  index={index}
                  habit={habit}
                  completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
                  habitCompletions={completionsByHabitId.get(habit.id) ?? EMPTY_COMPLETIONS}
                  isGroupTarget={habit.id === groupDrag.groupTargetId}
                />
              ))}
            </div>
          </DragDropProvider>

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
        open={groupDrag.pendingGroup !== null}
        onConfirm={name => {
          if (!groupDrag.pendingGroup) return;
          void createGroup(name, groupDrag.pendingGroup.sourceId, groupDrag.pendingGroup.targetId);
          groupDrag.setPendingGroup(null);
        }}
        onCancel={() => groupDrag.setPendingGroup(null)}
      />
    </main>
  );
}
