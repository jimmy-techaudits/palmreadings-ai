import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LINE_KEYS, type Hand, type HandNote, type HandObservation, type LineKey, type PersonObservation, type Seen } from '../../../shared/types';
import { HandDiagram } from './HandDiagram';
import { LINE_COLORS, LINE_MEANINGS, LINE_NAMES, lineWords } from './observationText';
import type { ResultPhoto } from './ReadingTools';
import { CARD, cap, Chip, SEEN_COLORS, SEEN_LABELS } from './readingUi';

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
  if (!dominant) return '';
  return hand === dominant ? 'developed path' : 'natural tendencies';
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; sub?: string }[];
  onChange: (v: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid w-full grid-cols-2 rounded-[22px] border border-lavender-300/20 bg-night-950/60 p-[5px] sm:inline-flex sm:w-auto sm:rounded-full print:hidden"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-[18px] px-3 py-2 text-base leading-tight transition sm:rounded-full sm:px-[22px] ${on ? 'bg-gold-400 font-medium text-plum-900' : 'text-[#c8bee8] hover:text-white'}`}
          >
            {o.label}
            {o.sub && (
              <>
                <span className="hidden sm:inline"> · {o.sub}</span>
                <span className="block text-xs sm:hidden">{o.sub}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
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
  const lineNote = (k: LineKey) => note?.lines?.find((l) => l.line === k)?.note;
  const photo = photos?.find((p) => p.slot === `p${person}-${hand.hand}-palm`);
  const ordered = (['left', 'right'] as const).flatMap((s) => hands.filter((h) => h.hand === s));

  const shape = [
    hand.element !== 'unclear' ? `${cap(hand.element)} hand` : '',
    hand.palm_shape !== 'unclear' ? `${cap(hand.palm_shape)} palm` : '',
    hand.finger_length !== 'unclear' ? `${cap(hand.finger_length)} fingers` : '',
    hand.index_vs_ring === 'index_longer' ? 'Index longer than ring' : hand.index_vs_ring === 'ring_longer' ? 'Ring longer than index' : '',
  ].filter(Boolean);

  return (
    <section id="s-hands" className={CARD} aria-labelledby="hands-title">
      <p className="eyebrow print-muted">What we saw</p>
      <h2 id="hands-title" className="mt-2 font-display text-[30px] font-medium leading-tight text-white print-dark">Explore your hands</h2>
      <p className="mt-2 text-base text-ink-muted print-dark">
        Your reading combines both hands. In our method, your non-dominant hand shows natural tendencies and your dominant hand shows how you’ve developed
        them.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {mode === 'couple' && (
          <Segmented
            label="Person"
            value={String(person)}
            options={observations.map((_, i) => ({ value: String(i), label: personName(i) }))}
            onChange={(v) => {
              setPerson(Number(v));
              setSide(dominantHands?.[Number(v)] ?? 'right');
            }}
          />
        )}
        <Segmented
          label="Hand"
          value={hand.hand}
          options={ordered.map((h) => ({ value: h.hand, label: cap(h.hand), sub: roleOf(h.hand, dominant) || undefined }))}
          onChange={(v) => setSide(v as Hand)}
        />
      </div>

      <div className="mt-7 flex flex-wrap gap-7">
        <div className="min-w-0 flex-[1_1_320px]">
          <div className={`grid gap-3 ${photo ? 'grid-cols-2' : 'mx-auto max-w-[16rem] grid-cols-1'}`}>
            {photo && (
              <figure>
                <a href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[20px] border border-lavender-300/18 bg-[#0e0b22]">
                  <img src={photo.url} alt={`Your ${hand.hand} palm`} className="aspect-[3/4] w-full object-cover" />
                </a>
                <figcaption className="mt-2 text-center text-xs text-ink-subtle">Your photo</figcaption>
              </figure>
            )}
            <figure>
              <div className="aspect-[3/4] rounded-[20px] border border-lavender-300/18 bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,0.3),#0e0b22_70%)] p-2.5">
                <HandDiagram hand={hand} highlight={active ? [active] : undefined} className="h-full w-full" />
              </div>
              <figcaption className="mt-2 text-center text-xs text-ink-subtle">The lines we read</figcaption>
            </figure>
          </div>
          {shape.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {shape.map((s) => (
                <Chip key={s} filled>
                  {s}
                </Chip>
              ))}
            </p>
          )}
          {note && <p className="mt-4 rounded-card-sm bg-[rgba(30,20,66,0.6)] px-5 py-[18px] text-base leading-relaxed text-ink-soft print-dark">{note.summary}</p>}
        </div>

        <div className="min-w-0 flex-[1_1_300px]">
          <ul className="flex flex-col gap-2.5">
            {LINE_KEYS.map((k) => {
              const l = hand.lines[k];
              const words = lineWords(l);
              const visible = words.length > 0;
              const seen: Seen = l.visibility === 'not_visible' ? 'not_assessable' : l.visibility;
              const on = active === k;
              const color = visible ? LINE_COLORS[k] : '#5c5480';
              return (
                <li key={k}>
                  <button
                    type="button"
                    disabled={!visible}
                    onClick={() => setActive(on ? null : k)}
                    aria-pressed={on}
                    className={`flex w-full gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition ${
                      on ? 'border-gold-400/60 bg-gold-400/[0.08]' : 'border-lavender-300/12 bg-[rgba(20,16,44,0.6)] hover:border-lavender-300/30'
                    } ${visible ? '' : 'cursor-default opacity-70'}`}
                  >
                    <span aria-hidden className="mt-[7px] size-3 shrink-0 rounded-full" style={{ background: color, boxShadow: visible ? `0 0 10px ${color}` : undefined }} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-base">
                        <strong className="font-medium text-white print-dark">{LINE_NAMES[k]}</strong> <span className="text-ink-subtle">· {LINE_MEANINGS[k]}</span>
                      </span>
                      <span className="text-sm text-ink-soft print-muted">
                        {visible ? [...words, ...l.features].join(' · ') : 'Not assessed'}
                      </span>
                      {visible && lineNote(k) && <span className="mt-1 text-[15px] leading-snug text-white/90 print-dark">{lineNote(k)}</span>}
                      <span className="text-xs" style={{ color: SEEN_COLORS[seen] }}>
                        ● {SEEN_LABELS[seen]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint print:hidden">
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
    <div className="mt-6 border-t border-lavender-300/12 print:hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between pt-4 text-left text-base font-medium text-ink-soft hover:text-white">
        More about this hand <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 text-base text-ink-soft">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
