import type { SideCatalog } from '../build-order.types.ts';

// Module cache: a side is fetched once per page; a failed fetch is forgotten so Retry fetches it again.
const cache = new Map<string, Promise<SideCatalog>>();

export const loadSide = (sideId: string) => {
  const cached = cache.get(sideId);
  if (cached) return cached;
  const request = fetch(`/build-order/${sideId}.json`).then((response) => {
    if (!response.ok) throw new Error(`Catalog ${sideId}: ${response.status}`);
    return response.json() as Promise<SideCatalog>;
  });
  cache.set(sideId, request);
  request.catch(() => cache.delete(sideId));
  return request;
};
