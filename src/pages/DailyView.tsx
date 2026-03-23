import { useNavigate } from 'react-router';

import HabitCard from '../components/HabitCard';
import { useHabitContext } from '../contexts/useHabitContext';
import { getCurrentDate, namedDayOrDate, toDateString } from '../utils/date';
import { getCompletionsInPeriod } from '../utils/habits';
import AddHabitForm from './AddHabitForm';

export default function DailyView() {
  const navigate = useNavigate();
  const {
    habits,
    completions,
    displayDate,
    showForm,
    setShowForm,
    addHabit,
    updateCompletion,
    deleteHabit,
    shiftDate,
    setDate,
    clearAll,
  } = useHabitContext();

  return (
    <div className='app'>
      <div className='header'>
        <button className='btn-action' onClick={() => shiftDate(-1)}>
          ‹
        </button>
        <div className='header-title'>{namedDayOrDate()}</div>
        <button className='btn-action' onClick={() => shiftDate(1)}>
          ›
        </button>
      </div>
      {habits.length > 0 && (
        <div className='habit-list'>
          {habits
            .filter(h => h.createdAt <= toDateString(getCurrentDate()))
            .map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completedCount={getCompletionsInPeriod(habit, completions)}
                targetCount={habit.frequency.times}
                onClick={() => void navigate(`/habit/${habit.id}`)}
                onPositiveButtonClick={() => updateCompletion(habit.id, 1)}
                onNegativeButtonClick={() => updateCompletion(habit.id, -1)}
                onDeleteButtonClick={() => deleteHabit(habit)}
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
        <button className='btn-add-habit' onClick={() => setShowForm(true)}>
          + Add new habit
        </button>
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
