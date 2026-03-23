import { useNavigate, useParams } from 'react-router';

import Card from '../components/Card';
import { useHabitContext } from '../contexts/useHabitContext';
import { calculateStreak, getCompletionsInPeriod } from '../utils/habits';

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, completions } = useHabitContext();
  const habit = habits.find(h => h.id === id);

  if (!habit) return <div>Habit not found</div>;

  return (
    <>
      <div className='app'>
        <div className='header'>
          <button className='btn-action' onClick={() => void navigate('/')}>
            ‹
          </button>
        </div>
        <Card>
          <div className='habit-card-content'>
            <div className='habit-card-info'>
              <div className='habit-card-name'>{habit.name}</div>
              <p>
                Frequency: {habit.frequency.times}x per {habit.frequency.periodLength}{' '}
                {habit.frequency.periodUnit}(s)
              </p>
              <p>Created: {habit.createdAt}</p>
              <p>Current streak: {calculateStreak(habit, completions)}</p>
              <p>Completions in period: {getCompletionsInPeriod(habit, completions)}</p>
              <p>Target: {habit.frequency.times}</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
