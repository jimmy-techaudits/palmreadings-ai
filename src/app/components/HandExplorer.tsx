import { useEffect, useState } from 'react';
import { ChevronDown, Hand as HandIcon } from 'lucide-react';
import { LINE_KEYS, type Hand, type HandNote, type HandObservation, type LineKey, type PersonObservation, type Seen } from '../../../shared/types';
import { HandDiagram } from './HandDiagram';
import { LINE_COLORS, LINE_MEANINGS, LINE_NAMES, lineWords } from './observationText';
import type { ResultPhoto } from './ReadingTools';
import { cap, Dot, SeenLabel } from './readingUi';

interface Props {
  mode: string;
  observations: PersonObservation[];
  dominantHands?: Hand[];
  personName: (i: number) => string;
  notes?: HandNote[];
  photos?: ResultPhoto[];
}

/** In our method: non-dominant = natural tendencies, dominant = developed path. */
function roleOf(hand: Hand, dominant?: Hand) {
  if (!dominant) return { title: `${cap(hand)} hand`, sub: '' };
  return hand === dominant
    ? { title: `${cap(hand)} hand`, sub: 'Your developed path' }
    : { title: `${cap(hand)} hand`, sub: 'Your natural tendencies' };
}

/**
 * "Explore your hands": the reading itself is combined; this shows what each
 * hand looks like on its own, with the photo, a drawn diagram, every line's
 * visibility, and a short note on what that hand shows.
 */
