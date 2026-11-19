import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDay, parseDay, isOverdue } from './calendar';
import { addTask, moveTask, saveDraft, visibleTasks } from './tasks';
import { loadTasks, saveTasks, type TaskStorage } from './storage';
import type { Task } from './types';

const timestamp = (day: number, hour = 12) => new Date(2024, 2, day, hour).getTime();
const task: Task = { id: 7, type: 'todo', text: 'Сделать тестовое', startDay: timestamp(9), endDay: timestamp(10) };

test('Просрочка наступает в местную полночь и не применяется к Done', () => {
  assert.equal(isOverdue(task, new Date(timestamp(9))), false);
  assert.equal(isOverdue(task, new Date(timestamp(10, 23))), false);
  assert.equal(isOverdue(task, new Date(timestamp(11, 0))), true);
  assert.equal(isOverdue({ ...task, type: 'done' }, new Date(timestamp(11))), false);
});

test('Календарь сохраняет даты перехода на летнее время и отклоняет несуществующие даты', () => {
  for (const date of ['29.02.2024', '10.03.2024', '03.11.2024']) {
    const value = parseDay(date);
    assert.notEqual(value, null);
    if (value !== null) assert.equal(formatDay(value), date);
  }
  assert.equal(parseDay('29.02.2025'), null);
  assert.equal(parseDay('31.04.2024'), null);

  const spring = new Date(2024, 2, 10, 23, 59).getTime();
  const fall = new Date(2024, 10, 3, 23, 59).getTime();
  for (const deadline of [spring, fall]) {
    const nextDay = new Date(deadline);
    nextDay.setHours(24, 0, 0, 0);
    assert.equal(isOverdue({ ...task, endDay: deadline }, new Date(deadline)), false);
    assert.equal(isOverdue({ ...task, endDay: deadline }, nextDay), true);
  }
});

test('Поиск находит задачи по любой из двух дат или по тексту без учёта регистра', () => {
  for (const query of ['09.03.2024', '10.03.2024', ' ТЕСТОВОЕ ']) {
    assert.deepEqual(visibleTasks([task], query), [task]);
  }
  assert.deepEqual(visibleTasks([task], '11.03.2024'), []);
});

test('Сортировка использует время начала и ID при равенстве, сохраняя исходный порядок списка', () => {
  const tasks = [task, { ...task, id: 2 }, { ...task, id: 9, startDay: timestamp(8) }];
  assert.deepEqual(visibleTasks(tasks, '').map(({ id }) => id), [9, 2, 7]);
  assert.deepEqual(tasks.map(({ id }) => id), [7, 2, 9]);
});

test('Перенос меняет только статус, а отмена сохраняет список', () => {
  const tasks = [task];
  assert.deepEqual(moveTask(tasks, task.id, 'done'), [{ ...task, type: 'done' }]);
  assert.equal(moveTask(tasks, task.id, null), tasks);
  assert.equal(moveTask(tasks, task.id, 'todo'), tasks);
});

test('Редактирование сохраняет исходные метки времени и учитывает порядок дат в пределах дня', () => {
  const draft = { text: 'Изменено', start: '09.03.2024', end: '10.03.2024' };
  assert.deepEqual(saveDraft(draft, task), {
    fields: { text: draft.text, startDay: task.startDay, endDay: task.endDay },
  });
  assert.deepEqual(saveDraft({ ...draft, end: '09.03.2024' }, task), {
    fields: { text: draft.text, startDay: task.startDay, endDay: task.startDay },
  });
});

test('Последовательное создание задач выдаёт разные ID даже при занятом максимальном ID', () => {
  const initial = [{ ...task, id: Number.MAX_SAFE_INTEGER }];
  const tasks = addTask(addTask(initial, task), task);
  assert.equal(new Set(tasks.map(({ id }) => id)).size, 3);
  assert.equal(tasks.at(-1)?.type, 'todo');
});

const storage = (value: string | null): TaskStorage => ({ getItem: () => value, setItem: () => undefined });

test('Хранилище принимает пустой список и отклоняет повреждённые и частично некорректные списки', () => {
  assert.deepEqual(loadTasks(storage('[]'), [task]), []);
  assert.deepEqual(loadTasks(storage(JSON.stringify([task])), []), [task]);
  for (const value of [
    null, '{', '{}', '[null]', JSON.stringify([task, task]),
    JSON.stringify([{ ...task, type: 'unknown' }]),
    JSON.stringify([{ ...task, id: 1.1 }]),
    JSON.stringify([{ ...task, text: ' ' }]),
    JSON.stringify([{ ...task, endDay: 9e15 }]),
    JSON.stringify([{ ...task, endDay: new Date(10_000, 0, 1).getTime() }]),
    JSON.stringify([{ ...task, endDay: timestamp(8) }]),
  ]) assert.deepEqual(loadTasks(storage(value), [task]), [task]);
});

test('При недоступности хранилища ошибка сохранения не затрагивает список в памяти', () => {
  const fail = () => { throw new Error('Storage unavailable'); };
  const unavailable = { getItem: fail, setItem: fail };
  assert.deepEqual(loadTasks(unavailable, [task]), [task]);
  const updated = moveTask([task], task.id, 'done');
  assert.equal(saveTasks(unavailable, updated), false);
  assert.equal(updated[0]?.type, 'done');
});
