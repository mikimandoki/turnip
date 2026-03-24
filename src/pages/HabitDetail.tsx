import { parseISO } from 'date-fns';
import { useNavigate, useParams } from 'react-router';

import Card from '../components/Card';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate } from '../utils/date';
import { describeFrequency } from '../utils/habits';

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, stats } = useHabitContext();
  const habit = habits.find(h => h.id === id);
  const habitStats = stats.find(s => s.habitId === id);

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
              <div className='habit-card-frequency'>{describeFrequency(habit.frequency)}</div>
            </div>
            <div className='habit-card-right'>
              <button className='btn-action'>...</button>
            </div>
          </div>
          <p>Created: {namedDayOrDate(parseISO(habit.createdAt))}</p>
          <p>Current streak: {habitStats?.currentStreak}</p>
          <p>Previous streak: {habitStats?.previousStreak}</p>
          <p>Max streak: {habitStats?.maxStreak}</p>
          <p>Completion rate: {habitStats ? Math.round(habitStats.completionRate * 100) : 0}%</p>
          <p>Completed periods: {habitStats?.completedPeriods} / {habitStats?.totalPeriods}</p>        </Card>
      </div>
    </>
  );
}
