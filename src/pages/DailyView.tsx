import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { ChevronLeft, ChevronRight, Moon, Settings, Sun } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import HabitCard from '../components/HabitCard';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate, toDateString } from '../utils/date';
import { getCompletionsInPeriod } from '../utils/habits';
import { getPendingNotifications } from '../utils/localNotifications';
import { getDB } from '../utils/sqlite';
import styles from './DailyView.module.css';

async function debugNotifs() {
  const { notifications } = await getPendingNotifications();
  alert(
    notifications.length === 0
      ? 'No pending notifications'
      : notifications.map(n => `[${n.id}] "${n.title}" — ${JSON.stringify(n.schedule)}`).join('\n')
  );
}

export default function DailyView() {
  const navigate = useNavigate();
  const {
    habits,
    completions,
    displayDate,
    hasOnboarded,
    updateCompletion,
    reorderHabits,
    shiftDate,
    setDate,
    clearAll,
    loadDemoData,
    darkMode,
    toggleDarkMode,
  } = useHabitContext();
  const visibleHabits = habits.filter(h => h.createdAt <= toDateString(displayDate));
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getDB();
  }, []);

  return (
    <div className='app'>
      <div className='header'>
        <button className='btn-action' onClick={() => shiftDate(-1)}>
          <ChevronLeft size={16} />
        </button>
        <div
          className={`header-title ${styles.headerDateBtn}`}
          onClick={() => {
            try {
              dateInputRef.current?.showPicker();
            } catch {
              /* Safari */
            }
          }}
        >
          {namedDayOrDate(displayDate)}
          <input
            ref={dateInputRef}
            className={styles.headerDateInput}
            type='date'
            value={toDateString(displayDate)}
            onChange={e => setDate(e.target.value || null)}
          />
        </div>
        <button className='btn-action' onClick={() => shiftDate(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

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

      {/* TODO: extract the onDragEnd body into a standalone pure utility function
          (e.g. applyDragReorder(habits, visibleHabits, from, to) → Habit[]) so it can be
          unit-tested without mounting a component. */}
      {habits.length > 0 && (
        <DragDropProvider
          onDragEnd={event => {
            if (event.canceled) return;
            const { source } = event.operation;
            if (!isSortable(source)) return;

            const from = source.initialIndex;
            const to = source.index;
            if (from === to) return;

            // 1. Calculate the new order for ONLY the visible items
            const reorderedVisible = [...visibleHabits];
            const [movedItem] = reorderedVisible.splice(from, 1);
            reorderedVisible.splice(to, 0, movedItem);

            // 2. Map those changes back into the MASTER list
            // We keep non-visible habits where they are, and update the visible ones in place
            const visibleIds = new Set(visibleHabits.map(h => h.id));
            let visibleIdx = 0;

            const finalMasterList = habits.map(h => {
              if (visibleIds.has(h.id)) {
                return reorderedVisible[visibleIdx++];
              }
              return h;
            });

            // 3. Send the master list to the DB handler
            void reorderHabits(finalMasterList);
          }}
        >
          <div className={styles.habitList}>
            {visibleHabits.map((habit, index) => (
              // TODO: onClick and onLog are recreated every render. Wrap with useCallback (keyed
              // by habit.id) so a memoized HabitCard can skip re-renders.
              <HabitCard
                key={habit.id}
                index={index}
                habit={habit}
                completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
                onClick={() => void navigate(`/habit/${habit.id}`)}
                onLog={delta => void updateCompletion(habit.id, delta)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      <div className='btn-row'>
        <button className={styles.btnAddHabit} onClick={() => void navigate('/add')}>
          Add new habit
        </button>
        <button className='btn-action' onClick={toggleDarkMode}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className='btn-action' onClick={() => void navigate('/settings')}>
          <Settings size={16} />
        </button>
      </div>

      {!hasOnboarded && habits.length === 0 && (
        <button className={styles.btnAddHabit} onClick={() => void loadDemoData()}>
          Explore demo data
        </button>
      )}

      {/* TODO: these dev buttons (and the debugNotifs function above) are present in the
          production bundle — only the render is gated. Move them to a dev-only module so
          tree-shaking removes them entirely in production builds. */}
      {import.meta.env.MODE === 'development' && (
        <div className='btn-row'>
          <button className={styles.btnAddHabit} onClick={() => void clearAll()}>
            Delete All
          </button>
          <button className={styles.btnAddHabit} onClick={() => void debugNotifs()}>
            Debug Notifs
          </button>
        </div>
      )}
    </div>
  );
}
