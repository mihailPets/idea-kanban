import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import cancelIcon from '../assets/cancel.svg';
import saveIcon from '../assets/save.svg';
import { saveDraft, type DraftError, type TaskDraft } from './tasks';
import type { Task, TaskFields } from './types';
import styles from './board.module.css';

type Props = {
  task?: Task;
  draft: TaskDraft;
  onDraftChange: (draft: TaskDraft) => void;
  switchRequested: boolean;
  onKeepEditing: () => void;
  onDiscardAndSwitch: () => void;
  onSave: (fields: TaskFields) => void;
  onCancel: () => void;
};

export function TaskForm({
  task, draft, onDraftChange, switchRequested, onKeepEditing, onDiscardAndSwitch, onSave, onCancel,
}: Props) {
  const errorId = useId();
  const confirmationId = useId();
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<DraftError | null>(null);

  useEffect(() => {
    if (switchRequested) dialog.current?.showModal();
    else dialog.current?.close();
  }, [switchRequested]);

  function save() {
    const result = saveDraft(draft, task);
    if ('field' in result) {
      setError(result);
      dialog.current?.close();
      onKeepEditing();
      const control = form.current?.elements.namedItem(result.field);
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
        onDraftChange({ ...draft, [field]: value });
        if (invalid || (field === 'start' && error?.dependsOnStart)) setError(null);
      },
    };
  }

  return (
    <>
      <form ref={form} className={styles.form} aria-label={task ? 'Редактирование задачи' : 'Новая задача'}
        onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); save(); }}
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
      <dialog ref={dialog} className={styles.confirmation} aria-labelledby={confirmationId}
        onCancel={(event) => { event.preventDefault(); onKeepEditing(); }}>
        <h2 id={confirmationId}>Сохранить изменения перед переключением?</h2>
        <div className={styles.confirmationActions}>
          <button type="button" autoFocus onClick={onKeepEditing}>Продолжить редактирование</button>
          <button type="button" onClick={onDiscardAndSwitch}>Без сохранения</button>
          <button type="button" onClick={save}>Сохранить</button>
        </div>
      </dialog>
    </>
  );
}
