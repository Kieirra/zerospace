import { KIND_COLORS } from '../build-order.constants.ts';
import type { CSSProperties } from 'react';
import type { BuildEntity, EntityCategory } from '../build-order.types.ts';

interface EntityIconProps {
  entity: BuildEntity;
}

const ICON_PX = 24;

// Entity image, or a type icon (colored shape) when the image is missing.
export const EntityIcon = ({ entity }: EntityIconProps) =>
  entity.imageUrl ? (
    <img src={entity.imageUrl} alt="" width={ICON_PX} height={ICON_PX} className="size-6 shrink-0 object-contain" />
  ) : (
    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
      <span className="inline-block" style={TYPE_SHAPES[entity.category]} />
    </span>
  );

const BEVEL = 'polygon(3px 0,100% 0,100% calc(100% - 3px),calc(100% - 3px) 100%,0 100%,0 3px)';

const MISC_SHAPE: CSSProperties = { width: 10, height: 10, background: KIND_COLORS.misc, transform: 'rotate(45deg)' };

const UNIT_SHAPE: CSSProperties = { width: 12, height: 12, background: KIND_COLORS.unit, borderRadius: '50%' };

const TYPE_SHAPES: Record<EntityCategory, CSSProperties> = {
  building: { width: 12, height: 12, background: KIND_COLORS.building, clipPath: BEVEL },
  transformation: { width: 12, height: 12, border: `1.5px solid ${KIND_COLORS.research}` },
  harvester: { width: 12, height: 12, background: KIND_COLORS.unit, borderRadius: '50%' },
  unit: { width: 12, height: 12, background: KIND_COLORS.unit, borderRadius: '50%' },
  research: { width: 12, height: 12, border: `1.5px solid ${KIND_COLORS.research}` },
  'mercenary-building': { width: 12, height: 12, background: KIND_COLORS.mercenary, clipPath: BEVEL },
  'mercenary-unit': { width: 10, height: 10, background: KIND_COLORS.mercenary, transform: 'rotate(45deg)' },
  hero: { width: 12, height: 12, background: KIND_COLORS.hero, borderRadius: 3 },
  talent: MISC_SHAPE,
  event: MISC_SHAPE,
  merge: UNIT_SHAPE,
  replicate: UNIT_SHAPE,
};
