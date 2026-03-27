import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Dialog } from 'radix-ui';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import AddHabitModal from '../components/AddHabitModal';
import HabitCard from '../components/HabitCard';
import SettingsModal from '../components/SettingsModal';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate, toDateString } from '../utils/date';
import { getCompletionsInPeriod } from '../utils/habits';
import { HasOnboardedSchema, loadFromStorage } from '../utils/localStorage';

export default function DailyView() {
  const hasOnboarded = loadFromStorage('hasOnboarded', false, HasOnboardedSchema);
  const navigate = useNavigate();
  const {
    habits,
    completions,
    displayDate,
    addHabit,
    updateCompletion,
    reorderHabits,
    shiftDate,
    setDate,
    clearAll,
    loadDemoData,
  } = useHabitContext();

  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const visibleHabits = habits.filter(h => h.createdAt <= toDateString(displayDate));
  const dateInputRef = useRef<HTMLInputElement>(null);

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
                targetCount={habit.frequency.times}
                loggedToday={completions.some(
                  c => c.habitId === habit.id && c.date === toDateString(displayDate) && c.count > 0
                )}
                onClick={() => void navigate(`/habit/${habit.id}`)}
                onPositiveButtonClick={() => updateCompletion(habit.id, 1)}
                onNegativeButtonClick={() => updateCompletion(habit.id, -1)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      <div className='btn-row'>
        <button className='btn-add-habit' onClick={() => setShowForm(true)}>
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

      <Dialog.Root open={showForm} onOpenChange={setShowForm}>
        <Dialog.Portal>
          <Dialog.Overlay className='modal-overlay' />
          <Dialog.Content className='modal-content'>
            <Dialog.Title className='modal-title'>New habit</Dialog.Title>
            <AddHabitModal
              onAdd={({ name, frequency }) => {
                addHabit({ id: nanoid(), name, frequency, createdAt: toDateString(displayDate) });
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />

      {import.meta.env.DEV && (
        <div>
          <button onClick={clearAll}>Delete All</button>
        </div>
      )}
    </div>
  );
}
