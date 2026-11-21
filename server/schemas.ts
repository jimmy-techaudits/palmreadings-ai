// JSON Schemas for structured model output. Kept to the subset that all three
// providers accept in strict mode: every object lists all properties as required
// and sets additionalProperties: false.

import { LINE_KEYS } from '../shared/types';

type Schema = Record<string, unknown>;

const str = (description?: string): Schema => (description ? { type: 'string', description } : { type: 'string' });
const enumOf = (values: string[], description?: string): Schema => ({ type: 'string', enum: values, ...(description ? { description } : {}) });
const arr = (items: Schema, description?: string): Schema => ({ type: 'array', items, ...(description ? { description } : {}) });
const obj = (properties: Record<string, Schema>, description?: string): Schema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
  ...(description ? { description } : {}),
});

const line = (description: string) =>
  obj(
    {
      visibility: enumOf(['clear', 'faint', 'not_visible']),
      length: enumOf(['short', 'medium', 'long', 'unclear']),
      depth: enumOf(['deep', 'moderate', 'shallow', 'unclear']),
      shape: enumOf(['straight', 'gently_curved', 'strongly_curved', 'unclear']),
      starts: str('Where the line begins, in landmark terms (e.g. "under the index finger", "joined to the life line"). "n/a" if not visible.'),
      ends: str('Where the line ends, in landmark terms. "n/a" if not visible.'),
      features: arr(str(), 'Breaks, forks, branches, chains, islands, crossings actually seen. Empty if none.'),
    },
    description,
  );

const hand = obj({
  hand: enumOf(['left', 'right']),
  palm_shape: enumOf(['square', 'rectangular', 'unclear']),
  finger_length: enumOf(['short', 'medium', 'long', 'unclear'], 'Finger length relative to palm length.'),
  element: enumOf(['earth', 'air', 'fire', 'water', 'unclear'], 'Square+short=earth, square+long=air, rectangular+short=fire, rectangular+long=water.'),
  thumb: str('Thumb set (high/low), size relative to hand, angle from palm. Only what is visible.'),
  index_vs_ring: enumOf(['index_longer', 'ring_longer', 'about_equal', 'unclear']),
  lines: obj({
    heart: line('Heart line: the upper horizontal line below the fingers.'),
    head: line('Head line: the middle horizontal line across the palm.'),
    life: line('Life line: the line arcing around the base of the thumb.'),
    fate: line('Fate line: vertical line up the center toward the middle finger.'),
    sun: line('Sun (Apollo) line: vertical line toward the ring finger.'),
    mercury: line('Mercury line: vertical/diagonal line toward the little finger.'),
  }),
  mounts: arr(
    obj({
      mount: enumOf(['jupiter', 'saturn', 'apollo', 'mercury', 'venus', 'luna', 'mars']),
      prominence: enumOf(['prominent', 'average', 'flat', 'unclear']),
    }),
  ),
  markings: arr(obj({ marking: str('e.g. star, cross, triangle, square, grille, trident, simian crease, girdle of Venus'), location: str() })),
  relationship_lines: arr(
    obj({
      position: str('Position between heart line and little-finger base: "low (near heart line)", "middle", or "high (near finger)".'),
      length: enumOf(['short', 'long']),
      depth: enumOf(['deep', 'faint']),
      features: arr(str(), 'Forks, breaks, islands, or lines rising/dropping off it.'),
    }),
    'Short horizontal lines on the palm edge below the little finger. Count only lines actually visible. Empty if the edge is not visible.',
  ),
  children_lines_visible: { type: 'integer', description: 'Fine vertical lines rising from the relationship lines. 0 if none or not visible.' },
  notes: str('Anything else notable about this hand. Empty string if nothing.'),
});

export const observationSchema: Schema = obj({
  photo_checks: arr(
    obj({
      slot: str('The photo label exactly as given.'),
      usable: { type: 'boolean', description: 'False only if this photo cannot be read: not a human hand, wrong view, too blurry, too dark, or lines hidden.' },
      issue: str('Short, friendly fix-it instruction if not usable (e.g. "Too dark: try near a window"). Empty string if usable.'),
    }),
  ),
  hands: arr(hand, 'One entry per distinct hand (left/right), merging palm and side views of the same hand.'),
  overall_confidence: enumOf(['high', 'medium', 'low']),
});

const seen = (description: string) => enumOf(['clear', 'faint', 'not_assessable'], description);
const lineRef = (description: string) => enumOf([...LINE_KEYS, 'none'], description);

const prediction = (what: string) =>
  obj({
    range: str(`The number of ${what} as a single number or a small range, e.g. "2" or "1–2". "?" only when visibility is "not_assessable".`),
    confidence: enumOf(['high', 'medium', 'low']),
    visibility: seen('How clearly the lines this is read from could be seen in the photos.'),
    summary: str('One plain sentence on what this means, e.g. "One deep, lasting partnership stands out, with an earlier romance before it."'),
  });

const glanceItem = (description: string) =>
  obj(
    {
      answer: str('A direct 1–4 word answer, e.g. "Creative leadership", "Self-built wealth", "Early 30s". Not a vague theme.'),
      detail: str('One short line on what it is based on, e.g. "Fate line strengthens from mid-palm".'),
      summary: str('One plain, specific sentence on what this means for the person, e.g. "You do your best work shaping ideas and leading others, more than following a set track."'),
      line: lineRef('The line this answer mainly comes from; "none" for hand shape, fingers, thumb or mounts.'),
      visibility: seen('How clearly the features behind this answer could be seen. "not_assessable" if they could not be read; then say so in answer.'),
    },
    description,
  );

