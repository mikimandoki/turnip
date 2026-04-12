import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { ChevronLeft, ChevronRight, Moon, Settings, Sun } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import HabitCard from '../components/HabitCard';
import { useHabitContext } from '../contexts/useHabitContext';
import DevButtons from '../dev/DevButtons';
import { namedDayOrDate, toDateString } from '../utils/date';
import { isDevUI } from '../utils/dev';
import { applyDragReorder, getCompletionsInPeriod } from '../utils/habits';
import { getDB } from '../utils/sqlite';
import styles from './DailyView.module.css';

export default function DailyView() {
  const navigate = useNavigate();
  const {
    habits,
    completions,
    displayDate,
    hasOnboarded,
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
        <button className='btn-action' onClick={() => shiftDate(-1)} aria-label='Previous day'>
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
        <button className='btn-action' onClick={() => shiftDate(1)} aria-label='Next day'>
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

      {habits.length > 0 && (
        <DragDropProvider
          onDragEnd={event => {
            if (event.canceled) return;
            const { source } = event.operation;
            if (!isSortable(source)) return;

            const from = source.initialIndex;
            const to = source.index;
            if (from === to) return;

            const reordered = applyDragReorder(habits, visibleHabits, from, to);
            void reorderHabits(reordered);
          }}
        >
          <div className={styles.habitList}>
            {visibleHabits.map((habit, index) => (
              <HabitCard
                key={habit.id}
                index={index}
                habit={habit}
                completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
              />
            ))}
          </div>
        </DragDropProvider>
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
    </div>
  );
}
