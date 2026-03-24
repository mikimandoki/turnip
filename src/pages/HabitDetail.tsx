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
              <div className='habit-card-frequency'>
                Created {namedDayOrDate(parseISO(habit.createdAt))}
              </div>
            </div>
            <div className='habit-card-right'>
              <button className='btn-action'>...</button>
            </div>
          </div>
        </Card>
        <Card>
          <div className='stats-grid'>
            <div className='stat-box'>
              <div className='stat-value'>{habitStats?.currentStreak}</div>
              <div className='stat-label'>current streak</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>{habitStats?.maxStreak}</div>
              <div className='stat-label'>best streak</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>
                {Math.round((habitStats?.completionRate ?? 0) * 100)}%
              </div>
              <div className='stat-label'>completion rate</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>{habitStats?.completedPeriods}</div>
              <div className='stat-label'>total completions</div>
            </div>
          </div>
        </Card>
        <Card>
          <p style={{ color: 'var(--color-text-secondary)' }}>Heatmap coming soon</p>
        </Card>
      </div>
    </>
  );
}
