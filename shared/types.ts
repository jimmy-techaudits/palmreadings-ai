// Types shared by the browser app (src/) and the server functions (functions/).

export type Mode = 'solo' | 'couple';
export type Focus = 'overall' | 'love' | 'career';
export type Hand = 'left' | 'right';
export type View = 'palm' | 'side';

/** Areas a person can say they are most curious about. */
export const CURIOUS_TOPICS = ['marriage', 'children', 'career', 'money', 'life_changes'] as const;
export type Curious = (typeof CURIOUS_TOPICS)[number];

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
  /** Optional, separate permission to use the palm photos in marketing. */
  marketingConsent?: boolean;
  /** Optional: the area the person is most curious about; shown first and given the most depth. */
  curious?: Curious;
  /** Cloudflare Turnstile token. */
  turnstileToken?: string;
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

/** The palm lines, in the order the hand diagram and legends show them. */
export const LINE_KEYS = ['heart', 'head', 'life', 'fate', 'sun', 'mercury'] as const;
export type LineKey = (typeof LINE_KEYS)[number];

/** How well a feature could be seen: shown instead of percentage confidence. */
export type Seen = 'clear' | 'faint' | 'not_assessable';

export interface Evidence {
  text: string;
  visibility: 'clear' | 'faint';
}

export interface ReadingSection {
  id: string;
  title: string;
  /** Short memorable name for what this section found, e.g. "The Steady Anchor". Missing on readings made before Nov 2026. */
  name?: string;
  /** 2–3 one- or two-word qualities, e.g. "Loyal", "Slow to trust". */
  tags?: string[];
  /** The lines this section is mainly read from (used for color coding and the mini hand diagram). */
  lines?: LineKey[];
  body: string;
  /** One honest challenge, contradiction or trade-off in this area. */
  tension?: string;
  /** Plain strings on readings made before Nov 21 2026. */
  evidence: (string | Evidence)[];
}

export interface Trait {
  label: string;
  value: string;
  /** The line this trait mostly comes from, or "none" (hand shape, mounts, fingers). */
  line?: LineKey | 'none';
}

/** One "Your Life at a Glance" answer, e.g. Career: "Creative leadership". */
export interface GlanceItem {
  answer: string;
  detail: string;
  line: LineKey | 'none';
  visibility: Seen;
}

export interface Glance {
  career: GlanceItem;
  money: GlanceItem;
  turning_point: GlanceItem;
  life_path: GlanceItem;
}

export interface TimelineEntry {
  /** "Earlier life", "Early 30s", "Mid-40s onward"… */
  when: string;
  title: string;
  detail: string;
  area: 'love' | 'career' | 'life';
  line: LineKey | 'none';
  /** "approximate" when the rulebook timing scale supports it, otherwise "unclear". */
  timing: 'approximate' | 'unclear';
}

/** What one hand shows on its own (the reading itself is combined). */
export interface HandNote {
  person: number;
  hand: Hand;
  summary: string;
}

export interface FamilyPrediction {
  /** A number or small range, e.g. "2" or "1–2". "?" when the lines could not be assessed. */
  range: string;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  /** Missing on readings made before Nov 21 2026. */
  visibility?: Seen;
}

export interface Reading {
  headline: string;
  summary: string;
  /** Solo readings from Nov 21 2026: the life questions people care about most. */
  glance?: Glance;
  /** Couples readings, and solo readings made before Nov 21 2026. */
  traits?: Trait[];
  hand_notes?: HandNote[];
  sections: ReadingSection[];
  /** 3–5 concrete roles or fields (solo readings with a career section). */
  career_paths?: string[];
  timeline?: TimelineEntry[];
  family?: {
    marriages: FamilyPrediction;
    children: FamilyPrediction;
    timing: string;
  };
  action_steps: string[];
  closing: { kind: 'mantra' | 'reflection'; text: string };
  /** Copied from the request so the page can show that topic first. */
  curious?: Curious;
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
  /** Set once the photos have been deleted under the 3-year retention rule. */
  photosDeletedAt: string | null;
  marketingConsent: boolean;
}

/** Private-link ids: 22 base64url characters (128 random bits). */
export const READING_ID_RE = /^[A-Za-z0-9_-]{22}$/;
