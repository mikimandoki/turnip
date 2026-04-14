import { useCallback, useRef, useState } from 'react';

import styles from './Toast.module.css';
import { ToastContext, type ToastType } from './useToast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts(prev => prev.filter(item => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts(prev => {
        // Keep at most 3 visible at once, dropping the oldest if needed
        const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
        return [...trimmed, { id, message, type }];
      });
      const timer = setTimeout(() => dismiss(id), 3500);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className={styles.container} role='status' aria-live='polite' aria-atomic='false'>
          {toasts.map(toast => (
            <button
              key={toast.id}
              className={`${styles.toast} ${styles[toast.type]}`}
              onClick={() => dismiss(toast.id)}
            >
              {toast.message}
            </button>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
