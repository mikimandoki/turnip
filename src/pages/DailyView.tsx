import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import HabitCard from '../components/HabitCard';
import SettingsModal from '../components/SettingsModal';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate, toDateString } from '../utils/date';
import { getCompletionsInPeriod } from '../utils/habits';
import { getPendingNotifications } from '../utils/localNotifications';
import { getDB } from '../utils/sqlite';

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
  } = useHabitContext();

  const [showSettings, setShowSettings] = useState(false);
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
          className='header-title header-date-btn'
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
            className='header-date-input'
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
          <div className='onboarding'>
            <div className='habit-emoji-large'>🌱</div>
            <h2>Welcome to Turnip</h2>
            <p>Habits take time to grow. Plant your first one or explore the demo.</p>
          </div>
        </div>
      )}

      {habits.length === 0 && hasOnboarded && (
        <div className='card'>
          <div className='onboarding'>
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
            const reordered = [...visibleHabits];
            reordered.splice(to, 0, reordered.splice(from, 1)[0]);
            const visibleIds = new Set(visibleHabits.map(h => h.id));
            let i = 0;
            reorderHabits(habits.map(h => (visibleIds.has(h.id) ? reordered[i++] : h)));
          }}
        >
          <div className='habit-list'>
            {visibleHabits.map((habit, index) => (
              <HabitCard
                key={habit.id}
                index={index}
                habit={habit}
                completedCount={getCompletionsInPeriod(habit, completions, displayDate)}
                onClick={() => void navigate(`/habit/${habit.id}`)}
                onLog={delta => updateCompletion(habit.id, delta)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      <div className='btn-row'>
        <button className='btn-add-habit' onClick={() => void navigate('/add')}>
          Add new habit
        </button>
        <button className='btn-action' onClick={() => setShowSettings(true)}>
          <Settings size={16} />
        </button>
      </div>

      {!hasOnboarded && habits.length === 0 && (
        <button className='btn-add-habit' onClick={loadDemoData}>
          Explore demo data
        </button>
      )}

      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      {import.meta.env.MODE === 'development' && (
        <div className='btn-row'>
          <button className='btn-add-habit' onClick={clearAll}>
            Delete All
          </button>
          <button className='btn-add-habit' onClick={() => void debugNotifs()}>
            Debug Notifs
          </button>
        </div>
      )}
    </div>
  );
}
