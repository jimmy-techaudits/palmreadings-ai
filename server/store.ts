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
    photosDeletedAt: null,
    marketingConsent: !!req.marketingConsent,
  };

  await env.DB.prepare(
    `INSERT INTO readings (id, created_at, last_viewed_at, mode, focus, include_family, provider, age_band, dominant_hand, element,
       marriages, children, marketing_consent, marketing_consent_at, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      data.createdAt,
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
      data.marketingConsent ? 1 : 0,
      data.marketingConsent ? data.createdAt : null,
      JSON.stringify(data),
    )
    .run();
  return id;
}

export async function getReading(env: Env, id: string): Promise<SavedReadingData | null> {
  const row = await env.DB.prepare('SELECT data, photos_deleted_at, marketing_consent FROM readings WHERE id = ?')
    .bind(id)
    .first<{ data: string; photos_deleted_at: string | null; marketing_consent: number }>();
  if (!row) return null;
  await env.DB.prepare('UPDATE readings SET last_viewed_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
  const data = JSON.parse(row.data) as SavedReadingData;
  return { ...data, photosDeletedAt: row.photos_deleted_at, marketingConsent: row.marketing_consent === 1 };
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

/** Gives or withdraws permission to use this reading's photos in marketing. */
export async function setMarketingConsent(env: Env, id: string, consent: boolean): Promise<boolean> {
  const res = await env.DB.prepare('UPDATE readings SET marketing_consent = ?, marketing_consent_at = ? WHERE id = ?')
    .bind(consent ? 1 : 0, new Date().toISOString(), id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export const PHOTO_RETENTION_DAYS = 3 * 365;

/**
 * Deletes photos for readings not opened in 3 years. The reading itself is kept.
 * Runs daily from the Worker's cron trigger; processes in batches.
 */
export async function expireOldPhotos(env: Env, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PHOTO_RETENTION_DAYS * 86_400_000).toISOString();
  let total = 0;
  for (let batch = 0; batch < 20; batch++) {
    const { results } = await env.DB.prepare(
      `SELECT id FROM readings
       WHERE photos_deleted_at IS NULL AND COALESCE(last_viewed_at, created_at) < ?
       LIMIT 50`,
    )
      .bind(cutoff)
      .all<{ id: string }>();
    if (!results.length) break;
    for (const { id } of results) {
      const listed = await env.PHOTOS.list({ prefix: `readings/${id}/` });
      if (listed.objects.length) await env.PHOTOS.delete(listed.objects.map((o) => o.key));
      await env.DB.prepare('UPDATE readings SET photos_deleted_at = ? WHERE id = ?').bind(now.toISOString(), id).run();
      total++;
    }
  }
  return total;
}
