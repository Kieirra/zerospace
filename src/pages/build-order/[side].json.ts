import type { APIRoute } from 'astro';
import { getSideCatalog, getSides } from '../../build-order/build-order.data.ts';

export const getStaticPaths = async () => (await getSides()).map(({ id }) => ({ params: { side: id } }));

export const GET: APIRoute = async ({ params }) => {
  const catalog = await getSideCatalog(params.side ?? '');
  return catalog ? Response.json(catalog) : new Response(null, { status: 404 });
};
