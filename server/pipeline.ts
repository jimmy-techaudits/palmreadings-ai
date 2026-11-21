import type { PersonObservation, Reading, ReadingRequest, StreamEvent } from '../shared/types';
import { sectionPlan } from '../shared/plan';
import { fullUserText, interpretSystem, OBSERVE_SYSTEM, observeUserText, previewUserText, slotLabel, type ReadingContext } from './prompts';
import type { Part, Provider } from './providers/types';
import { fullSchema, observationSchema, previewSchema, type FullPart } from './schemas';

/**
 * A reading is written in up to three model calls:
 *  1. Observe: one vision call per person describes what is visible and checks photo quality.
 *  2. Preview (free): headline, summary, life at a glance, what each hand shows, family numbers.
 *  3. Full (paid): every section, the timeline, career paths, family explanations, reflection and
 *     closing. Written from the stored observations, so it can run later when a preview is unlocked.
 */

export async function observe(req: ReadingRequest, provider: Provider): Promise<PersonObservation[]> {
  return Promise.all(
    req.people.map((_, i) => {
      const photos = req.photos.filter((p) => p.slot.startsWith(`p${i}-`));
      const parts: Part[] = [{ type: 'text', text: observeUserText(photos.map((p) => slotLabel(p.slot))) }];
      for (const p of photos) {
        parts.push({ type: 'text', text: `Photo ${slotLabel(p.slot)}:` });
        parts.push({ type: 'image', data: p.data });
      }
      return provider.generateJson<PersonObservation>({
        step: 'observe',
        system: OBSERVE_SYSTEM,
        parts,
        schema: observationSchema,
        schemaName: 'hand_observation',
        maxTokens: 8000,
      });
    }),
  );
}

/** Lines that were actually seen on any hand: answers may only point at these. */
function seenLines(observations: PersonObservation[]): Set<string> {
  return new Set(observations.flatMap((o) => o.hands.flatMap((h) => Object.entries(h.lines).filter(([, l]) => l.visibility !== 'not_visible').map(([k]) => k))));
}

const lineOk =
  (seen: Set<string>) =>
  <T extends { line?: string }>(x: T): T =>
    x.line && x.line !== 'none' && !seen.has(x.line) ? { ...x, line: 'none' } : x;

export async function writePreview(ctx: ReadingContext, observations: PersonObservation[], provider: Provider): Promise<Reading> {
  const reading = await provider.generateJson<Reading>({
    step: 'interpret',
    system: interpretSystem(),
    parts: [{ type: 'text', text: previewUserText(ctx, observations) }],
    schema: previewSchema(ctx.includeFamily, ctx.mode),
    schemaName: 'palm_reading_preview',
    maxTokens: 8000,
  });
  const ok = lineOk(seenLines(observations));
  reading.traits = reading.traits?.map(ok);
  if (reading.glance) {
    const g = reading.glance;
    reading.glance = { career: ok(g.career), money: ok(g.money), turning_point: ok(g.turning_point), life_path: ok(g.life_path) };
  }
  // Keep only hands that exist, and per-line notes for lines that were visible on that hand.
  reading.hand_notes = reading.hand_notes
    ?.map((n) => {
      const hand = observations[n.person]?.hands.find((h) => h.hand === n.hand);
      if (!hand) return null;
      return { ...n, lines: n.lines?.filter((l) => hand.lines[l.line] && hand.lines[l.line].visibility !== 'not_visible') };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);
  if (ctx.mode === 'solo' && ctx.curious) reading.curious = ctx.curious;
  return reading;
}

/** Writes the paid part and returns the complete reading (preview + full). */
export async function writeFull(ctx: ReadingContext, observations: PersonObservation[], preview: Reading, provider: Provider): Promise<Reading> {
  const plan = sectionPlan(ctx.mode, ctx.focus, ctx.people, ctx.includeFamily);
  const full = await provider.generateJson<FullPart>({
    step: 'interpret',
    system: interpretSystem(),
    parts: [{ type: 'text', text: fullUserText(ctx, observations, preview) }],
    schema: fullSchema(
      plan.map((s) => s.id),
      ctx.includeFamily,
      ctx.mode,
    ),
    schemaName: 'palm_reading_full',
    maxTokens: 16000,
  });

  // Keep the planned order and titles even if the model drifts, and only point at lines that were
  // actually seen so the hand diagrams never contradict the text.
  const seen = seenLines(observations);
  const byId = new Map(full.sections.map((s) => [s.id, s]));
  const sections = plan.flatMap((p) => {
    const s = byId.get(p.id);
    return s ? [{ ...s, title: p.title, tags: s.tags?.slice(0, 3), lines: s.lines?.filter((l) => seen.has(l)) }] : [];
  });

  const reading: Reading = {
    ...preview,
    sections,
    career_paths: full.career_paths?.slice(0, 5),
    timeline: full.timeline?.map(lineOk(seen)),
    action_steps: full.action_steps,
    closing: full.closing,
  };
  if (preview.family && full.family) {
    reading.family = {
      marriages: { ...preview.family.marriages, explanation: full.family.marriages_explanation },
      children: { ...preview.family.children, explanation: full.family.children_explanation },
      timing: full.family.timing,
    };
  }
  return reading;
}

/**
 * A new reading from photos, streamed as progress events. Free readings stop after the preview;
 * paid ones (paid up front) also write the full reading. `save` stores it and returns the private id.
 */
export async function runReading(
  req: ReadingRequest,
  provider: Provider,
  emit: (e: StreamEvent) => void,
  save: (reading: Reading, observations: PersonObservation[]) => Promise<string>,
  opts: { full: boolean },
) {
  emit({ type: 'stage', stage: 'observing' });
  const observations = await observe(req, provider);

  const issues = observations
    .flatMap((o) => o.photo_checks)
    .filter((c) => !c.usable)
    .map((c) => ({ slot: c.slot.split(' ')[0], reason: c.issue || 'This photo could not be read clearly.' }));
  if (issues.length > 0) {
    emit({ type: 'photo_issues', issues });
    return;
  }
  emit({ type: 'observations', observations });

  emit({ type: 'stage', stage: 'interpreting' });
  let reading = await writePreview(req, observations, provider);
  if (provider.name === 'mock') reading.sample = true;
  if (opts.full) {
    emit({ type: 'stage', stage: 'writing_full' });
    reading = await writeFull(req, observations, reading, provider);
  }

  let id: string | null = null;
  try {
    id = await save(reading, observations);
  } catch (e) {
    console.error('Saving reading failed:', e);
  }
  emit({ type: 'reading', reading, id });
}
