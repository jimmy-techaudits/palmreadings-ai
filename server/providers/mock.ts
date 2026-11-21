// Offline provider for UI development and tests: returns canned, schema-shaped
// data after a short delay. Select it with AI_PROVIDER=mock (the default).
import type { HandObservation, LineObservation, PersonObservation, Reading, ReadingSection } from '../../shared/types';
import type { JsonRequest, Provider } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const line = (over: Partial<LineObservation>): LineObservation => ({
  visibility: 'clear',
  length: 'long',
  depth: 'deep',
  shape: 'gently_curved',
  starts: 'edge of palm below the little finger',
  ends: 'between the index and middle fingers',
  features: [],
  ...over,
});

const hand = (h: 'left' | 'right', withSide: boolean): HandObservation => ({
  hand: h,
  palm_shape: 'rectangular',
  finger_length: 'long',
  element: 'water',
  thumb: 'Low-set, wide angle from the palm',
  index_vs_ring: h === 'right' ? 'index_longer' : 'about_equal',
  lines: {
    heart: line({ shape: 'strongly_curved', features: h === 'left' ? ['small chain near the start'] : [] }),
    head: line({ shape: 'gently_curved', starts: 'joined to the life line', ends: 'below the ring finger', features: ["writer's fork at the end"] }),
    life: line({ starts: 'between thumb and index finger', ends: 'curving under the thumb toward the wrist', features: ['branch rising toward the index finger'] }),
    fate: line({ visibility: h === 'right' ? 'clear' : 'faint', length: 'medium', shape: 'straight', starts: 'from the life line mid-palm', ends: 'at the heart line' }),
    sun: line({ visibility: 'faint', length: 'short', shape: 'straight', starts: 'above the heart line', ends: 'below the ring finger' }),
    mercury: line({ visibility: 'not_visible', length: 'unclear', depth: 'unclear', shape: 'unclear', starts: 'n/a', ends: 'n/a' }),
  },
  mounts: [
    { mount: 'venus', prominence: 'prominent' },
    { mount: 'luna', prominence: 'average' },
    { mount: 'jupiter', prominence: h === 'right' ? 'prominent' : 'average' },
  ],
  markings: h === 'right' ? [{ marking: 'triangle', location: 'below the ring finger' }] : [],
  relationship_lines: withSide
    ? [
        { position: 'low (near heart line)', length: 'short', depth: 'faint', features: [] },
        { position: 'middle', length: 'long', depth: 'deep', features: ['one fine line rising from it'] },
      ]
    : [],
  children_lines_visible: withSide ? 1 : 0,
  notes: '',
});

function mockObservation(req: JsonRequest): PersonObservation {
  const text = req.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join(' ');
  const slots = [...new Set(text.match(/p[01]-(left|right)-(palm|side)/g) ?? [])];
  const hasSide = slots.some((s) => s.endsWith('side'));
  return {
    photo_checks: slots.map((slot) => ({ slot, usable: true, issue: '' })),
    hands: [hand('left', false), hand('right', hasSide)],
    overall_confidence: 'medium',
  };
}

type MockSection = Pick<ReadingSection, 'name' | 'tags' | 'lines' | 'body' | 'evidence'>;

