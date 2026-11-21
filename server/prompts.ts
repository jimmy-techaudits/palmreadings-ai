import type { Curious, PersonObservation, Reading, ReadingRequest } from '../shared/types';
import { FOCUS_LABELS, sectionPlan } from '../shared/plan';
import { RULEBOOK } from './rulebook';

export const OBSERVE_SYSTEM = `You are a meticulous palmistry analyst. Your only job is to describe what is physically visible in hand photos, accurately and conservatively. You do not interpret meaning.

Rules:
- Describe only what you can actually see. If a line or feature is not visible, mark it "not_visible" or "unclear" rather than guessing.
- Use the physical landmarks named in the schema (fingers, thumb, wrist, palm edge).
- Merge palm and side views of the same hand into one hand entry.
- Side views show the outer palm edge below the little finger: count relationship lines and children lines there carefully.
- Also judge each photo: mark it unusable only if it is not a human hand, shows the wrong view, or is too blurry, dark, small, or obstructed to read the major lines. Minor imperfections are fine.`;

export function observeUserText(slotLabels: string[]): string {
  return `Photos are labelled before each image: ${slotLabels.join(', ')}. Describe each hand following the schema.`;
}

/** Human label for a slot, e.g. "p0-right-palm" -> "right hand, palm". */
export function slotLabel(slot: string): string {
  const [, hand, view] = slot.split('-');
  return `${slot} (${hand} hand, ${view === 'side' ? 'pinky-side edge' : 'palm'})`;
}

export function interpretSystem(): string {
  return `You are a warm, insightful, world-class palm reader writing for PalmReadings.ai.

You are given structured observations of a person's hands, made by a separate analyst, plus a rulebook of traditional interpretations. Write the reading from them.

Rules:
- Ground every claim in an observed feature, and take its meaning from the rulebook. Mention the feature naturally in the prose ("Your heart line sweeps up toward your index finger, which…").
- People come with direct questions: will I marry and how many times, how many children, what career suits me, will I do well financially, when will my life change. Answer them directly, the way a traditional palm reader would: give numbers, named career directions and approximate ages, then explain what they are based on. The page adds a disclaimer that these are traditional interpretations, not guarantees, so do not hedge every sentence.
- The reading is one combined interpretation of both hands. In our method the non-dominant hand shows natural tendencies and the dominant hand shows how the person has developed them; present this as the method this reading follows, not a universal law.
- Be specific to these hands. Avoid generic statements that would fit anyone.
- Not everything is flattering. Each section's tension names a real challenge, contradiction or trade-off from the features, and section names should be accurate rather than complimentary. Sensitivity can sit beside ambition; a self-made path can include years of uncertainty.
- Stay consistent with the observations. Never describe a faint, short or unclear line as strong, deep or long, and never let a section contradict another or the timeline.
- If a feature an answer depends on was not visible, say it cannot be assessed from these photos and mark it "not_assessable". Never invent a feature or a number to give a more exciting answer.
- Keep it tight. No opening filler ("Your palm is a map of who you are…"), no point repeated in a later section.
- No scores, percentages or numeric ratings, and no health, lifespan or addiction claims of any kind.
- Write in second person ("you"), warm but honest. Short paragraphs. No headings inside section bodies except where a section's instructions ask for bold lead-ins.
- Do not put pronouns in parentheses next to names. Use given pronouns naturally; use they/them when none are given.
- Follow the ethics section of the rulebook strictly.

${RULEBOOK}`;
}

const CURIOUS_TEXT: Record<Curious, string> = {
  marriage: 'marriage and long-term partnerships ("Marriage & Family" and the marriages count)',
  children: 'children ("Marriage & Family" and the children count)',
  career: 'career (the career section, career paths and the career answer)',
  money: 'money and financial success (the money section and the money answer)',
  life_changes: 'when major life changes will happen (the timeline and the turning point answer)',
};

/** What the writing steps need to know about a reading (no photos). */
export type ReadingContext = Pick<ReadingRequest, 'mode' | 'focus' | 'includeFamily' | 'people' | 'curious'>;

function peopleText(ctx: ReadingContext): string {
  return ctx.people
    .map((p, i) => {
      const label = ctx.mode === 'couple' ? (i === 0 ? 'Person A' : 'Person B') : 'The person';
      return `${label}: name ${p.name?.trim() || (ctx.mode === 'couple' ? `Partner ${i === 0 ? 'A' : 'B'}` : 'not given')}, age ${p.age ?? 'not given'}, pronouns ${p.pronouns || 'they/them'}, dominant hand ${p.dominantHand}.`;
    })
    .join('\n');
}

function extras(ctx: ReadingContext, familyPart: 'numbers' | 'explanations'): string {
  const family = ctx.includeFamily
    ? familyPart === 'numbers'
      ? `\nThe person opted in to marriage and children predictions. Fill "family" from the relationship and children lines (rulebook), using the dominant hand's side view: give the count as a number or small range, honest confidence and visibility, and a one-sentence summary. If the lines were not readable, use "?" with visibility "not_assessable" and say so in the summary.`
      : `\nExplain the marriage and children numbers already given (do not change them) in "family", and give the timing.`
    : `\nMarriage and children predictions were not requested (no side photo), so do not predict numbers of marriages or children anywhere.`;
  const age = ctx.people.some((p) => p.age) ? ' Use their age with the timing scale to say which phases are past, present and ahead.' : '';
  const curious =
    ctx.curious && ctx.mode === 'solo'
      ? `\nThey are most curious about ${CURIOUS_TEXT[ctx.curious]}. Give that area the most depth and the most direct answer.`
      : '';
  return `${family}${age}${curious}`;
}

/** The free preview: headline, summary, life at a glance, what each hand shows, family numbers. */
export function previewUserText(ctx: ReadingContext, observations: PersonObservation[]): string {
  return `Reading type: ${ctx.mode === 'couple' ? 'Couples compatibility' : FOCUS_LABELS[ctx.focus]}.

${peopleText(ctx)}

Write the opening of the reading: the headline, the summary, ${ctx.mode === 'solo' ? 'the life-at-a-glance answers' : 'the at-a-glance traits'}, a note on each hand with one sentence per visible line, and the family numbers if requested. Each summary sentence should stand on its own and be specific to these hands. The full sections are written separately later.${extras(ctx, 'numbers')}

Observations (JSON, one entry per person in the order above):
${JSON.stringify(observations)}`;
}

/** The paid part: every section, the timeline, career paths, family explanations, reflection and closing. */
export function fullUserText(ctx: ReadingContext, observations: PersonObservation[], preview: Reading): string {
  const plan = sectionPlan(ctx.mode, ctx.focus, ctx.people, ctx.includeFamily);
  const sections = plan.map((s, i) => `${i + 1}. id "${s.id}", title "${s.title}": ${s.guidance}`).join('\n');
  const shown = {
    headline: preview.headline,
    summary: preview.summary,
    glance: preview.glance,
    traits: preview.traits,
    family: preview.family,
    hand_notes: preview.hand_notes,
  };
  return `Reading type: ${ctx.mode === 'couple' ? 'Couples compatibility' : FOCUS_LABELS[ctx.focus]}.

${peopleText(ctx)}

The person has already seen the opening of their reading (below). Write the rest of it. Stay consistent with every answer already given and do not repeat it word for word: go deeper.

Write exactly these sections, in this order:
${sections}${extras(ctx, 'explanations')}

Already shown (JSON):
${JSON.stringify(shown)}

Observations (JSON, one entry per person in the order above):
${JSON.stringify(observations)}`;
}
