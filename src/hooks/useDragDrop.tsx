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

export type { DragSourceData, DropHandler, DropInfo, UngroupHandler };

export interface DropInfoWithPosition extends DropInfo {
  dropType: 'between' | 'on-top';
  insertBefore?: boolean;
}

const HIT_ZONE_THRESHOLD = 0.25;

function classifyDrop(relativeY: number): 'between' | 'on-top' {
  return relativeY >= HIT_ZONE_THRESHOLD && relativeY <= 1 - HIT_ZONE_THRESHOLD
    ? 'on-top'
    : 'between';
}

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  const [dragState, setDragState] = useState<DragState>({ source: null, isActive: false });
  const [groupTargetId, setGroupTargetId] = useState<string | null>(null);
  const [groupCreateTargetId, setGroupCreateTargetId] = useState<string | null>(null);
  const [reorderInsertIndex, setReorderInsertIndex] = useState<number | null>(null);
  const [groupReorderGroupId, setGroupReorderGroupId] = useState<string | null>(null);
  const [groupReorderIndex, setGroupReorderIndex] = useState<number | null>(null);
  const dropHandlerRef = useRef<DropHandler | null>(null);
  const ungroupHandlerRef = useRef<UngroupHandler | null>(null);
  const pendingDropRef = useRef<DropInfoWithPosition | null>(null);
  const registeredElements = useRef(new WeakMap<HTMLElement, () => void>());
  const dragDataRef = useRef<DragSourceData | null>(null);
  const dropProcessedRef = useRef(false);

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
          dropProcessedRef.current = false;
          setDragState({ source: data, isActive: true });
        },
        onDrag: ({ location }) => {
          const targets = location.current.dropTargets;
          const innermost = targets[0];
          if (!innermost) {
            setGroupTargetId(null);
            setGroupCreateTargetId(null);
            setReorderInsertIndex(null);
            setGroupReorderGroupId(null);
            setGroupReorderIndex(null);
            return;
          }

          const innermostData = innermost.data as DragSourceData;

          if (innermostData.type === 'habit') {
            const habitId = innermostData.habitId;
            const isGap = habitId?.startsWith('__gap_');
            const sourceData = dragDataRef.current;
            if (isGap) {
              const gapIndex = Number(habitId.replace('__gap_', ''));
              setGroupCreateTargetId(null);
              setGroupTargetId(null);
              setReorderInsertIndex(gapIndex);
              setGroupReorderGroupId(null);
              setGroupReorderIndex(null);
            } else if (sourceData?.type === 'group') {
              const rect = innermost.element.getBoundingClientRect();
              const cursorY = location.current.input.clientY;
              const relativeY = (cursorY - rect.top) / rect.height;
              const dropType = classifyDrop(relativeY);
              const habitIndex = Number((innermost.element as HTMLElement).dataset.habitIndex);
              if (dropType === 'between') {
                setReorderInsertIndex(relativeY < 0.5 ? habitIndex : habitIndex + 1);
              } else {
                setReorderInsertIndex(null);
              }
              setGroupCreateTargetId(null);
              setGroupTargetId(null);
              setGroupReorderGroupId(null);
              setGroupReorderIndex(null);
            } else {
              const sourceData = dragDataRef.current;
              const rect = innermost.element.getBoundingClientRect();
              const cursorY = location.current.input.clientY;
              const relativeY = (cursorY - rect.top) / rect.height;
              const dropType = classifyDrop(relativeY);
              const habitIndex = Number((innermost.element as HTMLElement).dataset.habitIndex);

              const sameGroup =
                sourceData?.type === 'habit' &&
                sourceData.groupId &&
                innermostData.groupId === sourceData.groupId;
              if (sameGroup) {
                const newIndex = relativeY < 0.5 ? habitIndex : habitIndex + 1;
                setGroupReorderGroupId(innermostData.groupId!);
                setGroupReorderIndex(newIndex);
                setReorderInsertIndex(null);
                setGroupCreateTargetId(null);
                setGroupTargetId(null);
              } else if (
                sourceData?.type === 'habit' &&
                !sourceData.groupId &&
                !!innermostData.groupId
              ) {
                setGroupReorderGroupId(null);
                setGroupReorderIndex(null);
                setReorderInsertIndex(null);
                setGroupCreateTargetId(null);
                setGroupTargetId(innermostData.groupId);
              } else {
                setGroupReorderGroupId(null);
                setGroupReorderIndex(null);
                if (dropType === 'between') {
                  setReorderInsertIndex(relativeY < 0.5 ? habitIndex : habitIndex + 1);
                } else {
                  setReorderInsertIndex(null);
                }
                setGroupCreateTargetId(
                  dropType === 'on-top' &&
                    !innermostData.groupId &&
                    sourceData?.type === 'habit' &&
                    !sourceData.groupId
                    ? habitId
                    : null
                );
                setGroupTargetId(
                  dropType === 'on-top' && !!innermostData.groupId ? innermostData.groupId : null
                );
              }
            }
          } else if (innermostData.type === 'group') {
            const sourceData = dragDataRef.current;
            const rect = innermost.element.getBoundingClientRect();
            const cursorY = location.current.input.clientY;
            const relativeY = (cursorY - rect.top) / rect.height;
            const groupIndex = Number((innermost.element as HTMLElement).dataset.habitIndex);
            const ownGroupHabit =
              sourceData?.type === 'habit' && sourceData.groupId === innermostData.groupId;

            if (sourceData?.type === 'group') {
              if (relativeY < HIT_ZONE_THRESHOLD) {
                setReorderInsertIndex(groupIndex);
              } else if (relativeY > 1 - HIT_ZONE_THRESHOLD) {
                setReorderInsertIndex(groupIndex + 1);
              } else {
                setReorderInsertIndex(null);
              }
              setGroupCreateTargetId(null);
              setGroupTargetId(null);
            } else if (ownGroupHabit) {
              if (relativeY < HIT_ZONE_THRESHOLD) {
                setGroupReorderIndex(0);
                setReorderInsertIndex(null);
              } else if (relativeY > 1 - HIT_ZONE_THRESHOLD) {
                setGroupReorderIndex(999);
                setReorderInsertIndex(null);
              } else {
                setReorderInsertIndex(null);
              }
              setGroupCreateTargetId(null);
              setGroupTargetId(null);
            } else if (relativeY < 0.04) {
              setReorderInsertIndex(groupIndex);
              setGroupCreateTargetId(null);
              setGroupTargetId(null);
            } else if (relativeY > 0.96) {
              setReorderInsertIndex(groupIndex + 1);
              setGroupCreateTargetId(null);
              setGroupTargetId(null);
            } else {
              setReorderInsertIndex(null);
              setGroupCreateTargetId(null);
              setGroupTargetId(innermostData.groupId);
            }
            if (sourceData?.type !== 'habit' || sourceData.groupId !== innermostData.groupId) {
              setGroupReorderGroupId(null);
              setGroupReorderIndex(null);
            }
          }
        },
        onDrop: ({ location }) => {
          if (dropProcessedRef.current) return;
          dropProcessedRef.current = true;

          const targets = location.current.dropTargets;
          const innermost = targets[0];

          setDragState({ source: null, isActive: false });
          setGroupTargetId(null);
          setGroupCreateTargetId(null);
          setReorderInsertIndex(null);
          setGroupReorderGroupId(null);
          setGroupReorderIndex(null);

          const sourceData = dragDataRef.current;
          if (!sourceData) return;

          if (innermost) {
            const innermostData = innermost.data as DragSourceData;

            if (innermostData.type === 'habit' && innermostData.habitId?.startsWith('__gap_')) {
              const info: DropInfoWithPosition = {
                sourceData,
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

              const dropType = classifyDrop(relativeY);
              const insertBefore = relativeY < 0.5;

              const info: DropInfoWithPosition = {
                sourceData,
                targetData: innermostData,
                targetElement: innermost.element as HTMLElement,
                isOverGroup: false,
                dropType,
                insertBefore: dropType === 'between' ? insertBefore : undefined,
              };
              pendingDropRef.current = info;
            } else if (innermostData.type === 'group') {
              const ownGroupHabit =
                sourceData?.type === 'habit' && sourceData.groupId === innermostData.groupId;
              const rect = innermost.element.getBoundingClientRect();
              const cursorY = location.current.input.clientY;
              const relativeY = (cursorY - rect.top) / rect.height;
              const isEdge =
                ownGroupHabit &&
                (relativeY < HIT_ZONE_THRESHOLD || relativeY > 1 - HIT_ZONE_THRESHOLD);
              const isGapEdge =
                !ownGroupHabit &&
                sourceData?.type === 'habit' &&
                (relativeY < 0.04 || relativeY > 0.96);

              const info: DropInfoWithPosition = {
                sourceData,
                targetData: innermostData,
                targetElement: innermost.element as HTMLElement,
                isOverGroup: sourceData?.type === 'habit' && !isEdge && !isGapEdge,
                dropType: isEdge || isGapEdge ? 'between' : 'on-top',
                insertBefore: isEdge || isGapEdge ? relativeY < 0.5 : undefined,
              };
              pendingDropRef.current = info;
            }
          }

          const handler = dropHandlerRef.current;
          if (handler && pendingDropRef.current) {
            const dropInfo = pendingDropRef.current;
            pendingDropRef.current = null;
            dragDataRef.current = null;
            handler(dropInfo);
            return;
          }

          pendingDropRef.current = null;
          dragDataRef.current = null;

          if (sourceData.type === 'habit' && sourceData.groupId) {
            const ungroupHandler = ungroupHandlerRef.current;
            if (ungroupHandler) {
              ungroupHandler(sourceData.habitId);
            }
          }
        },
      }) as unknown as () => void
    );

    cleanupFns.push(
      dropTargetForElements({
        element,
        getData: () => data,
        canDrop: ({ source }) => {
          const s = source.data as DragSourceData;
          if (data.type === 'habit' && data.habitId?.startsWith('__gap_')) {
            if (s.type === 'habit') {
              return s.habitId !== data.habitId && !s.habitId?.startsWith('__gap_');
            }
            return s.type === 'group';
          }
          if (s.type === 'habit' && data.type === 'habit') {
            return s.habitId !== data.habitId;
          }
          if (s.type === 'group' && data.type === 'group') {
            return s.groupId !== data.groupId;
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
        groupReorderGroupId,
        groupReorderIndex,
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
