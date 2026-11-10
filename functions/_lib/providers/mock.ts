// Offline provider for UI development and tests: returns canned, schema-shaped
// data after a short delay. Select it with AI_PROVIDER=mock (the default).
import type { HandObservation, LineObservation, PersonObservation, Reading } from '../../../shared/types';
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

function mockReading(req: JsonRequest): Reading {
  const props = req.schema.properties as Record<string, any>;
  const ids: string[] = props.sections.items.properties.id.enum;
  const reading: Reading = {
    headline: 'A deep feeler with a strategist’s mind',
    summary:
      'Your hands tell the story of someone who feels everything deeply but has learned to lead with clarity. The long, curving heart line on both hands shows a generous, expressive heart, while your dominant hand’s stronger fate line and prominent Jupiter mount suggest you have been steadily building authority and direction.',
    traits: [
      { label: 'Element', value: 'Water' },
      { label: 'Love style', value: 'Warm and devoted' },
      { label: 'Work style', value: 'Creative strategist' },
      { label: 'Superpower', value: 'Reading the room' },
    ],
    sections: ids.map((id) => ({
      id,
      title: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      body:
        'Your **heart line curves strongly upward** and ends between your index and middle fingers, which points to a balanced giver: openly affectionate, but grounded enough to protect your energy.\n\nOn your non-dominant hand the line starts with a small chain, a sign of early emotional sensitivity. On your dominant hand that chain has smoothed out, suggesting you have grown more secure in how you love.',
      evidence: ['Strongly curved heart line ending between index and middle fingers', 'Chain at the start of the left heart line'],
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
      marriages: { range: '1–2', confidence: 'medium', explanation: 'One long, deep relationship line in the middle of the palm edge, plus a shorter, fainter line nearer the heart line.' },
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
