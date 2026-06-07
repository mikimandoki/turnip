import { Check, CheckCheck, ChevronLeft, Pencil, Percent, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import ActionMenu from '../components/ActionMenu';
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
  const [editName, setEditName] = useState(group?.name ?? '');
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
                        const inputErrors = validateGroupName(editName);
                        if (inputErrors.length > 0) {
                          setErrors(inputErrors);
                          return;
                        }
                        setErrors([]);
                        await editGroup(grp.id, { name: editName.trim() });
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
                      setEditName(group.name);
                      setErrors([]);
                      setIsEditing(false);
                    }}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <ActionMenu
                  ariaLabel='Group actions'
                  items={[
                    {
                      icon: <Pencil size={14} />,
                      label: 'Edit',
                      onClick: () => {
                        setEditName(group.name);
                        setIsEditing(true);
                      },
                    },
                    { separator: true },
                    {
                      icon: <Trash2 size={14} />,
                      label: 'Delete',
                      onClick: () => setDeleteOpen(true),
                      danger: true,
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </div>
        <div className='card'>
          <div className={habitStyles.statsGrid}>
            <div className={habitStyles.statBox}>
              <div className={habitStyles.statValue}>{totalTimesLogged}</div>
              <div className={habitStyles.statLabel}>
                <CheckCheck size={12} className={habitStyles.statIcon} />
                total times logged
              </div>
            </div>
            <div className={habitStyles.statBox}>
              <div className={habitStyles.statValue}>
                {Math.round((groupStats?.completionRate ?? 0) * 100)}%
              </div>
              <div className={habitStyles.statLabel}>
                <Percent size={12} className={habitStyles.statIcon} />
                average completion rate
              </div>
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
                const s = calculateHabitStats(h, completions, new Date(), undefined);
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
