import { Check, ChevronLeft, Pencil, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import Alert from '../components/Alert';
import { HabitEmoji } from '../components/HabitEmoji';
import { useHabitContext } from '../contexts/useHabitContext';
import {
  calculateGroupStats,
  calculateHabitStats,
  getTotalCompletions,
  parseHabitEmoji,
  validateGroupName,
} from '../utils/habits';
import styles from './GroupDetail.module.css';
import habitStyles from './HabitDetail.module.css';

const groupPlaceholders = [
  '📁 Health habits',
  '🏃 Fitness',
  '📚 Learning',
  '🧘 Mindfulness',
  '💼 Work',
  '🎨 Creative',
  '🌿 Self care',
  '🏠 Home',
];

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groups, habits, completions, editGroup, deleteGroup } = useHabitContext();
  const group = groups.find(g => g.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group ? parseHabitEmoji(group.name).cleanName : '');
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [placeholder] = useState(
    () => groupPlaceholders[Math.floor(Math.random() * groupPlaceholders.length)]
  );

  const groupStats = useMemo(
    () => (group ? calculateGroupStats(group, habits, completions, new Date()) : null),
    [group, habits, completions]
  );

  const memberHabits = useMemo(
    () => (group ? habits.filter(h => h.groupId === group.id) : []),
    [group, habits]
  );

  const totalTimesLogged = useMemo(
    () => memberHabits.reduce((sum, h) => sum + getTotalCompletions(h, completions, new Date()), 0),
    [memberHabits, completions]
  );

  if (!group) return <div>Group not found</div>;

  const { emoji, cleanName } = parseHabitEmoji(group.name);

  const grp = group;

  return (
    <>
      <main className='app'>
        <header className='header'>
          <button className='btn-action' onClick={() => void navigate('/')} aria-label='Go back'>
            <ChevronLeft size={16} />
          </button>
        </header>
        <div className='card'>
          <div className={habitStyles.habitCardContent}>
            <HabitEmoji emoji={emoji} />
            <div className={habitStyles.habitCardInfo}>
              {isEditing ? (
                <input
                  className={habitStyles.editNameInput}
                  type='text'
                  value={editName}
                  onChange={e => {
                    setEditName(e.target.value);
                    setErrors([]);
                  }}
                  placeholder={placeholder}
                  aria-label='Group name input'
                />
              ) : (
                <h1 className={habitStyles.habitCardTitle}>{cleanName}</h1>
              )}
              {errors.map(err => (
                <p className='error-message' key={err} role='alert'>
                  {err}
                </p>
              ))}
              <div className={habitStyles.habitCardSubtitle}>
                {memberHabits.length} {memberHabits.length === 1 ? 'habit' : 'habits'}
              </div>
            </div>
            <div className={habitStyles.habitCardActions}>
              {isEditing ? (
                <>
                  <button
                    className='btn-action'
                    onClick={() => {
                      void (async () => {
                        const fullName = editName.trim();
                        const withEmoji = emoji !== '🌱' ? `${emoji} ${fullName}` : fullName;
                        const inputErrors = validateGroupName(withEmoji);
                        if (inputErrors.length > 0) {
                          setErrors(inputErrors);
                          return;
                        }
                        setErrors([]);
                        await editGroup(grp.id, { name: withEmoji });
                        setIsEditing(false);
                      })();
                    }}
                    aria-label='Save edits'
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className='btn-action'
                    aria-label='Cancel edits'
                    onClick={() => {
                      setEditName(cleanName);
                      setErrors([]);
                      setIsEditing(false);
                    }}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className='btn-action'
                    onClick={() => {
                      setEditName(cleanName);
                      setIsEditing(true);
                    }}
                    aria-label='Edit group'
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className='btn-action delete'
                    onClick={() => setDeleteOpen(true)}
                    aria-label='Delete group'
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className='card'>
          <div className={habitStyles.statsGrid}>
            <div className={habitStyles.statBox}>
              <div className={habitStyles.statValue}>{totalTimesLogged}</div>
              <div className={habitStyles.statLabel}>total times logged</div>
            </div>
            <div className={habitStyles.statBox}>
              <div className={habitStyles.statValue}>
                {Math.round((groupStats?.completionRate ?? 0) * 100)}%
              </div>
              <div className={habitStyles.statLabel}>average completion rate</div>
            </div>
          </div>
        </div>
        <div className='card'>
          <h1 className={habitStyles.habitCardTitle}>Members</h1>
          <div className={styles.memberList}>
            {memberHabits.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                No habits in this group yet.
              </p>
            ) : (
              memberHabits.map(h => {
                const { emoji: hEmoji, cleanName: hCleanName } = parseHabitEmoji(h.name);
                const s = calculateHabitStats(h, completions, new Date());
                const showStreak =
                  (s.streakContinuable && s.previousStreak >= 2) ||
                  (!s.streakContinuable && s.currentStreak >= 2);
                const streakLabel = s.streakContinuable ? s.previousStreak : s.currentStreak;
                return (
                  <div key={h.id} className={styles.memberCard}>
                    <span className={styles.memberEmoji}>{hEmoji}</span>
                    <span className={styles.memberName}>{hCleanName}</span>
                    <div className={styles.memberStats}>
                      {showStreak && (
                        <span
                          className={`${styles.memberStat} ${s.streakContinuable ? styles.memberStatMuted : styles.memberStatWarning}`}
                        >
                          🔥{streakLabel}
                        </span>
                      )}
                      <span className={styles.memberStat}>
                        {Math.round(s.completionRate * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
      <Alert
        title={`Delete "${cleanName}"?`}
        description={
          'Are you sure you want to delete this group?\n\nThe habits inside will not be deleted, only removed from the group.'
        }
        confirm='Delete'
        cancel='Cancel'
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          void (async () => {
            await deleteGroup(grp.id);
            void navigate('/');
          })();
        }}
      />
    </>
  );
}
