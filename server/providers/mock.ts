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

type MockSection = Pick<ReadingSection, 'name' | 'tags' | 'lines' | 'body' | 'tension' | 'evidence'>;

const ev = (text: string, visibility: 'clear' | 'faint' = 'clear') => ({ text, visibility });

const MOCK_SECTIONS: Record<string, MockSection> = {
  personality: {
    name: 'The Feeling Strategist',
    tags: ['Intuitive', 'Composed', 'Overthinks'],
    lines: ['head', 'heart'],
    body: 'Your **long, rectangular palm and long fingers** make yours a water hand: you take in more than most people notice, and you read moods before anyone says a word.\n\nYour head line starts joined to your life line and ends in a **writer’s fork**. You weigh things carefully before you move, and once you do, you can explain your thinking in a way people follow. You are at your best translating between people: the feeler who can also make the plan.',
    tension: 'The same joined head and life line that makes you careful can keep you waiting for certainty that never comes. Your hands show a strategist who sometimes plans instead of acting.',
    evidence: [ev('Water hand: rectangular palm, long fingers'), ev('Head line joined to the life line'), ev('Writer’s fork at the end of the head line')],
  },
  potential_vs_path: {
    name: 'From Dreamer to Driver',
    tags: ['Self-made', 'Late direction'],
    lines: ['fate', 'heart'],
    body: 'In our method your left hand shows natural tendencies and your right hand shows what you have done with them. The biggest change is the **fate line**: faint on your left hand, clear on your right, rising from your life line. You were not handed a direction. You built one, mostly on your own terms.\n\nWhat stayed the same: the long, curving heart line on both hands. The warmth was always there. What changed: the small chain at the start of your left heart line has smoothed out on your right hand, early sensitivity you have turned into steadiness.',
    tension: 'A path you built yourself is one you can also doubt. The faint start of the fate line suggests years where it felt like you were improvising.',
    evidence: [ev('Fate line faint on the left hand, clear on the right'), ev('Chain at the start of the left heart line only', 'faint')],
  },
  love: {
    name: 'All In, Eventually',
    tags: ['Devoted', 'Expressive', 'Slow to trust'],
    lines: ['heart'],
    body: 'Your **heart line curves strongly upward** and ends between your index and middle fingers: you love openly and say so, but you also know where your limits are. A prominent Venus mount adds warmth and physical affection.\n\nThe chain at the start of your left heart line suggests you were hurt or overwhelmed early and learned to test people before letting them in. Once someone passes, you are fiercely loyal.',
    tension: 'You give a lot once you commit, and expect the same back without always saying so. Partners can fail tests they never knew they were taking.',
    evidence: [ev('Strongly curved heart line ending between index and middle fingers'), ev('Prominent Venus mount'), ev('Chain at the start of the left heart line', 'faint')],
  },
  marriage_family: {
    name: 'One Deep Bond',
    tags: ['Committed', 'Late-blooming'],
    lines: ['heart'],
    body: 'On the edge of your palm there are **two relationship lines**. The lower one, near the heart line, is short and faint: an early romance that mattered but did not become a lasting commitment. The middle one is **long and deep**, the classic sign of one significant marriage or life partnership, traditionally placed between your mid-20s and mid-30s.\n\nOne fine vertical line rises from that deep line, which traditional palmistry reads as **one child** or one deep nurturing bond. These lines are delicate, so read this lightly.',
    tension: 'The early faint line suggests a first relationship you may still measure others against.',
    evidence: [ev('Long, deep relationship line in the middle of the palm edge'), ev('Short, faint relationship line near the heart line', 'faint'), ev('One fine vertical line rising from the deep line', 'faint')],
  },
  career: {
    name: 'The Creative Lead',
    tags: ['Strategic', 'Communicator', 'Restless'],
    lines: ['head', 'fate', 'sun'],
    body: '**Direction.** A gently curved head line with a writer’s fork, a prominent Jupiter mount and an index finger longer than your ring finger point to work where you shape ideas and lead people: creative direction, product or brand strategy, teaching, or running your own practice.\n\n**How it evolves.** Your fate line only becomes clear from mid-palm and rises from your life line. That is a self-made path: a few years of trying things, then a clear direction from around your early 30s.\n\n**Recognition.** The faint sun line and the triangle below your ring finger suggest recognition for something you make, not for your title.',
    tension: 'You want to lead and you want to create, and roles rarely give you both. Expect pressure to choose between managing the work and doing it.',
    evidence: [ev('Prominent Jupiter mount on the right hand'), ev('Fate line clear from mid-palm'), ev('Faint sun line', 'faint'), ev('Triangle below the ring finger')],
  },
  money: {
    name: 'Built, Not Given',
    tags: ['Independent', 'Steady earner', 'Cautious'],
    lines: ['fate', 'sun'],
    body: 'A fate line that starts from the life line is the traditional mark of **self-built money**: you earn it through your own effort rather than inheriting a path. With a clear fate line on your dominant hand, income tends to grow steadily once your direction is set, from your early 30s on.\n\nThe faint sun line adds a second stream: reward for your creative work, smaller at first and growing with recognition.',
    tension: 'Your joined head and life line makes you careful with risk. Your hands suggest your biggest financial gains come from the bets you hesitate to make.',
    evidence: [ev('Fate line rising from the life line'), ev('Faint sun line', 'faint'), ev('Head line joined to the life line')],
  },
  energy: {
    name: 'Slow-Burn Stamina',
    tags: ['Resilient', 'Needs solitude'],
    lines: ['life'],
    body: 'Your **life line is long and deep** with a branch rising toward your index finger: steady energy and a period of growth you went after on purpose.\n\nYou recharge best alone. Protect that time and you can keep going long after others stop.',
    tension: 'Steady stamina can hide tiredness until it is a lot. You are more likely to push through than to notice you need a break.',
    evidence: [ev('Long, deep life line'), ev('Branch rising from the life line toward the index finger')],
  },
};

