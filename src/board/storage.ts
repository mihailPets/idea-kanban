import { isCalendarTimestamp } from './calendar';
import { statuses, type Task } from './types';

export type TaskStorage = Pick<Storage, 'getItem' | 'setItem'>;
const storageKey = 'idea-kanban.tasks.v1';

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('type' in value) || !('text' in value) ||
      !('startDay' in value) || !('endDay' in value)) return false;
  return typeof value.id === 'number' && Number.isSafeInteger(value.id) &&
    statuses.some((status) => status === value.type) &&
    typeof value.text === 'string' && !!value.text.trim() &&
    isCalendarTimestamp(value.startDay) && isCalendarTimestamp(value.endDay) && value.startDay <= value.endDay;
}

export function isTaskList(value: unknown): value is Task[] {
  return Array.isArray(value) && value.every(isTask) &&
    new Set(value.map(({ id }) => id)).size === value.length;
}

/** Восстанавливает весь сохранённый список или берёт исходный JSON. Пустой список сохраняет результат удаления всех задач. */
export function loadTasks(storage: TaskStorage, seed: Task[]): Task[] {
  try {
    const data = storage.getItem(storageKey);
    if (data === null) return seed;
    const parsed: unknown = JSON.parse(data);
    return isTaskList(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

export function saveTasks(storage: TaskStorage, tasks: Task[]): boolean {
  try {
    storage.setItem(storageKey, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}
