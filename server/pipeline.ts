import type { PersonObservation, Reading, ReadingRequest, StreamEvent } from '../shared/types';
import { sectionPlan } from '../shared/plan';
import { interpretSystem, interpretUserText, OBSERVE_SYSTEM, observeUserText, slotLabel } from './prompts';
import type { Part, Provider } from './providers/types';
import { observationSchema, readingSchema } from './schemas';

/**
 * Step 1 (Observe): one vision call per person describes what is visible and
 * checks photo quality. Step 2 (Interpret): one text-only call writes the
 * reading from those observations plus the rulebook.
 */
export async function runReading(req: ReadingRequest, provider: Provider, emit: (e: StreamEvent) => void) {
  emit({ type: 'stage', stage: 'observing' });

  const observations = await Promise.all(
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
  const plan = sectionPlan(req.mode, req.focus, req.people);
  const reading = await provider.generateJson<Reading>({
    step: 'interpret',
    system: interpretSystem(),
    parts: [{ type: 'text', text: interpretUserText(req, observations) }],
    schema: readingSchema(plan.map((s) => s.id), req.includeFamily),
    schemaName: 'palm_reading',
    maxTokens: 16000,
  });

  // Keep the planned order and titles even if the model drifts.
  const byId = new Map(reading.sections.map((s) => [s.id, s]));
  reading.sections = plan.flatMap((p) => {
    const s = byId.get(p.id);
    return s ? [{ ...s, title: p.title }] : [];
  });
  emit({ type: 'reading', reading });
}
