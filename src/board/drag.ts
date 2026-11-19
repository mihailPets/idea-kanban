import { pointerWithin, rectIntersection, type CollisionDetection, type KeyboardCoordinateGetter } from '@dnd-kit/core';
import { statuses, type Status } from './types';

export function findStatus(value: unknown): Status | null {
  return statuses.find((status) => status === value) ?? null;
}

/** При переносе указателем выбирает колонку под ним. Для клавиатуры определяет колонку по положению карточки. */
export const findDropTarget: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

/** Перемещает центр карточки в соседнюю колонку, чтобы её можно было выбрать и без карточек внутри. */
export const columnCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  const direction = event.code === 'ArrowLeft' ? -1 : event.code === 'ArrowRight' ? 1 : 0;
  if (!direction) return undefined;
  event.preventDefault();
  const from = findStatus(context.over?.id) ?? findStatus(context.active?.data.current?.status);
  if (!from || !context.collisionRect) return undefined;
  const target = statuses[statuses.indexOf(from) + direction];
  const rect = target ? context.droppableRects.get(target) : undefined;
  if (!rect) return undefined;
  return {
    x: currentCoordinates.x + rect.left + (rect.width - context.collisionRect.width) / 2 - context.collisionRect.left,
    y: currentCoordinates.y + rect.top + (rect.height - context.collisionRect.height) / 2 - context.collisionRect.top,
  };
};
