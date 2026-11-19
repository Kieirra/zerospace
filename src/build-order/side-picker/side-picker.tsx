import clsx from 'clsx';
import { useState } from 'react';
import { resolveRules } from '../rules/rules.helpers.ts';
import type { Side } from '../build-order.types.ts';

interface SidePickerProps {
  sides: Side[];
  onStart: (factionId: string, mercenaryId: string | null) => void;
}

// 'New build': faction required, mercenary optional (hidden when the faction plays without one).
export const SidePicker = ({ sides, onStart }: SidePickerProps) => {
  const [factionId, setFactionId] = useState<string | null>(null);
  const [mercenaryId, setMercenaryId] = useState<string | null>(null);
  const factions = sides.filter(({ kind }) => kind === 'faction');
  const mercenaries = sides.filter(({ kind }) => kind === 'mercenary');
  const isMercenaryAllowed = factionId === null || resolveRules(factionId).mercenaryAllowed.value;

  return (
    <section aria-labelledby="new-build-title" className="flex flex-col gap-6 border border-line bg-panel px-6 py-5">
      <h1 id="new-build-title" className="text-[28px] leading-tight font-bold">
        New build
      </h1>
      <div role="radiogroup" aria-labelledby="new-build-faction" className="flex flex-col gap-3">
        <h2 id="new-build-faction" className="label-caps text-xs text-muted">
          Faction
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {factions.map((side) => (
            <button
              key={side.id}
              type="button"
              role="radio"
              aria-checked={side.id === factionId}
              onClick={() => setFactionId(side.id)}
              style={{ borderBottomColor: side.accent }}
              className={clsx(
                'bevel flex cursor-pointer flex-col items-center gap-3 border-b-4 px-3 py-5',
                'bg-surface hover:bg-surface-hover',
                side.id === factionId && 'ring-2 ring-accent-soft ring-inset',
              )}
            >
              {side.imageUrl && <img src={side.imageUrl} alt="" width={64} height={64} className="size-16 object-contain" />}
              <span className="label-caps text-sm">{side.name}</span>
            </button>
          ))}
        </div>
      </div>
      {isMercenaryAllowed && (
        <div role="radiogroup" aria-labelledby="new-build-mercenary" className="flex flex-col gap-3">
          <h2 id="new-build-mercenary" className="label-caps text-xs text-muted">
            Mercenary
          </h2>
          <div className="flex flex-wrap gap-2">
            {[null, ...mercenaries].map((side) => (
              <button
                key={side?.id ?? 'none'}
                type="button"
                role="radio"
                aria-checked={(side?.id ?? null) === mercenaryId}
                onClick={() => setMercenaryId(side?.id ?? null)}
                style={{ borderLeftColor: side?.accent ?? 'var(--color-line)' }}
                className={clsx(
                  'flex cursor-pointer items-center gap-2 border-l-4 px-3 py-2 text-sm',
                  'bg-surface hover:bg-surface-hover',
                  (side?.id ?? null) === mercenaryId && 'ring-2 ring-accent-soft ring-inset',
                )}
              >
                {side?.imageUrl && <img src={side.imageUrl} alt="" width={28} height={28} className="size-7 object-contain" />}
                {side?.name ?? 'No mercenary'}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={factionId === null}
          onClick={() => factionId !== null && onStart(factionId, isMercenaryAllowed ? mercenaryId : null)}
          className="bevel-sm cursor-pointer bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#9f3fcc] disabled:cursor-default disabled:opacity-40"
        >
          Start building
        </button>
      </div>
    </section>
  );
};
