import { useEffect, useRef, useState } from 'react';
import seed from './tasks.json';
import { isTaskList, loadTasks, saveTasks, type TaskStorage } from './storage';
import { addTask, moveTask } from './tasks';
import type { Status, Task, TaskFields } from './types';

const storage: TaskStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

if (!isTaskList(seed)) throw new Error('Некорректные данные в исходном списке задач');
const initialTasks: Task[] = seed;

/**
 * Управляет списком и его сохранением. Записывает принятые React изменения
 * после рендера, чтобы ошибка localStorage не мешала работе доски в памяти.
 */
export function useTasks() {
  const [tasks, setTasks] = useState(() => loadTasks(storage, initialTasks));
  const lastSaved = useRef(tasks);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (lastSaved.current === tasks) return;
    const saved = saveTasks(storage, tasks);
    if (saved) lastSaved.current = tasks;
    setSaveFailed(!saved);
  }, [tasks]);

  return {
    tasks, saveFailed,
    create: (fields: TaskFields) => setTasks((current) => addTask(current, fields)),
    update: (id: number, fields: TaskFields) => setTasks((current) =>
      current.map((task) => task.id === id ? { ...task, ...fields } : task)),
    remove: (id: number) => setTasks((current) => current.filter((task) => task.id !== id)),
    move: (id: number, status: Status | null) => setTasks((current) => moveTask(current, id, status)),
  };
}
