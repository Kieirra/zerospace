import type { APIContext } from 'astro';
import { getLlmsText } from '../shared/llms/llms.data.ts';

export const GET = async ({ site }: APIContext) =>
  new Response(await getLlmsText(site), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
