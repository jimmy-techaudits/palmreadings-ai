import type { PersonObservation, Reading, ReadingRequest, SavedReadingData, SlotId } from '../shared/types';
import type { Env } from './env';

export function newReadingId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const photoKey = (id: string, slot: string) => `readings/${id}/${slot}.jpg`;

function ageBand(age?: number): string | null {
  if (!age) return null;
  if (age < 18) return 'under-18';
  if (age >= 65) return '65+';
  const lo = age < 25 ? 18 : Math.floor((age - 5) / 10) * 10 + 5;
  return `${lo}-${lo === 18 ? 24 : lo + 9}`;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Saves photos to R2 and the reading to D1. Returns the private-link id. */
export async function saveReading(
  env: Env,
  req: ReadingRequest,
  reading: Reading,
  observations: PersonObservation[],
  provider: string,
): Promise<string> {
  const id = newReadingId();
  await Promise.all(
    req.photos.map((p) =>
      env.PHOTOS.put(photoKey(id, p.slot), base64ToBytes(p.data), { httpMetadata: { contentType: 'image/jpeg' } }),
    ),
  );

  const first = req.people[0];
  const dominant = observations[0]?.hands.find((h) => h.hand === first.dominantHand);
  const data: SavedReadingData = {
    id,
    createdAt: new Date().toISOString(),
    mode: req.mode,
    focus: req.focus,
    includeFamily: req.includeFamily,
    people: req.people,
    reading,
    observations,
    photoSlots: req.photos.map((p) => p.slot),
  };

  await env.DB.prepare(
    `INSERT INTO readings (id, created_at, mode, focus, include_family, provider, age_band, dominant_hand, element, marriages, children, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      data.createdAt,
      req.mode,
      req.focus,
      req.includeFamily ? 1 : 0,
      provider,
      ageBand(first.age),
      first.dominantHand,
      dominant?.element ?? null,
      reading.family?.marriages.range ?? null,
      reading.family?.children.range ?? null,
      JSON.stringify(data),
    )
    .run();
  return id;
}

export async function getReading(env: Env, id: string): Promise<SavedReadingData | null> {
  const row = await env.DB.prepare('SELECT data FROM readings WHERE id = ?').bind(id).first<{ data: string }>();
  if (!row) return null;
  await env.DB.prepare('UPDATE readings SET last_viewed_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
  return JSON.parse(row.data) as SavedReadingData;
}

export async function getPhoto(env: Env, id: string, slot: SlotId): Promise<R2ObjectBody | null> {
  return env.PHOTOS.get(photoKey(id, slot));
}

/** Deletes the reading and all its photos. Returns false if it didn't exist. */
export async function deleteReading(env: Env, id: string): Promise<boolean> {
  const listed = await env.PHOTOS.list({ prefix: `readings/${id}/` });
  if (listed.objects.length) await env.PHOTOS.delete(listed.objects.map((o) => o.key));
  const res = await env.DB.prepare('DELETE FROM readings WHERE id = ?').bind(id).run();
  return (res.meta.changes ?? 0) > 0 || listed.objects.length > 0;
}

export async function saveFeedback(env: Env, id: string, rating: 1 | -1, comment: string) {
  await env.DB.prepare('UPDATE readings SET rating = ?, feedback = ? WHERE id = ?').bind(rating, comment || null, id).run();
}
