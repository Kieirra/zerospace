import { entityHref } from '../../wiki/wiki.helpers.ts';

interface WikiLinkProps {
  // Every entity of the side catalogs has its wiki page (catalog.offer.data.test.ts).
  entityId: string;
}

// The wiki page of an entity, in a new tab: the build stays open (Kieirra 2026-11-19).
export const WikiLink = ({ entityId }: WikiLinkProps) => (
  <a href={entityHref(entityId)} target="_blank" rel="noopener" className="text-xs text-accent-soft hover:underline">
    View on wiki
  </a>
);
