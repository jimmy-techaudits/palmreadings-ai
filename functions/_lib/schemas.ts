// JSON Schemas for structured model output. Kept to the subset that all three
// providers accept in strict mode: every object lists all properties as required
// and sets additionalProperties: false.

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

const prediction = obj({
  range: str('A small range or count, e.g. "1–2" or "2".'),
  confidence: enumOf(['high', 'medium', 'low']),
  explanation: str('Which lines this is based on, in warm plain language.'),
});

export function readingSchema(sectionIds: string[], includeFamily: boolean): Schema {
  const properties: Record<string, Schema> = {
    headline: str('One evocative line (max ~12 words) capturing the essence of the reading.'),
    summary: str('An opening paragraph (3–5 sentences) that is specific to these hands.'),
    traits: arr(obj({ label: str('e.g. "Element", "Love style", "Work style", "Superpower"'), value: str('2–4 words') }), '4 to 6 at-a-glance traits.'),
    sections: arr(
      obj({
        id: enumOf(sectionIds),
        title: str(),
        body: str('2–4 short paragraphs separated by blank lines. **bold** allowed. No headings.'),
        evidence: arr(str(), '1–4 short notes of the observed features this section is based on, e.g. "Curved heart line ending under the index finger".'),
      }),
      'Exactly the requested sections, in the requested order.',
    ),
    action_steps: arr(str(), '3 concrete, doable actions for the next two weeks.'),
    closing: obj({ kind: enumOf(['mantra', 'reflection']), text: str() }),
  };
  if (includeFamily) {
    properties.family = obj({
      marriages: prediction,
      children: prediction,
      timing: str('Approximate timing for significant relationships based on line positions, framed as tendencies.'),
    });
  }
  return obj(properties);
}
