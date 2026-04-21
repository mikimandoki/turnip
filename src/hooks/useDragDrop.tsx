import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useCallback, useRef, useState } from 'react';

import {
  DragDropCtx,
  type DragSourceData,
  type DragState,
  type DropHandler,
  type DropInfo,
  type UngroupHandler,
} from './useDragDropContext';

interface CardElement extends HTMLElement {
  dataset: {
    habitIndex?: string;
    habitId?: string;
  };
}

export type { DragSourceData, DropHandler, DropInfo, UngroupHandler };

export interface DropInfoWithPosition extends DropInfo {
  dropType: 'between' | 'on-top';
  insertBefore?: boolean;
}

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  const [dragState, setDragState] = useState<DragState>({ source: null, isActive: false });
  const [groupTargetId, setGroupTargetId] = useState<string | null>(null);
  const [groupCreateTargetId, setGroupCreateTargetId] = useState<string | null>(null);
  const [reorderInsertIndex, setReorderInsertIndex] = useState<number | null>(null);
  const dropHandlerRef = useRef<DropHandler | null>(null);
  const ungroupHandlerRef = useRef<UngroupHandler | null>(null);
  const pendingDropRef = useRef<DropInfoWithPosition | null>(null);
  const registeredElements = useRef(new WeakMap<HTMLElement, () => void>());
  const dragDataRef = useRef<DragSourceData | null>(null);

  const registerCard = useCallback((element: HTMLElement, data: DragSourceData) => {
    if (registeredElements.current.has(element)) {
      return () => {};
    }

    const cleanupFns: (() => void)[] = [];

    cleanupFns.push(
      draggable({
        element,
        getInitialData: () => {
          dragDataRef.current = data;
          return data;
        },
        onDragStart: () => {
          dragDataRef.current = data;
          pendingDropRef.current = null;
          setDragState({ source: data, isActive: true });
        },
        onDrag: ({ location }) => {
          const targets = location.current.dropTargets;
          const innermost = targets[0];
          if (!innermost) {
            setGroupTargetId(null);
            setGroupCreateTargetId(null);
            setReorderInsertIndex(null);
            return;
          }

          const innermostData = innermost.data as DragSourceData;
          if (innermostData.type === 'habit') {
            const habitId = innermostData.habitId;
            if (habitId?.startsWith('__gap_')) {
              const gapIndex = Number(habitId.replace('__gap_', ''));
              setGroupCreateTargetId(null);
              setReorderInsertIndex(gapIndex);
            } else {
              const rect = innermost.element.getBoundingClientRect();
              const cursorY = location.current.input.clientY;
              const relativeY = (cursorY - rect.top) / rect.height;
              const dropType: 'between' | 'on-top' =
                relativeY > 0.25 && relativeY < 0.75 ? 'on-top' : 'between';

              if (dropType === 'on-top') {
                setGroupCreateTargetId(habitId);
                setReorderInsertIndex(null);
              } else {
                setGroupCreateTargetId(null);
                const habitIndex = Number((innermost.element as CardElement).dataset.habitIndex);
                setReorderInsertIndex(relativeY < 0.5 ? habitIndex : habitIndex + 1);
              }
            }
          } else if (innermostData.type === 'group') {
            setGroupCreateTargetId(null);
            setReorderInsertIndex(null);
            setGroupTargetId(innermostData.groupId);
          }
        },
        onDrop: ({ location }) => {
          const targets = location.current.dropTargets;
          const innermost = targets[0];

          setDragState({ source: null, isActive: false });
          setGroupTargetId(null);
          setGroupCreateTargetId(null);
          setReorderInsertIndex(null);

          if (innermost) {
            const innermostData = innermost.data as DragSourceData;

            if (innermostData.type === 'habit' && innermostData.habitId?.startsWith('__gap_')) {
              const info: DropInfoWithPosition = {
                sourceData: dragDataRef.current!,
                targetData: innermostData,
                targetElement: innermost.element as HTMLElement,
                isOverGroup: false,
                dropType: 'between',
                insertBefore: true,
              };
              pendingDropRef.current = info;
            } else if (innermostData.type === 'habit') {
              const rect = innermost.element.getBoundingClientRect();
              const cursorY = location.current.input.clientY;
              const relativeY = (cursorY - rect.top) / rect.height;

              const dropType: 'between' | 'on-top' =
                relativeY > 0.25 && relativeY < 0.75 ? 'on-top' : 'between';
              const insertBefore = relativeY < 0.5;

              const info: DropInfoWithPosition = {
                sourceData: dragDataRef.current!,
                targetData: innermostData,
                targetElement: innermost.element as HTMLElement,
                isOverGroup: false,
                dropType,
                insertBefore: dropType === 'between' ? insertBefore : undefined,
              };
              pendingDropRef.current = info;
            } else if (innermostData.type === 'group') {
              const info: DropInfoWithPosition = {
                sourceData: dragDataRef.current!,
                targetData: innermostData,
                targetElement: innermost.element as HTMLElement,
                isOverGroup: true,
                dropType: 'between',
              };
              pendingDropRef.current = info;
            }
          }

          const handler = dropHandlerRef.current;
          if (handler && pendingDropRef.current) {
            handler(pendingDropRef.current);
            pendingDropRef.current = null;
            dragDataRef.current = null;
            return;
          }

          if (
            !pendingDropRef.current &&
            dragDataRef.current?.type === 'habit' &&
            dragDataRef.current.groupId
          ) {
            const ungroupHandler = ungroupHandlerRef.current;
            if (ungroupHandler) {
              ungroupHandler(dragDataRef.current.habitId);
            }
          }
          pendingDropRef.current = null;
          dragDataRef.current = null;
        },
      }) as unknown as () => void
    );

    cleanupFns.push(
      dropTargetForElements({
        element,
        getData: () => data,
        canDrop: ({ source }) => {
          const d = source.data as DragSourceData;
          if (data.type === 'habit' && data.habitId?.startsWith('__gap_')) {
            return d.type === 'habit' && !d.habitId?.startsWith('__gap_');
          }
          if (d.type === 'habit' && data.type === 'habit') {
            return d.habitId !== data.habitId;
          }
          if (d.type === 'group' && data.type === 'group') {
            return d.groupId !== data.groupId;
          }
          return true;
        },
        getIsSticky: () => false,
        onDropTargetChange: ({ location }) => {
          const targets = location.current.dropTargets;
          const innermost = targets[0];
          if (!innermost) {
            setGroupTargetId(null);
            setGroupCreateTargetId(null);
            return;
          }

          const innermostData = innermost.data as DragSourceData;
          if (innermostData.type === 'group') {
            setGroupTargetId(innermostData.groupId);
            setGroupCreateTargetId(null);
          } else if (innermostData.type === 'habit') {
            setGroupTargetId(null);
          }
        },
        onDrop: () => {},
      }) as unknown as () => void
    );

    const cleanup = () => {
      registeredElements.current.delete(element);
      cleanupFns.forEach(fn => fn());
    };

    registeredElements.current.set(element, cleanup);
    return cleanup;
  }, []);

  return (
    <DragDropCtx.Provider
      value={{
        dragState,
        groupTargetId,
        groupCreateTargetId,
        reorderInsertIndex,
        registerCard,
        setDropHandler: handler => {
          dropHandlerRef.current = handler;
        },
        setUngroupHandler: handler => {
          ungroupHandlerRef.current = handler;
        },
      }}
    >
      {children}
    </DragDropCtx.Provider>
  );
}