/**
 * The free preview: headline, summary, life at a glance (or couples traits), what each hand shows,
 * and the marriage and children numbers. Written right after the photos are read.
 */
export function previewSchema(includeFamily: boolean, mode: 'solo' | 'couple'): Schema {
  const properties: Record<string, Schema> = {
    headline: str('One evocative line (max ~12 words) capturing the essence of the reading.'),
    summary: str('An opening paragraph (3–5 sentences) that is specific to these hands. Combine both hands.'),
  };
  if (mode === 'solo') {
    properties.glance = obj(
      {
        career: glanceItem('The kind of career that fits best.'),
        money: glanceItem('How money and success tend to come.'),
        turning_point: glanceItem('The biggest turning point and roughly when.'),
        life_path: glanceItem('The overall shape of their path, e.g. "Self-directed", "One steady calling".'),
      },
      'Your Life at a Glance: direct answers to the questions people come with.',
    );
  } else {
    properties.traits = arr(
      obj({
        label: str('A category, e.g. "Element", "Emotional type", "Thinking style", "Superpower".'),
        value: str('A memorable 1–4 word answer specific to these hands. Not a generic adjective.'),
        line: lineRef('The line this trait mostly comes from; "none" for hand shape, fingers, thumb or mounts.'),
      }),
      '4 to 6 at-a-glance traits about the couple, each from a different part of the hands.',
    );
  }
  properties.hand_notes = arr(
    obj({
      person: { type: 'integer', description: '0 for the first person, 1 for the second (couples).' },
      hand: enumOf(['left', 'right']),
      summary: str('1–2 sentences on what this hand shows on its own, in our method (non-dominant: natural tendencies; dominant: how they have developed them).'),
      lines: arr(
        obj({ line: enumOf([...LINE_KEYS]), note: str('One plain sentence on what this line shows on this hand, naming the feature, e.g. "Its strong upward curve points to someone who shows love openly."') }),
        'One entry per line that was visible on this hand.',
      ),
    }),
    'One entry per hand per person.',
  );
  if (includeFamily) {
    properties.family = obj({
      marriages: prediction('significant marriages or long-term partnerships'),
      children: prediction('potential children'),
    });
  }
  return obj(properties);
}

/** The paid part, written after payment from the same observations, consistent with the preview. */
export function fullSchema(sectionIds: string[], includeFamily: boolean, mode: 'solo' | 'couple'): Schema {
  const properties: Record<string, Schema> = {
    sections: arr(
      obj({
        id: enumOf(sectionIds),
        title: str('The section title exactly as given.'),
        name: str('A short, memorable name (2–4 words) for what this section found, e.g. "The Steady Anchor" or "Late-Blooming Leader". Accurate rather than flattering; never reuse a name across sections.'),
        tags: arr(str('One or two words, e.g. "Loyal", "Slow to trust".'), '2 or 3 qualities that sum up this section, not all positive.'),
        lines: arr(enumOf([...LINE_KEYS]), 'The 1–3 lines this section is mainly read from. Only lines that were visible. Empty if it rests on hand shape, fingers or mounts only.'),
        body: str('2–4 short paragraphs (each 2–4 sentences) separated by blank lines. **bold** allowed. No headings. Give direct answers, not vague themes. No filler that would fit anyone.'),
        tension: str('One or two sentences on a real challenge, contradiction or trade-off in this area, grounded in the features.'),
        evidence: arr(
          obj({ text: str('A short note of an observed feature, e.g. "Curved heart line ending under the index finger".'), visibility: enumOf(['clear', 'faint']) }),
          '1–4 observed features this section is based on.',
        ),
      }),
      'Exactly the requested sections, in the requested order.',
    ),
  };
  if (mode === 'solo') {
    properties.career_paths = arr(str('A concrete role or field, e.g. "Product design", "Running their own practice".'), '3 to 5 careers or fields that fit, most fitting first.');
    properties.timeline = arr(
      obj({
        when: str('Approximate period from the rulebook timing scale, e.g. "Earlier life", "Mid-20s", "Early 30s", "Mid-40s onward". "Later in life" when the scale gives no age.'),
        title: str('2–5 words, e.g. "Direction firms up".'),
        detail: str('One sentence naming the feature and what it suggests.'),
        area: enumOf(['love', 'career', 'life']),
        line: lineRef('The line this comes from.'),
        timing: enumOf(['approximate', 'unclear'], '"approximate" only when the rulebook timing scale supports the age; otherwise "unclear".'),
      }),
      '3 to 5 life periods or turning points in chronological order, only from features actually seen. The biggest one must match the turning point answer already given.',
    );
  }
  if (includeFamily) {
    properties.family = obj({
      marriages_explanation: str('Which lines the marriages number is based on and what each one suggests, in warm plain language (2–3 sentences).'),
      children_explanation: str('Which lines the children number is based on and what they suggest (2–3 sentences).'),
      timing: str('Approximate timing for significant relationships based on line positions, framed as tendencies.'),
    });
  }
  properties.action_steps = arr(str(), '3 concrete, doable reflection prompts or actions for the next two weeks, tied to the reading.');
  properties.closing = obj({ kind: enumOf(['mantra', 'reflection']), text: str() });
  return obj(properties);
}

/** What fullSchema returns, before it is merged into the reading. */
export interface FullPart {
  sections: import('../shared/types').ReadingSection[];
  career_paths?: string[];
  timeline?: import('../shared/types').TimelineEntry[];
  family?: { marriages_explanation: string; children_explanation: string; timing: string };
  action_steps: string[];
  closing: { kind: 'mantra' | 'reflection'; text: string };
}
