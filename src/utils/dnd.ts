import { type CollisionDetector, directionBiased } from '@dnd-kit/collision';

export const betweenCardsCollision: CollisionDetector = input => {
  const { dragOperation, droppable } = input;
  if (!droppable.shape || !dragOperation.shape) return null;
  const dragged = dragOperation.shape.current.boundingRectangle;
  const target = droppable.shape.boundingRectangle;
  const { direction } = dragOperation.position;
  const h = target.height;
  const topEdge = target.top + 0.25 * h;
  const bottomEdge = target.bottom - 0.25 * h;
  const draggedCenter = (dragged.top + dragged.bottom) / 2;
  if (
    (direction === 'up' && draggedCenter <= topEdge) ||
    (direction === 'down' && draggedCenter >= bottomEdge)
  ) {
    return directionBiased(input);
  }
  return null;
};
