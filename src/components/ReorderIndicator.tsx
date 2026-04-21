import styles from './ReorderIndicator.module.css';

export default function ReorderIndicator({ insertBefore }: { insertBefore: boolean }) {
  return <div className={styles.indicator} data-position={insertBefore ? 'before' : 'after'} />;
}
