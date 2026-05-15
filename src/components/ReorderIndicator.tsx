import { useEffect, useRef } from 'react';

import { useDragDropContext } from '../hooks/useDragDropContext';
import styles from './ReorderIndicator.module.css';

export default function ReorderIndicator({ index, isLast }: { index: number; isLast?: boolean }) {
  const { registerCard } = useDragDropContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerCard(el, { type: 'habit', habitId: `__gap_${index}`, groupId: undefined });
  }, [index, registerCard]);

  const isFirst = index === 0;
  return (
    <div
      ref={ref}
      className={styles.indicator}
      data-habit-index={index}
      data-position={isFirst ? 'first' : isLast ? 'last' : 'middle'}
    />
  );
}