const FALLBACK: MockSection = {
  name: 'The Balanced Giver',
  tags: ['Warm', 'Grounded'],
  lines: ['heart'],
  body: 'Your **heart line curves strongly upward** and ends between your index and middle fingers, which points to a balanced giver: openly affectionate, but grounded enough to protect your energy.\n\nOn your non-dominant hand the line starts with a small chain, a sign of early emotional sensitivity. On your dominant hand that chain has smoothed out, suggesting you have grown more secure in how you love.',
  tension: 'Being the steady one can mean your own needs go unspoken.',
  evidence: [ev('Strongly curved heart line ending between index and middle fingers'), ev('Chain at the start of the left heart line', 'faint')],
};

function mockReading(req: JsonRequest): Reading {
  const props = req.schema.properties as Record<string, any>;
  const ids: string[] = props.sections.items.properties.id.enum;
  const reading: Reading = {
    headline: 'A deep feeler with a strategist’s mind',
    summary:
      'You feel everything deeply but have learned to lead with clarity. The long, curving heart line on both hands shows a generous, expressive heart, while your dominant hand’s stronger fate line and prominent Jupiter mount show you have been steadily building authority and direction, mostly on your own.',
    hand_notes: [
      { person: 0, hand: 'left', summary: 'Your left hand shows the raw material: a water hand with a strongly curved heart line that starts in a small chain, and a fate line that is barely there. Natural sensitivity, and no fixed direction yet.' },
      { person: 0, hand: 'right', summary: 'Your right hand shows what you have built: the heart line has smoothed out, the fate line is clear from mid-palm, and the Jupiter mount is prominent with a triangle below the ring finger. Direction and confidence you earned.' },
    ],
    sections: ids.map((id) => ({
      id,
      title: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      ...(MOCK_SECTIONS[id] ?? FALLBACK),
    })),
    action_steps: [
      'Name the one creative project you keep postponing and give it a date.',
      'Notice one test you set for someone close to you this week, and say it out loud instead.',
      'Write down what “enough” money looks like for you, in a number.',
    ],
    closing: { kind: 'mantra', text: 'I can feel deeply and still choose clearly.' },
  };
  if (props.glance) {
    reading.glance = {
      career: { answer: 'Creative leadership', detail: 'Writer’s fork and a prominent Jupiter mount', line: 'head', visibility: 'clear' },
      money: { answer: 'Self-built wealth', detail: 'Fate line rising from the life line', line: 'fate', visibility: 'clear' },
      turning_point: { answer: 'Early 30s', detail: 'Fate line becomes clear from mid-palm', line: 'fate', visibility: 'clear' },
      life_path: { answer: 'Self-directed', detail: 'Faint fate line on the left hand, clear on the right', line: 'fate', visibility: 'faint' },
    };
    reading.career_paths = ['Creative direction', 'Product or brand strategy', 'Teaching or training', 'Running your own practice'];
    reading.timeline = [
      { when: 'Earlier life', title: 'Sensitive beginnings', detail: 'The chain at the start of your left heart line: feeling things intensely and learning to protect yourself.', area: 'love', line: 'heart', timing: 'approximate' },
      { when: 'Mid-20s to mid-30s', title: 'The significant partnership', detail: 'Your deepest relationship line sits in the middle of the palm edge.', area: 'love', line: 'none', timing: 'approximate' },
      { when: 'Early 30s', title: 'Direction firms up', detail: 'Your fate line becomes clear from mid-palm, rising from your life line.', area: 'career', line: 'fate', timing: 'approximate' },
      { when: 'Later in life', title: 'Heart over status', detail: 'The fate line runs up to the heart line: priorities shift toward what you care about. The palm gives no clear age for this.', area: 'life', line: 'fate', timing: 'unclear' },
    ];
  } else {
    reading.traits = [
      { label: 'Element match', value: 'Water meets Fire', line: 'none' },
      { label: 'Love styles', value: 'Devoted and bold', line: 'heart' },
      { label: 'Thinking', value: 'Planner and improviser', line: 'head' },
      { label: 'Shared strength', value: 'Loyalty', line: 'heart' },
    ];
    reading.hand_notes = [...reading.hand_notes!, ...reading.hand_notes!.map((n) => ({ ...n, person: 1 }))];
  }
  if (props.family) {
    reading.family = {
      marriages: { range: '1–2', confidence: 'medium', visibility: 'clear', explanation: 'One long, deep relationship line in the middle of the palm edge marks one significant marriage or partnership. A shorter, fainter line nearer the heart line could be an earlier serious romance.' },
      children: { range: '1', confidence: 'low', visibility: 'faint', explanation: 'One fine vertical line rises from your main relationship line. These lines are delicate and hard to photograph, so treat this lightly.' },
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
