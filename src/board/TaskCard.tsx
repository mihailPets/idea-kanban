import { useDraggable } from '@dnd-kit/core';
import editIcon from '../assets/edit.svg';
import deleteIcon from '../assets/delete.svg';
import { formatDay } from './calendar';
import type { Task } from './types';
import styles from './board.module.css';

type Props = {
  task: Task;
  overdue: boolean;
  disabled?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

/**
 * Подключает перенос к отдельной ручке, чтобы редактирование и удаление
 * можно было выполнить мышью и клавиатурой без случайного переноса.
 */
export function TaskCard({ task, overdue, disabled, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.type },
    disabled,
  });

  return (
    <article ref={setNodeRef} className={styles.card} data-overdue={overdue} data-dragging={isDragging}>
      <p>Начало: <strong>{formatDay(task.startDay)}</strong></p>
      <p>Окончание: <strong className={overdue ? styles.late : undefined}>
        {formatDay(task.endDay)}
        {overdue && <> <span aria-hidden="true">⚠</span><span className={styles.srOnly}> (просрочено)</span></>}
      </strong>
      </p>
      <p>Описание: <strong>{task.text}</strong></p>
      <div className={styles.actions}>
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners}
          disabled={disabled} data-drag-task={task.id} className={styles.handle} aria-label={`Перенести задачу: ${task.text}`}>⠿</button>
        <button type="button" data-edit-task={task.id} aria-label={`Редактировать задачу: ${task.text}`} onClick={onEdit} disabled={disabled}>
          <img src={editIcon} alt="" />
        </button>
        <button type="button" aria-label={`Удалить задачу: ${task.text}`} onClick={onDelete} disabled={disabled}>
          <img src={deleteIcon} alt="" />
        </button>
      </div>
    </article>
  );
}
