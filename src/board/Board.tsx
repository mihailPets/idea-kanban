import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import todoIcon from '../assets/todo.svg';
import progressIcon from '../assets/in-progress.svg';
import reviewIcon from '../assets/review.svg';
import doneIcon from '../assets/done.svg';
import searchIcon from '../assets/search.svg';
import { formatDay, isOverdue } from './calendar';
import { columnCoordinates, findDropTarget, findStatus } from './drag';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { visibleTasks } from './tasks';
import { statuses, type Status } from './types';
import { useTasks } from './useTasks';
import styles from './board.module.css';

const columns = {
  todo: { title: 'To Do', icon: todoIcon },
  in_progress: { title: 'In Progress', icon: progressIcon },
  review: { title: 'Review', icon: reviewIcon },
  done: { title: 'Done', icon: doneIcon },
} satisfies Record<Status, { title: string; icon: string }>;

function Column({ status, children, add }: { status: Status; children: ReactNode; add?: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const { title, icon } = columns[status];
  return (
    <section ref={setNodeRef} className={styles.column} data-over={isOver} aria-labelledby={`column-${status}`}>
      <div className={styles.columnHeader}>
        <h2 id={`column-${status}`}><img src={icon} alt="" />{title}</h2>
        {add && <button type="button" className={styles.add} data-add-task onClick={add}>+ Добавить</button>}
      </div>
      {children}
    </section>
  );
}

type Editor = { mode: 'new' } | { mode: 'edit'; id: number };

const searchLockedMessage = 'Поиск доступен после сохранения или отмены формы.';

/**
 * Хранит состояние поиска, формы и переноса на уровне доски, потому что эти
 * действия затрагивают несколько колонок. Восстанавливает фокус по ID после
 * переноса или редактирования. Если карточка скрыта фильтром, фокусирует поиск.
 */
export function Board() {
  const { tasks, saveFailed, create, update, remove, move } = useTasks();
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const returnFocus = useRef<Editor | null>(null);
  const returnDragFocus = useRef<number | null>(null);
  const board = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );
  const visible = visibleTasks(tasks, query);
  const dragged = tasks.find(({ id }) => id === dragId);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(refresh, Math.max(0, nextDay.getTime() - Date.now()));
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [now]);

  useEffect(() => {
    if (editor || !returnFocus.current) return;
    const target = returnFocus.current.mode === 'new'
      ? '[data-add-task]'
      : `[data-edit-task="${returnFocus.current.id}"]`;
    (board.current?.querySelector<HTMLElement>(target) ?? search.current)?.focus();
    returnFocus.current = null;
  }, [editor]);

  useEffect(() => {
    if (dragId !== null || returnDragFocus.current === null) return;
    const target = board.current?.querySelector<HTMLElement>(`[data-drag-task="${returnDragFocus.current}"]`);
    (target ?? search.current)?.focus();
    returnDragFocus.current = null;
  }, [dragId]);

  function openEditor(next: Editor) {
    returnFocus.current = next;
    setEditor(next);
  }

  return (
    <main ref={board} className={styles.page}>
      <header className={styles.header}>
        <h1>Your tasks</h1>
        <label className={styles.search}>
          <img src={searchIcon} alt="" />
          <span className={styles.srOnly}>Поиск задач по описанию или дате</span>
          {/* Фиксируем фильтр, чтобы открытая форма не исчезла вместе с черновиком. */}
          <input ref={search} type="search" placeholder="поиск..." value={query}
            readOnly={editor !== null}
            aria-description={editor ? searchLockedMessage : undefined}
            title={editor ? searchLockedMessage : undefined}
            onChange={(event) => setQuery(event.target.value)} />
        </label>
      </header>
      {saveFailed && <p className={styles.warning} role="status">Хранилище недоступно. Изменения действуют до перезагрузки.</p>}
      <DndContext sensors={sensors} collisionDetection={findDropTarget}
        accessibility={{
          screenReaderInstructions: { draggable: 'Нажмите пробел, затем выберите колонку стрелками. Пробел подтверждает перенос, Escape отменяет.' },
          announcements: {
            onDragStart: () => 'Перенос начат.',
            onDragOver: ({ over }) => {
              const status = findStatus(over?.id);
              return status ? `Колонка ${columns[status].title}.` : 'Нет колонки для переноса.';
            },
            onDragEnd: ({ over }) => {
              const status = findStatus(over?.id);
              return status ? `Выбрана колонка ${columns[status].title}.` : 'Перенос отменён.';
            },
            onDragCancel: () => 'Перенос отменён.',
          },
        }}
        onDragStart={({ active }) => { if (typeof active.id === 'number') setDragId(active.id); }}
        onDragEnd={({ active, over, activatorEvent }) => {
          setDragId(null);
          if (typeof active.id === 'number') {
            if (activatorEvent instanceof KeyboardEvent) returnDragFocus.current = active.id;
            move(active.id, findStatus(over?.id));
          }
        }}
        onDragCancel={() => setDragId(null)}>
        <div className={styles.board}>
          {statuses.map((status) => (
            <Column key={status} status={status}
              add={status === 'todo' && !editor ? () => openEditor({ mode: 'new' }) : undefined}>
              {status === 'todo' && editor?.mode === 'new' && <TaskForm
                onCancel={() => setEditor(null)}
                onSave={(fields) => { create(fields); setEditor(null); }} />}
              {visible.filter((task) => task.type === status).map((task) =>
                editor?.mode === 'edit' && editor.id === task.id
                  ? <TaskForm key={task.id} task={task}
                      onCancel={() => setEditor(null)}
                      onSave={(fields) => { update(task.id, fields); setEditor(null); }} />
                  : <TaskCard key={task.id} task={task} overdue={isOverdue(task, now)} disabled={!!editor}
                      onEdit={() => openEditor({ mode: 'edit', id: task.id })}
                      onDelete={() => { remove(task.id); search.current?.focus(); }} />)}
            </Column>
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragged && <article className={styles.card} aria-hidden="true" data-overdue={isOverdue(dragged, now)}>
            <p>Начало: <strong>{formatDay(dragged.startDay)}</strong></p>
            <p>Окончание: <strong>{formatDay(dragged.endDay)}</strong></p>
            <p>Описание: <strong>{dragged.text}</strong></p>
          </article>}
        </DragOverlay>
      </DndContext>
      {query.trim() && !visible.length && <p role="status" className={styles.warning}>Задачи не найдены.</p>}
    </main>
  );
}