export function HandExplorer({ mode, observations, dominantHands, personName, notes, photos }: Props) {
  const [person, setPerson] = useState(0);
  const [side, setSide] = useState<Hand>(dominantHands?.[0] ?? 'right');
  const [active, setActive] = useState<LineKey | null>(null);
  useEffect(() => setActive(null), [person, side]);

  const hands = observations[person]?.hands ?? [];
  const hand = hands.find((h) => h.hand === side) ?? hands[0];
  if (!hand) return null;

  const dominant = dominantHands?.[person];
  const note = notes?.find((n) => n.person === person && n.hand === hand.hand);
  const photo = photos?.find((p) => p.slot === `p${person}-${hand.hand}-palm`);
  const ordered = (['left', 'right'] as const).flatMap((s) => hands.filter((h) => h.hand === s));

  const shape = [
    hand.element !== 'unclear' ? `${cap(hand.element)} hand` : '',
    hand.palm_shape !== 'unclear' ? `${hand.palm_shape} palm` : '',
    hand.finger_length !== 'unclear' ? `${hand.finger_length} fingers` : '',
    hand.index_vs_ring === 'index_longer' ? 'index finger longer than ring' : hand.index_vs_ring === 'ring_longer' ? 'ring finger longer than index' : '',
  ].filter(Boolean);

  return (
    <section id="s-hands" className="panel mb-5 scroll-mt-6 overflow-hidden" aria-labelledby="hands-title">
      <div className="px-5 pt-5 sm:px-8 sm:pt-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">What we saw</p>
        <h2 id="hands-title" className="font-display text-2xl text-white print-dark">Explore your hands</h2>
        <p className="mt-1 text-sm text-violet-200/80 print-dark">
          Your reading combines both hands. In our method, your non-dominant hand shows natural tendencies and your dominant hand shows how you’ve
          developed them.
        </p>

        {mode === 'couple' && (
          <div role="radiogroup" aria-label="Person" className="mt-4 inline-flex rounded-xl border border-white/10 bg-night-900/60 p-1 print:hidden">
            {observations.map((_, i) => (
              <button
                key={i}
                role="radio"
                aria-checked={person === i}
                onClick={() => {
                  setPerson(i);
                  setSide(dominantHands?.[i] ?? 'right');
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${person === i ? 'bg-gold-400 text-night-900' : 'text-violet-200 hover:text-white'}`}
              >
                {personName(i)}
              </button>
            ))}
          </div>
        )}

        <div role="radiogroup" aria-label="Hand" className="mt-4 grid grid-cols-2 gap-3 print:hidden">
          {ordered.map((h) => {
            const role = roleOf(h.hand, dominant);
            const on = h.hand === hand.hand;
            return (
              <button
                key={h.hand}
                role="radio"
                aria-checked={on}
                onClick={() => setSide(h.hand)}
                className={`flex flex-col items-center rounded-2xl border px-3 py-3 text-center transition ${
                  on ? 'border-gold-400 bg-gold-400/10' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <HandIcon size={18} className={`${h.hand === 'left' ? '-scale-x-100' : ''} ${on ? 'text-gold-400' : 'text-violet-300'}`} />
                <span className="mt-1 font-bold text-white">{role.title}</span>
                {role.sub && <span className="text-xs text-violet-300/80">{role.sub}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:p-8">
        <div>
          <div className={`grid gap-3 ${photo ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {photo && (
              <figure>
                <a href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10 bg-night-900">
                  <img src={photo.url} alt={`Your ${hand.hand} palm`} className="aspect-[22/29] w-full object-cover" />
                </a>
                <figcaption className="mt-1.5 text-center text-xs text-violet-300/70">Your photo</figcaption>
              </figure>
            )}
            <figure className={photo ? '' : 'mx-auto w-full max-w-[15rem]'}>
              <div className="rounded-xl bg-night-950/60">
                <HandDiagram hand={hand} highlight={active ? [active] : undefined} className="w-full" />
              </div>
              <figcaption className="mt-1.5 text-center text-xs text-violet-300/70">The lines we read</figcaption>
            </figure>
          </div>
          {shape.length > 0 && <p className="mt-3 text-center text-sm text-violet-300/80 print-muted">{shape.join(' · ')}</p>}
          {note && (
            <p className="mt-4 rounded-xl bg-white/[0.04] p-4 font-read leading-relaxed text-violet-100 print-dark">{note.summary}</p>
          )}
        </div>

        <div>
          <ul className="space-y-1.5">
            {LINE_KEYS.map((k) => {
              const l = hand.lines[k];
              const words = lineWords(l);
              const visible = words.length > 0;
              const seen: Seen = l.visibility === 'not_visible' ? 'not_assessable' : l.visibility;
              const on = active === k;
              return (
                <li key={k}>
                  <button
                    type="button"
                    disabled={!visible}
                    onClick={() => setActive(on ? null : k)}
                    aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition ${
                      on ? 'bg-white/10' : visible ? 'hover:bg-white/5' : 'cursor-default opacity-55'
                    }`}
                  >
                    <Dot color={visible ? LINE_COLORS[k] : 'rgb(255 255 255 / 0.25)'} className="mt-1.5 size-2.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white print-dark">
                        {LINE_NAMES[k]} <span className="font-normal text-violet-300/70">· {LINE_MEANINGS[k]}</span>
                      </span>
                      {visible && (
                        <span className="block text-sm text-violet-200/90 print-muted">
                          {words.join(' · ')}
                          {l.features.length > 0 && <span className="text-violet-300/70"> · {l.features.join(', ')}</span>}
                        </span>
                      )}
                      <SeenLabel seen={seen} className="mt-0.5" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 px-3 text-xs leading-relaxed text-violet-300/60 print:hidden">
            Tap a line to find it on the diagram. The diagram is drawn from what we observed, not traced from your photo.
          </p>
        </div>
      </div>

      <HandDetails hand={hand} />
    </section>
  );
}

function HandDetails({ hand }: { hand: HandObservation }) {
  const [open, setOpen] = useState(false);
  const mounts = hand.mounts.filter((m) => m.prominence === 'prominent' || m.prominence === 'flat');
  const items = [
    hand.thumb && `Thumb: ${hand.thumb}`,
    ...mounts.map((m) => `${cap(m.mount)} mount: ${m.prominence}`),
    ...hand.markings.map((m) => `${cap(m.marking)} ${m.location}`),
    hand.relationship_lines.length > 0 &&
      `Relationship lines: ${hand.relationship_lines.map((r) => `${r.length}, ${r.depth} (${r.position})`).join('; ')}`,
    hand.children_lines_visible > 0 && `Fine vertical lines above them: ${hand.children_lines_visible}`,
    hand.notes,
  ].filter(Boolean) as string[];
  if (items.length === 0) return null;
  return (
    <div className="border-t border-white/5 print:hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-bold text-violet-200 sm:px-8">
        More about this hand <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="space-y-1.5 px-5 pb-5 text-sm text-violet-100 sm:px-8">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
