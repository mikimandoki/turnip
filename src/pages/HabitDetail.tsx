import { parseISO } from 'date-fns';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import Card from '../components/Card';
import { HabitEmoji } from '../components/HabitEmoji';
import { useHabitContext } from '../contexts/useHabitContext';
import { namedDayOrDate } from '../utils/date';
import { describeFrequency, parseHabitEmoji } from '../utils/habits';
import { validateInputs } from '../utils/utils';

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, stats, deleteHabit, editHabit } = useHabitContext();
  const habit = habits.find(h => h.id === id);
  const habitStats = stats.find(s => s.habitId === id);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit?.name ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const { emoji, cleanName } = parseHabitEmoji(habit?.name ?? '');

  if (!habit) return <div>Habit not found</div>;

  function handleSave() {
    if (!habit) return;
    const trimmedName = editName.trim();
    const updated = { ...habit, name: trimmedName };
    const errors = validateInputs(updated);
    if (errors.length > 0) {
      setErrors(errors);
      return;
    }
    setErrors([]);
    editHabit(habit, { name: trimmedName });
    setEditName(trimmedName);
    setIsEditing(false);
  }

  function handleDelete() {
    if (!habit) return;
    if (!confirm(`Delete "${habit.name}"?`)) return;
    deleteHabit(habit);
    void navigate('/');
  }

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
            <HabitEmoji emoji={emoji} />
            <div className='habit-card-info'>
              {isEditing ? (
                <input
                  className='edit-name-input'
                  type='text'
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className='habit-card-title'>{cleanName}</div>
              )}
              {errors.map(err => (
                <p className='error-message' key={err}>
                  {err}
                </p>
              ))}
              <div className='habit-card-subtitle'>{describeFrequency(habit.frequency)}</div>
              <div className='habit-card-subtitle'>
                Created {namedDayOrDate(parseISO(habit.createdAt))}
              </div>
            </div>
            <div className='habit-card-actions'>
              {isEditing ? (
                <>
                  <button className='btn-action' onClick={handleSave}>
                    ✓
                  </button>
                  <button
                    className='btn-action'
                    onClick={() => {
                      setErrors([]);
                      setIsEditing(false);
                      setEditName(habit.name);
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <button className='btn-action' onClick={() => setIsEditing(true)}>
                    ✎
                  </button>
                  <button className='btn-action delete' onClick={handleDelete}>
                    ✕
                  </button>
                </>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <div className='stats-grid'>
            <div className='stat-box'>
              <div className='stat-value'>
                {habitStats?.streakContinuable
                  ? habitStats.previousStreak
                  : habitStats?.currentStreak}
              </div>
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
