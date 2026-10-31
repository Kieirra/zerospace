import { getSearchIndex } from '../wiki/wiki.data.ts';

export const GET = async () => Response.json(await getSearchIndex());
