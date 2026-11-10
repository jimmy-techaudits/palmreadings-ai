import type { PersonObservation, ReadingRequest } from '../../shared/types';
import { FOCUS_LABELS, sectionPlan } from '../../shared/plan';
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
- Be specific to these hands. Avoid generic statements that would fit anyone. Contrast the left and right hands where they differ.
- If a feature was not visible, do not invent it.
- Write in second person ("you"), warm and encouraging but honest. Short paragraphs. No headings inside section bodies.
- Do not put pronouns in parentheses next to names. Use given pronouns naturally; use they/them when none are given.
- Follow the ethics section of the rulebook strictly.

${RULEBOOK}`;
}

export function interpretUserText(req: ReadingRequest, observations: PersonObservation[]): string {
  const plan = sectionPlan(req.mode, req.focus, req.people);
  const people = req.people
    .map((p, i) => {
      const label = req.mode === 'couple' ? (i === 0 ? 'Person A' : 'Person B') : 'The person';
      return `${label}: name ${p.name?.trim() || (req.mode === 'couple' ? `Partner ${i === 0 ? 'A' : 'B'}` : 'not given')}, age ${p.age ?? 'not given'}, pronouns ${p.pronouns || 'they/them'}, dominant hand ${p.dominantHand}.`;
    })
    .join('\n');

  const sections = plan.map((s, i) => `${i + 1}. id "${s.id}", title "${s.title}": ${s.guidance}`).join('\n');

  const family = req.includeFamily
    ? `\nThe person opted in to marriage and children predictions. Fill "family" from the relationship and children lines (rulebook), using the dominant hand's side view. Give small ranges, honest confidence, and gentle wording. If the lines were not readable, say so in the explanation and use confidence "low".`
    : '';

  const age = req.people.some((p) => p.age) ? ' Use their age with the timing scale to say which phases are past, present and ahead.' : '';

  return `Reading type: ${req.mode === 'couple' ? 'Couples compatibility' : FOCUS_LABELS[req.focus]}.

${people}

Write exactly these sections, in this order:
${sections}${family}${age}

Observations (JSON, one entry per person in the order above):
${JSON.stringify(observations)}`;
}
