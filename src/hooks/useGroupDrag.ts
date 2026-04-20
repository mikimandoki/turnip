import { useEffect, useRef, useState } from 'react';

interface DragHandlerEvent {
  operation: {
    source?: { id: unknown } | null;
    position: { current: { x: number; y: number } };
  };
  canceled?: boolean;
}

interface UseGroupDragReturn {
  groupTargetId: string | null;
  pendingGroup: { sourceId: string; targetId: string } | null;
  onDragStart: (event: DragHandlerEvent) => void;
  onDragMove: (event: DragHandlerEvent) => void;
  onDragEnd: (event: DragHandlerEvent) => void;
  setPendingGroup: (group: { sourceId: string; targetId: string } | null) => void;
}

export function useGroupDrag<T extends { id: string }>(standaloneItems: T[]): UseGroupDragReturn {
  const [groupTargetId, setGroupTargetId] = useState<string | null>(null);
  const [pendingGroup, setPendingGroup] = useState<{ sourceId: string; targetId: string } | null>(
    null
  );
  const groupHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingSourceId = useRef<string | null>(null);
  const cardRects = useRef<Map<string, DOMRect>>(new Map());
  const standaloneIdsRef = useRef(new Set<string>());

  useEffect(() => {
    standaloneIdsRef.current = new Set(standaloneItems.map(h => h.id));
  }, [standaloneItems]);

  function findTargetAtPoint(x: number, y: number): string | null {
    for (const [id, rect] of cardRects.current) {
      if (id === draggingSourceId.current || !standaloneIdsRef.current.has(id)) continue;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return id;
      }
    }
    return null;
  }

  function clearGroupTarget() {
    if (groupHoverTimer.current) {
      clearTimeout(groupHoverTimer.current);
      groupHoverTimer.current = null;
    }
    setGroupTargetId(null);
  }

  function refreshCardRects() {
    cardRects.current.clear();
    document.querySelectorAll<HTMLElement>('[data-habit-id]').forEach(el => {
      const id = el.dataset.habitId;
      if (id) cardRects.current.set(id, el.getBoundingClientRect());
    });
  }

  return {
    groupTargetId,
    pendingGroup,
    setPendingGroup,
    onDragStart: event => {
      const id = event.operation.source?.id;
      draggingSourceId.current = typeof id === 'string' ? id : null;
      refreshCardRects();
    },
    onDragMove: event => {
      const { x, y } = event.operation.position.current;
      refreshCardRects();
      const targetId = findTargetAtPoint(x, y);
      const sourceId = draggingSourceId.current;

      if (!targetId || targetId === sourceId) {
        clearGroupTarget();
        return;
      }

      if (groupHoverTimer.current) {
        clearTimeout(groupHoverTimer.current);
      }
      groupHoverTimer.current = setTimeout(() => {
        setGroupTargetId(targetId);
      }, 150);
    },
    onDragEnd: event => {
      const targetId = groupTargetId;
      clearGroupTarget();

      if (targetId && !event.canceled) {
        const sourceId = event.operation.source?.id;
        if (typeof sourceId === 'string' && sourceId !== targetId) {
          setPendingGroup({ sourceId, targetId });
          return;
        }
      }
    },
  };
}
