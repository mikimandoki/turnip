import { createContext, useContext } from 'react';

export type DragSourceData =
  | { type: 'group'; groupId: string }
  | { type: 'habit'; habitId: string; groupId?: string };

export interface DragState {
  source: DragSourceData | null;
  isActive: boolean;
}

export interface DropInfo {
  sourceData: DragSourceData;
  targetData: DragSourceData;
  targetElement: HTMLElement;
  isOverGroup: boolean;
  dropType: 'between' | 'on-top';
  insertBefore?: boolean;
}

export type DropHandler = (info: DropInfo) => void;
export type UngroupHandler = (habitId: string) => void;

interface DragDropContextValue {
  dragState: DragState;
  groupTargetId: string | null;
  groupCreateTargetId: string | null;
  reorderInsertIndex: number | null;
  registerCard: (element: HTMLElement, data: DragSourceData) => () => void;
  setDropHandler: (handler: DropHandler | null) => void;
  setUngroupHandler: (handler: UngroupHandler | null) => void;
}

export const DragDropCtx = createContext<DragDropContextValue | null>(null);

export function useDragDropContext() {
  const ctx = useContext(DragDropCtx);
  if (!ctx) throw new Error('useDragDropContext must be used within DragDropProvider');
  return ctx;
}
