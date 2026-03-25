import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';

import Card from '../components/Card';
import HabitCard from '../components/HabitCard';
import { useHabitContext } from '../contexts/useHabitContext';
import { getCurrentDate, namedDayOrDate, toDateString } from '../utils/date';
import { getCompletionsInPeriod } from '../utils/habits';
import { HasOnboardedSchema, loadFromStorage } from '../utils/localStorage';
import AddHabitForm from './AddHabitForm';

export default function DailyView() {
  const hasOnboarded = loadFromStorage('hasOnboarded', false, HasOnboardedSchema);
  const navigate = useNavigate();
  const {
    habits,
    completions,
    displayDate,
    showForm,
    setShowForm,
    addHabit,
    updateCompletion,
    shiftDate,
    setDate,
    clearAll,
    loadDemoData,
  } = useHabitContext();

  return (
    <div className='app'>
      <div className='header'>
        <button className='btn-action' onClick={() => shiftDate(-1)}>
          <ChevronLeft size={16} />
        </button>
        <div className='header-title'>{namedDayOrDate(getCurrentDate())}</div>
        <button className='btn-action' onClick={() => shiftDate(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      {habits.length === 0 && !hasOnboarded && (
        <Card>
          <div className='onboarding'>
            <div className='habit-emoji-large'>🌱</div>
            <h2>Welcome to Turnip</h2>
            <p>Habits take time to grow. Plant your first one or explore the demo.</p>
          </div>
        </Card>
      )}

      {habits.length === 0 && hasOnboarded && (
        <Card>
          <div className='onboarding'>
            <p>No habits yet. Ready to plant something new?</p>
          </div>
        </Card>
      )}

      {habits.length > 0 && (
        <div className='habit-list'>
          {habits
            .filter(h => h.createdAt <= toDateString(getCurrentDate()))
            .map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completedCount={getCompletionsInPeriod(habit, completions, getCurrentDate())}
                targetCount={habit.frequency.times}
                onClick={() => void navigate(`/habit/${habit.id}`)}
                onPositiveButtonClick={() => updateCompletion(habit.id, 1)}
                onNegativeButtonClick={() => updateCompletion(habit.id, -1)}
              />
            ))}
        </div>
      )}

      {showForm ? (
        <AddHabitForm
          onAdd={habit => {
            addHabit(habit);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <>
          <button className='btn-add-habit' onClick={() => setShowForm(true)}>
            Add new habit
          </button>
          {!hasOnboarded && habits.length === 0 && (
            <button className='btn-add-habit' onClick={loadDemoData}>
              Explore demo data
            </button>
          )}
        </>
      )}

      {import.meta.env.DEV && (
        <>
          <div>
            <input
              type='date'
              value={displayDate}
              onChange={e => setDate(e.target.value ? e.target.value : null)}
            />
          </div>
          <div>
            <button onClick={clearAll}>Delete All</button>
          </div>
        </>
      )}
    </div>
  );
}
