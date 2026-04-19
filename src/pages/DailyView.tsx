import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { ChevronLeft, ChevronRight, Moon, Settings, Sun } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Completion } from '../types';

import GroupCard from '../components/GroupCard';
import GroupDialog from '../components/GroupDialog';
import HabitCard from '../components/HabitCard';
import { useHabitContext } from '../contexts/useHabitContext';
import DevButtons from '../dev/DevButtons';
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

  // --- Group-hover DnD detection ---
  // The id whose card currently has the group-hover ring
  const groupTargetId = useRef<string | null>(null);
  // Tracks which card we're hovering over (before dwell timer fires)
  const pendingGroupTargetId = useRef<string | null>(null);
  const groupHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const draggingSourceId = useRef<string | null>(null);
  // Original card rects captured at drag start (before sort-preview transforms move cards around)
  const cardRects = useRef<Map<string, DOMRect>>(new Map());
  // Kept in sync with standaloneHabits so the onDragMove handler can read it
  const standaloneHabitIds = useRef(new Set<string>());
  useEffect(() => {
    standaloneHabitIds.current = new Set(standaloneHabits.map(h => h.id));
  }, [standaloneHabits]);

  const [pendingGroup, setPendingGroup] = useState<{ sourceId: string; targetId: string } | null>(
    null
  );

  function handleDragMove(pointerX: number, pointerY: number) {
    const sourceId = draggingSourceId.current;
    if (!sourceId) return;

    // Check pointer against ORIGINAL card rects (pre-drag-start, before sort-preview transforms).
    // This correctly ignores cards that dnd-kit moved via sort preview — the user has to drag
    // their card to where the target card originally was, not to where sort preview moved it.
    let targetId: string | null = null;
    for (const [id, rect] of cardRects.current) {
      if (id === sourceId || !standaloneHabitIds.current.has(id)) continue;
      if (pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom) {
        targetId = id;
        break;
      }
    }

    if (targetId === pendingGroupTargetId.current) return; // same card, timer already running

    // Target changed — reset timer and ring
    if (groupHoverTimer.current) {
      clearTimeout(groupHoverTimer.current);
      groupHoverTimer.current = null;
    }
    if (groupTargetId.current) {
      document
        .querySelector(`[data-habit-id="${groupTargetId.current}"]`)
        ?.classList.remove('group-hover-target');
      groupTargetId.current = null;
    }
    pendingGroupTargetId.current = targetId;

    if (!targetId) return;

    // Show ring only after 400ms of continuous hover — prevents accidental group on quick sort drags
    groupHoverTimer.current = setTimeout(() => {
      if (pendingGroupTargetId.current !== targetId) return;
      groupTargetId.current = targetId;
      document.querySelector(`[data-habit-id="${targetId}"]`)?.classList.add('group-hover-target');
      console.log('[group-dnd] ring ON', targetId);
    }, 400);
  }

  function clearGroupHover() {
    if (groupHoverTimer.current) {
      clearTimeout(groupHoverTimer.current);
      groupHoverTimer.current = null;
    }
    pendingGroupTargetId.current = null;
    if (groupTargetId.current) {
      document
        .querySelector(`[data-habit-id="${groupTargetId.current}"]`)
        ?.classList.remove('group-hover-target');
      groupTargetId.current = null;
    }
  }

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
            onDragMove={event => {
              const { x, y } = event.operation.position.current;
              handleDragMove(x, y);
            }}
            onDragStart={event => {
              isDragging.current = true;
              draggingSourceId.current = (event.operation.source?.id as string | null) ?? null;
              cardRects.current.clear();
              document.querySelectorAll<HTMLElement>('[data-habit-id]').forEach(el => {
                const id = el.dataset.habitId;
                if (id) cardRects.current.set(id, el.getBoundingClientRect());
              });
            }}
            onDragEnd={event => {
              isDragging.current = false;
              draggingSourceId.current = null;

              const targetId = groupTargetId.current;
              console.log(
                '[group-dnd] dragend groupTarget=',
                targetId,
                'canceled=',
                event.canceled
              );
              clearGroupHover();

              if (targetId && !event.canceled) {
                const sourceId = event.operation.source?.id as string | undefined;
                if (sourceId && sourceId !== targetId) {
                  setPendingGroup({ sourceId, targetId });
                  return;
                }
              }

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
