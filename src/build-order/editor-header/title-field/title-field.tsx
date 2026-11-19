import { useState } from 'react';
import { MAX_TITLE_LENGTH } from '../../build-order.constants.ts';
import { toTitle } from './title-field.helpers.ts';

interface TitleFieldProps {
  title: string;
  onChange: (title: string) => void;
}

// 'Untitled build ✎' becomes a field: Enter or leaving it saves, Escape cancels.
export const TitleField = ({ title, onChange }: TitleFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button
        type="button"
        title={toTitle(title)}
        onClick={() => setDraft(title)}
        className="max-w-[13rem] cursor-pointer truncate text-left text-lg font-semibold hover:text-accent-soft"
      >
        {toTitle(title)} <span aria-hidden="true" className="text-sm text-muted">✎</span>
        <span className="sr-only"> (edit title)</span>
      </button>
    );
  }

  const save = () => {
    onChange(draft.trim());
    setDraft(null);
  };

  return (
    <input
      autoFocus
      aria-label="Build title"
      value={draft}
      maxLength={MAX_TITLE_LENGTH}
      placeholder="Untitled build"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') save();
        if (event.key === 'Escape') setDraft(null);
      }}
      className="w-72 border border-accent-soft bg-bg px-2 py-0.5 text-lg font-semibold outline-none"
    />
  );
};
