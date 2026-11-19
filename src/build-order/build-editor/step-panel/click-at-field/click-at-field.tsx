import { useId, useState } from 'react';
import { ERROR_COLOR } from '../../../timeline/timeline.styles.ts';
import { formatClockInput, parseClockInput } from './click-at-field.helpers.ts';

interface ClickAtFieldProps {
  // null: empty (a unit made as soon as possible).
  seconds: number | null;
  // 'As soon as possible' for a unit: the field may then be emptied.
  placeholder?: string;
  onCommit: (seconds: number | null) => void;
}

const HELP_TEXT = 'Use m:ss, e.g. 2:35';

// 'Click at' of the step panel (Kieirra 2026-11-19): Enter or leaving the field records the time, Escape restores it;
// a text that is no time is never recorded.
export const ClickAtField = ({ seconds, placeholder, onCommit }: ClickAtFieldProps) => {
  const id = useId();
  const [text, setText] = useState(formatClockInput(seconds));
  const [isInvalid, setIsInvalid] = useState(false);
  // The step changed elsewhere (drag, undo): the field shows its new time.
  const [shownSeconds, setShownSeconds] = useState(seconds);
  if (shownSeconds !== seconds) {
    setShownSeconds(seconds);
    setText(formatClockInput(seconds));
    setIsInvalid(false);
  }
  const isOptional = placeholder !== undefined;

  const clear = () => {
    setIsInvalid(false);
    if (seconds !== null) onCommit(null);
  };

  const commit = () => {
    if (isOptional && text.trim() === '') {
      clear();
      return;
    }
    const value = parseClockInput(text);
    setIsInvalid(value === null);
    if (value === null) return;
    setText(formatClockInput(value));
    if (value !== seconds) onCommit(value);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="w-16 shrink-0 text-muted">
          Click at
        </label>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          aria-invalid={isInvalid || undefined}
          aria-describedby={isInvalid ? `${id}-help` : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setIsInvalid(false);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            // Nothing to restore: Escape goes on and closes the panel.
            if (event.key !== 'Escape' || text === formatClockInput(seconds)) return;
            event.preventDefault();
            setText(formatClockInput(seconds));
            setIsInvalid(false);
          }}
          className="w-40 border border-line bg-surface px-2 py-1 tabular-nums focus:outline-2 focus:outline-accent"
          style={isInvalid ? { borderColor: ERROR_COLOR } : undefined}
        />
        {isOptional && text !== '' && (
          <button
            type="button"
            aria-label="Clear"
            title="Clear"
            // Keeps the focus in the field: leaving it would record the text just cleared.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setText('');
              clear();
            }}
            className="size-6 cursor-pointer text-muted hover:text-text"
          >
            ✕
          </button>
        )}
      </div>
      {isInvalid && (
        <p id={`${id}-help`} className="pl-[72px] text-[11.5px] text-muted">
          {HELP_TEXT}
        </p>
      )}
    </div>
  );
};
