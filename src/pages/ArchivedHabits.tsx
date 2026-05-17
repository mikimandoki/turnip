import { ChevronLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import Alert from '../components/Alert';
import { HabitEmoji } from '../components/HabitEmoji';
import { useHabitContext } from '../contexts/useHabitContext';
import { calculateHabitStats, getArchiveRuns, parseHabitEmoji } from '../utils/habits';
import styles from './DailyView.module.css';

export default function ArchivedHabits() {
  const navigate = useNavigate();
  const { habits, completions, deleteHabit, restoreHabit, isHabitArchived } = useHabitContext();
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const archivedHabits = useMemo(
    () => habits.filter(h => isHabitArchived(h)),
    [habits, isHabitArchived]
  );

  function handleRestore() {
    const h = habits.find(hh => hh.id === restoreConfirmId);
    if (h) {
      void restoreHabit(h);
    }
    setRestoreConfirmId(null);
    if (archivedHabits.length <= 1) {
      void navigate('/');
    }
  }

  function handleDelete() {
    const h = habits.find(hh => hh.id === deleteConfirmId);
    if (h) {
      void deleteHabit(h);
    }
    setDeleteConfirmId(null);
  }

  return (
    <main className='app'>
      <header className='header'>
        <button
          className='btn-action'
          onClick={() => void navigate('/settings')}
          aria-label='Navigate back'
        >
          <ChevronLeft size={16} />
        </button>
        <div className='header-title header-title-centered'>
          <h1>Archive</h1>
        </div>
      </header>

      {archivedHabits.length === 0 ? (
        <div className='card'>
          <p>No archived habits.</p>
        </div>
      ) : (
        <div className={styles.habitList}>
          {archivedHabits.map(archived => {
            const runs = getArchiveRuns(archived.createdAt, archived.archiveRuns);
            const lastRunData = runs[runs.length - 1];
            const runEnd = lastRunData?.end ?? archived.createdAt;
            const runStart = lastRunData?.start ?? archived.createdAt;
            const stats = calculateHabitStats(
              archived,
              completions,
              new Date(runEnd),
              archived.archiveRuns
            );
            const { emoji, cleanName } = parseHabitEmoji(archived.name);
            return (
              <div key={archived.id} className='card'>
                <div className={styles.archivedCard}>
                  <HabitEmoji emoji={emoji} />
                  <div className={styles.archivedInfo}>
                    <div className={styles.archivedName}>{cleanName}</div>
                    <div className={styles.archivedStats}>
                      {stats.currentStreak > 0 && `${stats.currentStreak} streak`}
                      {stats.currentStreak > 0 && stats.completedPeriods > 0 && ' · '}
                      {stats.completedPeriods > 0 && `${stats.completedPeriods} completions`}
                      {stats.completedPeriods === 0 && 'No completions'}
                    </div>
                    <div className={styles.archivedDates}>
                      {runStart} – {runEnd}
                    </div>
                  </div>
                </div>
                <div className={styles.archivedActions}>
                  <button
                    className='btn-base btn-primary'
                    onClick={() => setRestoreConfirmId(archived.id)}
                    aria-label={`Restore ${cleanName}`}
                  >
                    Restore
                  </button>
                  <button
                    className='btn-base btn-ghost'
                    onClick={() => setDeleteConfirmId(archived.id)}
                    aria-label={`Delete ${cleanName}`}
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Alert
        title='Restore habit?'
        description='Your previous history is preserved but stats will restart from today.'
        confirm='Restore'
        cancel='Cancel'
        open={restoreConfirmId !== null}
        variant='primary'
        onOpenChange={open => {
          if (!open) setRestoreConfirmId(null);
        }}
        onConfirm={handleRestore}
      />

      <Alert
        title='Delete permanently?'
        description='This will remove all progress for this habit. This cannot be undone.'
        confirm='Delete'
        cancel='Cancel'
        open={deleteConfirmId !== null}
        onOpenChange={open => {
          if (!open) setDeleteConfirmId(null);
        }}
        onConfirm={handleDelete}
      />
    </main>
  );
}
