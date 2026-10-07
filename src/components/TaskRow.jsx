import { useState } from 'react';
import { Check, Settings2, X } from 'lucide-react';

export default function TaskRow({ task, busy, locked, onToggle, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.text);
  const [error, setError] = useState('');

  async function saveEdit(event) {
    event.preventDefault();
    try {
      await onEdit(value);
      setEditing(false);
      setError('');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <div className={`task-row ${task.done ? 'task-done' : ''}`}>
      <button
        className="task-check"
        onClick={onToggle}
        disabled={busy}
        aria-label={task.done ? '완료 취소' : '완료 체크'}
      >
        {task.done && <Check size={13} />}
      </button>
      {editing && !locked ? (
        <form className="task-edit-form" onSubmit={saveEdit}>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
            maxLength={250}
          />
          <button disabled={!value.trim() || busy} aria-label="수정 저장">
            <Check size={15} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setValue(task.text);
              setEditing(false);
              setError('');
            }}
            aria-label="수정 취소"
          >
            <X size={15} />
          </button>
          {error && <small role="alert">{error}</small>}
        </form>
      ) : (
        <div className="task-text">
          <span>{task.text}</span>
          {task.workDate && <small>{task.workDate}</small>}
        </div>
      )}
      {!locked && !editing && (
        <>
          <button
            className="task-edit"
            disabled={busy}
            onClick={() => {
              setValue(task.text);
              setEditing(true);
            }}
            aria-label="업무 수정"
          >
            <Settings2 size={14} />
          </button>
          <button className="task-remove" disabled={busy} onClick={onRemove} aria-label="업무 삭제">
            <X size={15} />
          </button>
        </>
      )}
    </div>
  );
}
