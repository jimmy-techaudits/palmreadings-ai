import type { ReadingRequest } from '../../shared/types';
import { photoSlots } from '../../shared/plan';

const MAX_PHOTO_BYTES = 2_500_000; // base64 length; the client sends ~1600px JPEGs
const SLOT_RE = /^p[01]-(left|right)-(palm|side)$/;

/** Returns an error message, or null if the request is valid. */
export function validateRequest(body: unknown): string | null {
  const r = body as ReadingRequest;
  if (!r || typeof r !== 'object') return 'Invalid request';
  if (r.mode !== 'solo' && r.mode !== 'couple') return 'Invalid mode';
  if (!['overall', 'love', 'career'].includes(r.focus)) return 'Invalid focus';
  if (typeof r.includeFamily !== 'boolean') return 'Invalid includeFamily';
  if (!Array.isArray(r.people) || r.people.length !== (r.mode === 'couple' ? 2 : 1)) return 'Invalid people';
  for (const p of r.people) {
    if (p.dominantHand !== 'left' && p.dominantHand !== 'right') return 'Missing dominant hand';
    if (p.name !== undefined && (typeof p.name !== 'string' || p.name.length > 60)) return 'Invalid name';
    if (p.pronouns !== undefined && (typeof p.pronouns !== 'string' || p.pronouns.length > 30)) return 'Invalid pronouns';
    if (p.age !== undefined && (!Number.isInteger(p.age) || p.age < 1 || p.age > 120)) return 'Invalid age';
  }
  if (!Array.isArray(r.photos) || r.photos.length > 6) return 'Invalid photos';
  const allowed = new Set(photoSlots(r.people, r.includeFamily).map((s) => s.slot));
  for (const ph of r.photos) {
    if (!SLOT_RE.test(ph.slot) || !allowed.has(ph.slot)) return `Unexpected photo ${ph.slot}`;
    if (typeof ph.data !== 'string' || ph.data.length > MAX_PHOTO_BYTES) return 'Photo too large';
  }
  const provided = new Set(r.photos.map((p) => p.slot));
  for (const s of photoSlots(r.people, r.includeFamily)) {
    if (s.required && !provided.has(s.slot)) return `Missing photo ${s.slot}`;
  }
  return null;
}