const MOCK_SECTIONS: Record<string, MockSection> = {
  personality: {
    name: 'The Feeling Strategist',
    tags: ['Intuitive', 'Composed', 'Deep'],
    lines: ['head', 'heart'],
    body: 'Your **long, rectangular palm and long fingers** make yours a water hand: you take in more than most people notice, and you think before you speak.\n\nYour head line starts joined to your life line and ends in a **writer\u2019s fork**. You weigh things carefully before you move, and once you do, you can explain your thinking in a way people follow.',
    evidence: ['Water hand: rectangular palm, long fingers', 'Head line joined to the life line', 'Writer\u2019s fork at the end of the head line'],
  },
  potential_vs_path: {
    name: 'From Dreamer to Driver',
    tags: ['Growing', 'Self-made'],
    lines: ['fate', 'heart'],
    body: 'The biggest difference between your hands is the **fate line**. On your left hand it is faint; on your right it is clear and rises from your life line. You were not handed a direction. You built one, mostly on your own terms.\n\nThe small chain at the start of your left heart line has smoothed out on your right hand: early sensitivity that you have turned into steadiness.',
    evidence: ['Fate line faint on the left hand, clear on the right', 'Chain at the start of the left heart line only'],
  },
  love: {
    name: 'The Devoted Romantic',
    tags: ['Warm', 'Expressive', 'All-in'],
    lines: ['heart'],
    body: 'Your **heart line curves strongly upward** and ends between your index and middle fingers. You love openly and say so, but you also know where your limits are.\n\nA prominent Venus mount adds warmth and physical affection. When you commit, people feel it.',
    evidence: ['Strongly curved heart line ending between index and middle fingers', 'Prominent Venus mount'],
  },
  career: {
    name: 'The Creative Lead',
    tags: ['Strategic', 'Communicator'],
    lines: ['head', 'fate', 'sun'],
    body: 'With a **prominent Jupiter mount** on your dominant hand and an index finger longer than your ring finger, you are comfortable taking the lead.\n\nThe faint sun line and the triangle below your ring finger point to recognition through something you make or shape, not through status alone.',
    evidence: ['Prominent Jupiter mount on the right hand', 'Faint sun line', 'Triangle below the ring finger'],
  },
  energy: {
    name: 'Slow-Burn Stamina',
    tags: ['Resilient', 'Needs quiet'],
    lines: ['life'],
    body: 'Your **life line is long and deep** with a branch rising toward your index finger: steady energy and a period of growth you went after on purpose.\n\nYou recharge best alone. Protect that time and you can keep going long after others stop.',
    evidence: ['Long, deep life line', 'Branch rising from the life line toward the index finger'],
  },
  turning_points: {
    name: 'The Mid-Life Pivot',
    tags: ['Late bloomer', 'Intentional'],
    lines: ['fate', 'life'],
    body: 'Your fate line only becomes clear from mid-palm, which on the timing scale is **around your early 30s**. That is when your direction firmed up.\n\nIt runs up to your heart line, suggesting the next turning point is about what you care about rather than what you earn.',
    evidence: ['Fate line starting mid-palm from the life line', 'Fate line ending at the heart line'],
  },
};

const FALLBACK: MockSection = {
  name: 'The Balanced Giver',
  tags: ['Warm', 'Grounded'],
  lines: ['heart'],
  body: 'Your **heart line curves strongly upward** and ends between your index and middle fingers, which points to a balanced giver: openly affectionate, but grounded enough to protect your energy.\n\nOn your non-dominant hand the line starts with a small chain, a sign of early emotional sensitivity. On your dominant hand that chain has smoothed out, suggesting you have grown more secure in how you love.',
  evidence: ['Strongly curved heart line ending between index and middle fingers', 'Chain at the start of the left heart line'],
};

function mockReading(req: JsonRequest): Reading {
  const props = req.schema.properties as Record<string, any>;
  const ids: string[] = props.sections.items.properties.id.enum;
  const reading: Reading = {
    headline: 'A deep feeler with a strategist\u2019s mind',
    summary:
      'You feel everything deeply but have learned to lead with clarity. The long, curving heart line on both hands shows a generous, expressive heart, while your dominant hand\u2019s stronger fate line and prominent Jupiter mount show you have been steadily building authority and direction.',
    traits: [
      { label: 'Element', value: 'Water', line: 'none' },
      { label: 'Emotional type', value: 'The Open Heart', line: 'heart' },
      { label: 'Thinking style', value: 'Storyteller', line: 'head' },
      { label: 'Energy', value: 'Slow-burn stamina', line: 'life' },
      { label: 'Path', value: 'Self-made', line: 'fate' },
      { label: 'Superpower', value: 'Reading the room', line: 'none' },
    ],
    sections: ids.map((id) => ({
      id,
      title: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      ...(MOCK_SECTIONS[id] ?? FALLBACK),
    })),
    action_steps: [
      'Block one evening this week for a creative project with no goal attached.',
      'Tell someone close to you one specific thing you appreciate about them.',
      'Write down the decision you keep postponing and give yourself a date.',
    ],
    closing: { kind: 'mantra', text: 'I can feel deeply and still choose clearly.' },
  };
  if (props.family) {
    reading.family = {
      marriages: { range: '1\u20132', confidence: 'medium', explanation: 'One long, deep relationship line in the middle of the palm edge, plus a shorter, fainter line nearer the heart line.' },
      children: { range: '1', confidence: 'low', explanation: 'One fine vertical line rises from your main relationship line. These lines are delicate, so treat this lightly.' },
      timing: 'The deep middle line points to your most significant partnership forming roughly between your mid-20s and mid-30s.',
    };
  }
  return reading;
}

export function mockProvider(): Provider {
  return {
    name: 'mock',
    async generateJson<T>(req: JsonRequest): Promise<T> {
      await sleep(req.step === 'observe' ? 1500 : 2500);
      return (req.step === 'observe' ? mockObservation(req) : mockReading(req)) as T;
    },
  };
}
