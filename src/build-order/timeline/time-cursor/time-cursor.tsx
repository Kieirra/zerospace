import { KIND_COLORS } from '../../build-order.constants.ts';
import { formatAmount, formatClock } from '../../build-order.helpers.ts';
import { toSupplyText } from './time-cursor.helpers.ts';
import type { GameStateAt } from '../timeline.types.ts';

interface TimeCursorProps {
  state: GameStateAt;
  // Viewport point the card follows.
  position: { x: number; y: number };
}

const OFFSET_PX = 16;
const CARD_WIDTH_PX = 248;

// Card of the game state at the cursor time, beside the pointer (flipped left near the right edge).
export const TimeCursor = ({ state, position }: TimeCursorProps) => {
  const isFlipped = position.x + OFFSET_PX + CARD_WIDTH_PX > window.innerWidth;
  const isAbove = position.y > window.innerHeight * 0.6;
  const resources = [
    { name: 'Hexite', color: KIND_COLORS.hexite, value: formatAmount(state.hexite) },
    { name: 'Flux', color: KIND_COLORS.flux, value: formatAmount(state.flux) },
    { name: 'Supply', color: KIND_COLORS.supply, value: toSupplyText(state) },
  ];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-40 border border-[#3b3a44] bg-surface-raised/95 px-3 py-2.5 text-xs shadow-lg shadow-black/50"
      style={{
        width: CARD_WIDTH_PX,
        left: isFlipped ? position.x - OFFSET_PX - CARD_WIDTH_PX : position.x + OFFSET_PX,
        top: isAbove ? position.y - OFFSET_PX : position.y + OFFSET_PX,
        transform: isAbove ? 'translateY(-100%)' : undefined,
      }}
    >
      <p className="text-lg leading-none font-bold tabular-nums">{formatClock(state.t)}</p>
      <p className="mt-1.5 flex flex-wrap gap-x-3 tabular-nums">
        {resources.map(({ name, color, value }) => (
          <span key={name} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
            {name} <b>{value}</b>
          </span>
        ))}
      </p>
    </div>
  );
};
