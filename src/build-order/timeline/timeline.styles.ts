import { KIND_COLORS } from '../build-order.constants.ts';
import type { CSSProperties } from 'react';
import type { TimelineItemShape } from './timeline.types.ts';

export const ERROR_COLOR = '#FF6B6B';
// Text on an ERROR_COLOR fill: 7:1 contrast, white would give 2.8:1.
export const ON_ERROR_COLOR = '#0b0b10';

// Same recipes as apercu.html (.bar.k-bld, .k-unit, .k-res, .k-hero): the shape tells the type, never the color alone.
export const BAR_STYLES: Record<Exclude<TimelineItemShape, 'mercenary' | 'setup-hero'>, CSSProperties> = {
  building: {
    background: KIND_COLORS.building,
    clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
    color: '#0b0b10',
  },
  unit: { background: KIND_COLORS.unit, borderRadius: 3, boxShadow: 'inset -1px 0 0 rgba(0,0,0,.45)', color: '#0b0b10' },
  research: {
    background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${KIND_COLORS.research} 30%, transparent) 0 3px, color-mix(in srgb, ${KIND_COLORS.research} 12%, transparent) 3px 7px)`,
    border: `1.5px solid ${KIND_COLORS.research}`,
    borderRadius: 2,
    color: `color-mix(in srgb, ${KIND_COLORS.research} 22%, #fff)`,
  },
  hero: {
    background: `linear-gradient(180deg, #ffe28a, ${KIND_COLORS.hero})`,
    borderRadius: 10,
    boxShadow: `inset 0 0 0 2px rgba(0,0,0,.35), 0 0 0 1px ${KIND_COLORS.hero}`,
    color: '#0b0b10',
  },
};

export const MERCENARY_BUILDING_STYLE: CSSProperties = { ...BAR_STYLES.building, background: KIND_COLORS.mercenary };

// Building where research is done: building shape, research color.
export const RESEARCH_BUILDING_STYLE: CSSProperties = { ...BAR_STYLES.building, background: KIND_COLORS.research };

// A step in error (Kieirra 2026-11-19): its shape filled with solid red, a bordered shape keeps a red border.
export const toErrorFillStyle = (shapeStyle: CSSProperties) => ({
  ...shapeStyle,
  background: ERROR_COLOR,
  color: ON_ERROR_COLOR,
  ...(shapeStyle.border === undefined ? {} : { border: `1.5px solid ${ERROR_COLOR}` }),
});

// Highlight shared by the timeline marks (brightness +45 %).
export const toHighlightStyle = (isHighlighted: boolean): CSSProperties => ({
  filter: isHighlighted ? 'brightness(1.45)' : undefined,
  zIndex: isHighlighted ? 4 : 2,
});

// Selected step in the editor: each of its marks outlined in white.
export const toSelectedStyle = (isSelected: boolean): CSSProperties =>
  isSelected ? { outline: '2px solid #fff', outlineOffset: 1, filter: 'brightness(1.45)', zIndex: 4 } : {};
