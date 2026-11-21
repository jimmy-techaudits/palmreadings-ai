import type { Focus, Hand, Mode, Person, SlotId } from './types';

export interface SlotSpec {
  slot: SlotId;
  person: 0 | 1;
  hand: Hand;
  view: 'palm' | 'side';
  required: boolean;
}

/**
 * Both palms are always required: in our method the non-dominant hand shows natural tendencies,
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

const MARRIAGE_FAMILY: SectionSpec = {
  id: 'marriage_family',
  title: 'Marriage & Family',
  guidance:
    'Significant partnerships and family from the relationship and children lines on the palm edge: how many, how deep, roughly when, and what kind of bond each line suggests. Match the numbers given in "family". Where lines were not readable, say so.',
  tier: 'premium',
};

const CAREER: SectionSpec = {
  id: 'career',
  title: 'Career & Success',
  guidance:
    'Three short paragraphs, each starting with a bold lead-in. **Direction.** The kinds of work, roles and environments that fit, named concretely. **How it evolves.** Steady path, late start, changes of direction or self-directed work, from the fate line. **Recognition.** Ambition, leadership and how success tends to show up. From the head, fate and sun lines, the Jupiter mount and the fingers.',
  tier: 'premium',
};

const MONEY: SectionSpec = {
  id: 'money',
  title: 'Money & Prosperity',
  guidance:
    'Earning style, independence, appetite for risk, and how money tends to come (steady build, own ventures, recognition for their work), from the fate, sun and mercury lines, head line shape, thumb, and Jupiter and Mercury mounts. Traditional tendencies only, never financial advice or guarantees.',
  tier: 'premium',
};

const SOLO: Record<Focus, SectionSpec[]> = {
  overall: [
    { id: 'personality', title: 'Your Core Nature', guidance: 'Temperament, strengths and inner contradictions, from hand shape, element, thumb, fingers and head line. How they think, what drives them, and where they get in their own way.', tier: 'free' },
    { id: 'potential_vs_path', title: 'Born With vs. Built', guidance: 'In our method the non-dominant hand shows natural tendencies and the dominant hand shows how they have developed them. Go feature by feature: what stayed the same between the two hands and what changed, and what that says about the path they have taken.', tier: 'free' },
    { id: 'love', title: 'Love & Relationships', guidance: 'How they love, what they need from a partner, and their relationship patterns, from the heart line, Venus mount and how the head and heart lines relate.', tier: 'premium' },
    MARRIAGE_FAMILY,
    CAREER,
    MONEY,
    { id: 'energy', title: 'Energy & Wellbeing', guidance: 'Vitality, how they handle pressure and how they recharge, from the life line and Venus and Mars mounts. Traditional symbolism only: never medical claims, illness or lifespan.', tier: 'premium' },
  ],
  love: [
    { id: 'love_style', title: 'How You Love', guidance: 'Emotional style and expression from the heart line shape, end point and depth.', tier: 'free' },
    { id: 'needs', title: 'What You Need From a Partner', guidance: 'Core needs and attachment tendencies, from the heart line, Venus mount and thumb.', tier: 'free' },
    { id: 'patterns', title: 'Patterns & Blind Spots', guidance: 'Recurring relationship patterns or blocks, from chains, islands, breaks and the head/heart relationship.', tier: 'premium' },
    MARRIAGE_FAMILY,
    { id: 'next_chapter', title: 'The Next Chapter', guidance: 'Where love is heading now, contrasting the dominant and non-dominant hands.', tier: 'premium' },
  ],
  career: [
    { id: 'work_style', title: 'Your Natural Work Style', guidance: 'How they think and work, from the head line, hand shape and fingers.', tier: 'free' },
    { id: 'drive', title: 'Drive & Ambition', guidance: 'Motivation and leadership from the Jupiter mount, index finger and thumb.', tier: 'free' },
    { ...CAREER, id: 'strengths', title: 'Where You Shine' },
    MONEY,
    { id: 'blockers', title: 'What Holds You Back', guidance: 'Hesitations or friction points, from head-line features and the head/life line start.', tier: 'premium' },
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

export function sectionPlan(mode: Mode, focus: Focus, people: Person[], includeFamily: boolean): SectionSpec[] {
  // Marriage & Family needs the pinky-side photo, so it is only planned when that was requested.
  const base = (mode === 'couple' ? COUPLE[focus] : SOLO[focus]).filter((s) => includeFamily || s.id !== 'marriage_family');
  const a = people[0]?.name?.trim() || 'Partner A';
  const b = people[1]?.name?.trim() || 'Partner B';
  return base.map((s) => ({ ...s, title: s.title.replace('{A}', a).replace('{B}', b) }));
}

export const FOCUS_LABELS: Record<Focus, string> = {
  overall: 'Full Life Reading',
  love: 'Love & Relationships',
  career: 'Career & Purpose',
};
