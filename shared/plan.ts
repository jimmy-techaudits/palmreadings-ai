import type { Focus, Hand, Mode, Person, SlotId } from './types';

export interface SlotSpec {
  slot: SlotId;
  person: 0 | 1;
  hand: Hand;
  view: 'palm' | 'side';
  required: boolean;
}

/**
 * Both palms are always required: the non-dominant hand shows innate potential,
 * the dominant hand shows what the person has built. The pinky-side view of the
 * dominant hand is where relationship and children lines sit, so it becomes
 * required when family predictions are requested.
 */
export function photoSlots(people: Person[], includeFamily: boolean): SlotSpec[] {
  const slots: SlotSpec[] = [];
  people.forEach((p, i) => {
    const person = i as 0 | 1;
    for (const hand of ['left', 'right'] as const) {
      slots.push({ slot: `p${person}-${hand}-palm`, person, hand, view: 'palm', required: true });
    }
    slots.push({
      slot: `p${person}-${p.dominantHand}-side`,
      person,
      hand: p.dominantHand,
      view: 'side',
      required: includeFamily,
    });
  });
  return slots;
}

export interface SectionSpec {
  id: string;
  title: string;
  guidance: string;
  /** Reserved for the paid tier (phase 4). Every section is shown for now. */
  tier: 'free' | 'premium';
}

const SOLO: Record<Focus, SectionSpec[]> = {
  overall: [
    { id: 'personality', title: 'Your Core Nature', guidance: 'Temperament and how they move through the world, from hand shape, element, thumb and head line.', tier: 'free' },
    { id: 'potential_vs_path', title: 'Born With vs. Built', guidance: 'Contrast the non-dominant (innate) hand with the dominant (developed) hand. Name concrete differences between the two hands.', tier: 'free' },
    { id: 'love', title: 'Love & Connection', guidance: 'How they love and what they need, from the heart line, Venus mount and relationship lines.', tier: 'premium' },
    { id: 'career', title: 'Work, Money & Purpose', guidance: 'Natural work style and where they thrive, from the head, fate and sun lines and the fingers.', tier: 'premium' },
    { id: 'energy', title: 'Energy & Resilience', guidance: 'Vitality, stress patterns and recharge style from the life line and mounts. Never discuss illness or lifespan.', tier: 'premium' },
    { id: 'turning_points', title: 'Turning Points', guidance: 'Approximate life phases and changes suggested by breaks, branches and the fate line, using the rulebook timing scale.', tier: 'premium' },
  ],
  love: [
    { id: 'love_style', title: 'How You Love', guidance: 'Emotional style and expression from the heart line shape, end point and depth.', tier: 'free' },
    { id: 'needs', title: 'What You Need From a Partner', guidance: 'Core needs and attachment tendencies, from the heart line, Venus mount and thumb.', tier: 'free' },
    { id: 'patterns', title: 'Patterns & Blind Spots', guidance: 'Recurring relationship patterns or blocks, from chains, islands, breaks and the head/heart relationship.', tier: 'premium' },
    { id: 'timeline', title: 'Your Romantic Timeline', guidance: 'Likely timing of significant relationships from relationship-line positions and heart-line branches.', tier: 'premium' },
    { id: 'next_chapter', title: 'The Next Chapter', guidance: 'Where love is heading now, contrasting the dominant and non-dominant hands.', tier: 'premium' },
  ],
  career: [
    { id: 'work_style', title: 'Your Natural Work Style', guidance: 'How they think and work, from the head line, hand shape and fingers.', tier: 'free' },
    { id: 'drive', title: 'Drive & Ambition', guidance: 'Motivation and leadership from the Jupiter mount, index finger and thumb.', tier: 'free' },
    { id: 'strengths', title: 'Where You Shine', guidance: 'Fields and roles that fit, from the sun and mercury lines and prominent mounts.', tier: 'premium' },
    { id: 'blockers', title: 'What Holds You Back', guidance: 'Hesitations or friction points, from head-line features and the head/life line start.', tier: 'premium' },
    { id: 'career_timeline', title: 'Career Turning Points', guidance: 'Phases and shifts from the fate line, using the rulebook timing scale.', tier: 'premium' },
  ],
};

const COUPLE: Record<Focus, SectionSpec[]> = {
  overall: [
    { id: 'person_a', title: '{A}: Needs & Patterns', guidance: 'What person A brings and needs, grounded in their hands.', tier: 'free' },
    { id: 'person_b', title: '{B}: Needs & Patterns', guidance: 'What person B brings and needs, grounded in their hands.', tier: 'free' },
    { id: 'dynamic', title: 'The Dynamic Between You', guidance: 'Where their hands complement or clash, comparing elements, heart lines and head lines side by side.', tier: 'premium' },
    { id: 'communication', title: 'Communication Translation Guide', guidance: 'How each one communicates and how the other can hear it, from head lines and mercury fingers.', tier: 'premium' },
    { id: 'long_term', title: 'Long-Term Potential', guidance: 'Shared trajectory and friction points over time, from fate and relationship lines.', tier: 'premium' },
  ],
  love: [],
  career: [],
};
COUPLE.love = COUPLE.overall;
COUPLE.career = COUPLE.overall;

export function sectionPlan(mode: Mode, focus: Focus, people: Person[]): SectionSpec[] {
  const base = mode === 'couple' ? COUPLE[focus] : SOLO[focus];
  const a = people[0]?.name?.trim() || 'Partner A';
  const b = people[1]?.name?.trim() || 'Partner B';
  return base.map((s) => ({ ...s, title: s.title.replace('{A}', a).replace('{B}', b) }));
}

export const FOCUS_LABELS: Record<Focus, string> = {
  overall: 'Full Life Reading',
  love: 'Love & Relationships',
  career: 'Career & Purpose',
};
