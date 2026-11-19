import { compareDays, formatDay, parseDay } from './calendar';
import type { Status, Task, TaskFields } from './types';

export type TaskDraft = { text: string; start: string; end: string };

export type DraftError = { field: keyof TaskDraft; message: string; dependsOnStart?: true };

export function visibleTasks(tasks: Task[], query: string) {
  const text = query.trim().toLowerCase();
  const day = parseDay(text);
  return tasks
    .filter((task) => day === null
      ? task.text.toLowerCase().includes(text)
      : compareDays(task.startDay, day) === 0 || compareDays(task.endDay, day) === 0)
    .sort((a, b) => a.startDay - b.startDay || a.id - b.id);
}

/** Меняет только статус. При отмене, переносе в ту же колонку или отсутствии задачи возвращает исходный список. */
export function moveTask(tasks: Task[], id: number, destination: Status | null) {
  if (!destination || !tasks.some((task) => task.id === id && task.type !== destination)) return tasks;
  return tasks.map((task) => task.id === id ? { ...task, type: destination } : task);
}

export function addTask(tasks: Task[], fields: TaskFields) {
  const ids = new Set(tasks.map((task) => task.id));
  let id = 1;
  while (ids.has(id)) id++;
  return [...tasks, { ...fields, id, type: 'todo' as const }];
}

/** Сохраняет исходные метки времени для неизменённых дат. Если новый дедлайн приходится на день начала, он получает время не раньше начала. */
export function saveDraft(draft: TaskDraft, original?: TaskFields): { fields: TaskFields } | DraftError {
  const text = draft.text.trim();
  if (!text) return { field: 'text', message: 'Введите описание задачи.' };
  const start = parseDay(draft.start);
  if (start === null) return { field: 'start', message: 'Укажите существующую дату начала в формате дд.мм.гггг.' };
  const end = parseDay(draft.end);
  if (end === null) return { field: 'end', message: 'Укажите существующую дату окончания в формате дд.мм.гггг.' };
  if (compareDays(start, end) > 0) {
    return { field: 'end', message: 'Окончание должно быть не раньше начала.', dependsOnStart: true };
  }
  const startDay = original && formatDay(original.startDay) === draft.start ? original.startDay : start;
  const endDay = original && formatDay(original.endDay) === draft.end ? original.endDay : Math.max(startDay, end);
  return { fields: { text, startDay, endDay } };
}
