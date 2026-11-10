// Types shared by the browser app (src/) and the server functions (functions/).

export type Mode = 'solo' | 'couple';
export type Focus = 'overall' | 'love' | 'career';
export type Hand = 'left' | 'right';
export type View = 'palm' | 'side';

export interface Person {
  name?: string;
  age?: number;
  pronouns?: string;
  dominantHand: Hand;
}

/** Identifies one photo slot, e.g. "p0-right-palm" or "p1-left-side". */
export type SlotId = `p${0 | 1}-${Hand}-${View}`;

export interface PhotoInput {
  slot: SlotId;
  /** Base64 JPEG, no data: prefix. The browser resizes and re-encodes before upload. */
  data: string;
}

export interface ReadingRequest {
  mode: Mode;
  focus: Focus;
  includeFamily: boolean;
  people: Person[];
  photos: PhotoInput[];
}

// ---------- Stage 1: what the model observed in the photos ----------

export type Visibility = 'clear' | 'faint' | 'not_visible';

export interface LineObservation {
  visibility: Visibility;
  length: 'short' | 'medium' | 'long' | 'unclear';
  depth: 'deep' | 'moderate' | 'shallow' | 'unclear';
  shape: 'straight' | 'gently_curved' | 'strongly_curved' | 'unclear';
  starts: string;
  ends: string;
  features: string[];
}

export interface HandObservation {
  hand: Hand;
  palm_shape: 'square' | 'rectangular' | 'unclear';
  finger_length: 'short' | 'medium' | 'long' | 'unclear';
  element: 'earth' | 'air' | 'fire' | 'water' | 'unclear';
  thumb: string;
  index_vs_ring: 'index_longer' | 'ring_longer' | 'about_equal' | 'unclear';
  lines: {
    heart: LineObservation;
    head: LineObservation;
    life: LineObservation;
    fate: LineObservation;
    sun: LineObservation;
    mercury: LineObservation;
  };
  mounts: { mount: string; prominence: 'prominent' | 'average' | 'flat' | 'unclear' }[];
  markings: { marking: string; location: string }[];
  /** From the pinky-side view (or palm edge if visible). Empty when not visible. */
  relationship_lines: { position: string; length: 'short' | 'long'; depth: 'deep' | 'faint'; features: string[] }[];
  children_lines_visible: number;
  notes: string;
}

export interface PhotoCheck {
  slot: string;
  usable: boolean;
  issue: string;
}

export interface PersonObservation {
  photo_checks: PhotoCheck[];
  hands: HandObservation[];
  overall_confidence: 'high' | 'medium' | 'low';
}

// ---------- Stage 2: the written reading ----------

export interface ReadingSection {
  id: string;
  title: string;
  body: string;
  evidence: string[];
}

export interface FamilyPrediction {
  range: string;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface Reading {
  headline: string;
  summary: string;
  traits: { label: string; value: string }[];
  sections: ReadingSection[];
  family?: {
    marriages: FamilyPrediction;
    children: FamilyPrediction;
    timing: string;
  };
  action_steps: string[];
  closing: { kind: 'mantra' | 'reflection'; text: string };
}

// ---------- Streaming protocol (newline-delimited JSON) ----------

export type Stage = 'observing' | 'interpreting';

export type StreamEvent =
  | { type: 'stage'; stage: Stage }
  | { type: 'photo_issues'; issues: { slot: string; reason: string }[] }
  | { type: 'observations'; observations: PersonObservation[] }
  /** id is the saved reading's private-link id, or null if saving failed. */
  | { type: 'reading'; reading: Reading; id: string | null }
  | { type: 'error'; message: string };

// ---------- Saved readings (private links) ----------

/** What GET /api/readings/:id returns. Photos are served from /api/readings/:id/photos/:slot. */
export interface SavedReadingData {
  id: string;
  createdAt: string;
  mode: Mode;
  focus: Focus;
  includeFamily: boolean;
  people: Person[];
  reading: Reading;
  observations: PersonObservation[];
  photoSlots: SlotId[];
}

/** Private-link ids: 22 base64url characters (128 random bits). */
export const READING_ID_RE = /^[A-Za-z0-9_-]{22}$/;
