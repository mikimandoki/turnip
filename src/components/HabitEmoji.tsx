import styles from './HabitEmoji.module.css';

export function HabitEmoji({ emoji }: { emoji: string }) {
  return <div className={styles.habitEmoji}>{emoji}</div>;
}
