import type { Task } from './types';

const isSupportedYear = (year: number) => year >= 1 && year <= 9999;

/** Ограничивает годы диапазоном, который можно ввести в поле с четырёхзначным годом. */
export function isCalendarTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) &&
    isSupportedYear(new Date(value).getFullYear());
}

export function formatDay(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).padStart(4, '0')}`;
}

/** Сверяет дату после преобразования, поскольку Date может перенести 31 апреля на май. */
export function parseDay(value: string): number | null {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return null;
  const [day, month, year] = value.split('.').map(Number);
  if (!day || !month || year === undefined || !isSupportedYear(year)) return null;
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return formatDay(date.getTime()) === value ? date.getTime() : null;
}

/** Сравнивает местные календарные даты, чтобы длительность суток не влияла на результат. */
export function compareDays(first: number, second: number) {
  const key = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  };
  return key(first) - key(second);
}

/** Отмечает просрочку с начала следующего календарного дня по местному времени. Для задач в Done просрочка не рассчитывается. */
export function isOverdue(task: Pick<Task, 'type' | 'endDay'>, today: Date) {
  return task.type !== 'done' && compareDays(task.endDay, today.getTime()) < 0;
}
