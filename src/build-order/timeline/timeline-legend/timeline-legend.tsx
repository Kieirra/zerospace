import { ClickIcon } from '../../click-icon/click-icon.tsx';
import { KIND_COLORS } from '../../build-order.constants.ts';
import type { CSSProperties } from 'react';
import type { LegendKind } from '../timeline.types.ts';

interface TimelineLegendProps {
  kinds: LegendKind[];
}

export const TimelineLegend = ({ kinds }: TimelineLegendProps) => (
  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted" aria-label="Legend">
    {kinds.map((kind) => (
      <li key={kind} className="inline-flex items-center gap-1.5">
        {kind === 'clicked-early' ? (
          <span className="inline-flex items-center" aria-hidden="true">
            <ClickIcon size={15} />
            <span className="w-3" style={{ borderTop: `2px dotted ${KIND_COLORS.click}` }} />
          </span>
        ) : (
          <span aria-hidden="true" className="inline-block" style={SWATCHES[kind]} />
        )}
        {LABELS[kind]}
      </li>
    ))}
  </ul>
);

const LABELS: Record<LegendKind, string> = {
  building: 'Building',
  'research-building': 'Research building',
  unit: 'Unit',
  research: 'Research',
  mercenary: 'Mercenary (instant)',
  'mercenary-slot': 'Mercenary slot available',
  'clicked-early': 'Clicked, waiting to start',
  idle: 'Idle, no order',
  hero: 'Hero',
};

const BUILDING_SWATCH: CSSProperties = {
  width: 18,
  height: 10,
  background: KIND_COLORS.building,
  clipPath: 'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)',
};

const SWATCHES: Record<Exclude<LegendKind, 'clicked-early'>, CSSProperties> = {
  building: BUILDING_SWATCH,
  'research-building': { ...BUILDING_SWATCH, background: KIND_COLORS.research },
  unit: { width: 18, height: 10, background: KIND_COLORS.unit, borderRadius: 3 },
  research: {
    width: 18,
    height: 10,
    border: `1.5px solid ${KIND_COLORS.research}`,
    background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${KIND_COLORS.research} 35%, transparent) 0 2px, transparent 2px 5px)`,
  },
  mercenary: { width: 10, height: 10, background: KIND_COLORS.mercenary, transform: 'rotate(45deg)' },
  'mercenary-slot': { width: 2, height: 12, background: KIND_COLORS.mercenary },
  hero: { width: 18, height: 10, background: KIND_COLORS.hero, borderRadius: 6 },
  idle: {
    width: 18,
    height: 10,
    border: `1px solid color-mix(in srgb, ${KIND_COLORS.idle} 50%, transparent)`,
    background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${KIND_COLORS.idle} 55%, transparent) 0 2px, transparent 2px 5px)`,
  },
};
