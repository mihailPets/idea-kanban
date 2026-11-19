import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import cancelIcon from '../assets/cancel.svg';
import saveIcon from '../assets/save.svg';
import { formatDay } from './calendar';
import { saveDraft, type DraftError, type TaskDraft } from './tasks';
import type { Task, TaskFields } from './types';
import styles from './board.module.css';

type Props = {
  task?: Task;
  onSave: (fields: TaskFields) => void;
  onCancel: () => void;
};

/**
 * Использует одни правила ввода и проверки для создания и редактирования.
 * Держит черновик локально, чтобы ошибки и отмена не меняли общий список задач.
 */
export function TaskForm({ task, onSave, onCancel }: Props) {
  const errorId = useId();
  const [today] = useState(() => formatDay(Date.now()));
  const [draft, setDraft] = useState(() => ({
    start: task ? formatDay(task.startDay) : today,
    end: task ? formatDay(task.endDay) : today,
    text: task?.text ?? '',
  }));
  const [error, setError] = useState<DraftError | null>(null);

  /** Сохраняет черновик и переводит фокус на первое поле с ошибкой, чтобы его можно было сразу исправить. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = saveDraft(draft, task);
    if ('field' in result) {
      setError(result);
      const control = event.currentTarget.elements.namedItem(result.field);
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    onSave(result.fields);
  }

  function fieldProps(field: keyof TaskDraft) {
    const invalid = error?.field === field;
    return {
      name: field,
      value: draft[field],
      'aria-invalid': invalid || undefined,
      'aria-describedby': invalid ? errorId : undefined,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = event.currentTarget;
        setDraft((current) => ({ ...current, [field]: value }));
        if (invalid || (field === 'start' && error?.dependsOnStart)) setError(null);
      },
    };
  }

  return (
    <form className={styles.form} aria-label={task ? 'Редактирование задачи' : 'Новая задача'}
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}>
      <label>Начало:
        <input autoFocus={!!task} placeholder="дд.мм.гггг" {...fieldProps('start')} />
      </label>
      <label>Окончание:
        <input placeholder="дд.мм.гггг" {...fieldProps('end')} />
      </label>
      <label>Описание:
        <textarea autoFocus={!task} rows={1} {...fieldProps('text')} />
      </label>
      {error && <p role="alert" id={errorId} className={styles.error}>{error.message}</p>}
      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} aria-label="Отменить"><img src={cancelIcon} alt="" /></button>
        <button type="submit" aria-label="Сохранить"><img src={saveIcon} alt="" /></button>
      </div>
    </form>
  );
}
