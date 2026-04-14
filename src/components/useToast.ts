import { createContext, useContext } from 'react';

export type ToastType = 'error' | 'info' | 'success' | 'warning';

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}
