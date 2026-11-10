import { READING_ID_RE, type SlotId } from '../../shared/types';
import type { Env } from '../env';
import { deleteReading, getPhoto, getReading } from '../store';

const SLOT_RE = /^p[01]-(left|right)-(palm|side)$/;
const PRIVATE = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' };

/** Routes under /api/readings/:id[/photos/:slot]. Returns null if the path doesn't match. */
export async function handleSavedReading(request: Request, env: Env, path: string): Promise<Response | null> {
  const m = path.match(/^\/api\/readings\/([^/]+)(?:\/photos\/([^/]+))?$/);
  if (!m) return null;
  const [, id, slot] = m;
  if (!READING_ID_RE.test(id) || (slot && !SLOT_RE.test(slot))) return Response.json({ error: 'Not found' }, { status: 404 });

  if (slot) {
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    const obj = await getPhoto(env, id, slot as SlotId);
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, { headers: { ...PRIVATE, 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=86400' } });
  }

  if (request.method === 'GET') {
    const data = await getReading(env, id);
    return data ? Response.json(data, { headers: PRIVATE }) : Response.json({ error: 'Not found' }, { status: 404, headers: PRIVATE });
  }
  if (request.method === 'DELETE') {
    const existed = await deleteReading(env, id);
    return existed ? new Response(null, { status: 204 }) : Response.json({ error: 'Not found' }, { status: 404 });
  }
  return new Response('Method not allowed', { status: 405 });
}

/** DELETE /api/admin/readings/:id with "Authorization: Bearer <ADMIN_TOKEN>", for deletion requests by email. */
export async function handleAdmin(request: Request, env: Env, path: string): Promise<Response | null> {
  const m = path.match(/^\/api\/admin\/readings\/([^/]+)$/);
  if (!m) return null;
  if (!env.ADMIN_TOKEN || request.headers.get('authorization') !== `Bearer ${env.ADMIN_TOKEN}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (request.method !== 'DELETE') return new Response('Method not allowed', { status: 405 });
  if (!READING_ID_RE.test(m[1])) return Response.json({ error: 'Invalid id' }, { status: 400 });
  const existed = await deleteReading(env, m[1]);
  return Response.json({ deleted: existed });
}
