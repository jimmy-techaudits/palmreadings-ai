import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Baby, Briefcase, Brain, ChevronDown, Compass, Flame, Gem, Heart, HeartHandshake, Loader2,
  Check, Copy, Link2, MessageCircle, Milestone, Printer, RotateCcw, Send, Sparkles, Sprout, Target, ThumbsDown, ThumbsUp,
  Trash2, TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import { LINE_KEYS, type FamilyPrediction, type Hand, type HandObservation, type LineKey, type PersonObservation, type Reading, type ReadingSection } from '../../../shared/types';
import { FOCUS_LABELS } from '../../../shared/plan';
import { sendFeedback } from '../lib/api';
import type { SavedReading } from '../lib/storage';
import { HandDiagram } from './HandDiagram';
import { LINE_COLORS, LINE_MEANINGS, LINE_NAMES, lineWords } from './observationText';
import { Button } from './ui';

const ICONS: Record<string, LucideIcon> = {
  personality: Sparkles, potential_vs_path: Sprout, love: Heart, career: Briefcase, energy: Flame, turning_points: Milestone,
  love_style: Heart, needs: HeartHandshake, patterns: Brain, timeline: Milestone, next_chapter: Compass,
  work_style: Briefcase, drive: Target, strengths: Gem, blockers: Brain, career_timeline: TrendingUp,
  person_a: Users, person_b: Users, dynamic: HeartHandshake, communication: MessageCircle, long_term: Compass,
};

export interface ResultPhoto {
  slot: string;
  url: string;
  label: string;
}

interface ResultsProps {
  saved: SavedReading;
  onReset: () => void;
  /** Set when the reading is saved at a private link. */
  readingId?: string;
  photos?: ResultPhoto[];
  /** True when photos were removed under the 3-year retention rule. */
  photosRemoved?: boolean;
  marketingConsent?: { value: boolean; onChange: (v: boolean) => Promise<void> };
  onDelete?: () => Promise<void>;
}

export function Results({ saved, onReset, readingId, photos, photosRemoved, marketingConsent, onDelete }: ResultsProps) {
  const { reading, observations, mode, focus, names, dominantHands } = saved;
  const title = mode === 'couple' ? `${names[0] || 'Partner A'} & ${names[1] || 'Partner B'}` : names[0] ? `${names[0]}’s Reading` : 'Your Reading';
  const personName = (i: number) => names[i] || (i === 0 ? 'Partner A' : 'Partner B');

  /** The dominant hand's observations for a person (falls back to whichever hand was seen). */
  const mainHand = (i: number): HandObservation | undefined => {
    const hands = observations[i]?.hands ?? [];
    return hands.find((h) => h.hand === dominantHands?.[i]) ?? hands.find((h) => h.hand === 'right') ?? hands[0];
  };

  const navItems = useMemo(
    () => [
      ...reading.sections.map((s) => ({ id: `s-${s.id}`, label: s.title, color: s.lines?.[0] ? LINE_COLORS[s.lines[0]] : undefined })),
      ...(reading.family ? [{ id: 's-family', label: 'Marriage & Family', color: undefined }] : []),
      { id: 's-next', label: 'Next steps', color: undefined },
    ],
    [reading],
  );

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">
          {mode === 'couple' ? 'Couples Compatibility' : FOCUS_LABELS[focus]} · {title}
        </p>
        <h1 className="font-display text-3xl leading-tight text-white sm:text-5xl print-dark">{reading.headline}</h1>
        <p className="mx-auto mt-5 max-w-2xl font-read text-[1.05rem] leading-relaxed text-violet-100 sm:text-lg print-dark">{reading.summary}</p>
      </header>

      {readingId && <PrivateLink />}

      <HandsHero observations={observations} mode={mode} personName={personName} dominantHands={dominantHands} photos={photos} />

      <AtAGlance traits={reading.traits} />

      <div>
        <div className="space-y-5">
          {reading.sections.map((s) => (
            <SectionCard key={s.id} section={s} hand={mainHand(s.id === 'person_b' ? 1 : 0)} />
          ))}

          {reading.family && <FamilyPanel family={reading.family} />}

          <section id="s-next" className="panel scroll-mt-6 p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-3 font-display text-xl text-white print-dark">
              <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Target size={20} /></span> Your next two weeks
            </h2>
            <ol className="space-y-3">
              {reading.action_steps.map((a, i) => (
                <li key={a} className="flex gap-3 text-violet-100 print-dark">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-night-900">{i + 1}</span>
                  <span className="pt-0.5 leading-relaxed">{a}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-gold-400/30 bg-gradient-to-br from-violet-900/40 to-night-900 p-8 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">
              {reading.closing.kind === 'mantra' ? 'Your mantra' : 'A question to sit with'}
            </p>
            <p className="font-display text-2xl leading-snug text-white print-dark">“{reading.closing.text}”</p>
          </section>
        </div>
        <SectionNav items={navItems} />
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center print:hidden">
        <Button onClick={() => window.print()}><Printer size={18} /> Save as PDF</Button>
        <Button variant="secondary" onClick={onReset}><RotateCcw size={18} /> Start a new reading</Button>
      </div>

      <FeedbackBox mode={mode} focus={focus} readingId={readingId} />

      <div className="mt-12">
        {photos && photos.length > 0 && <PhotoStrip photos={photos} />}
        {photosRemoved && (
          <p className="panel mb-5 p-4 text-sm text-violet-200/80 print:hidden">
            The photos for this reading were removed after three years without being opened. Your reading is still here.
          </p>
        )}
        {marketingConsent && !photosRemoved && <MarketingToggle {...marketingConsent} />}
      </div>

      {onDelete && <DeleteBox onDelete={onDelete} />}
    </article>
  );
}

/** Renders paragraphs separated by blank lines, with **bold** support. No HTML injection. */
function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-4 font-read text-[1.05rem] leading-relaxed text-violet-100 print-dark">
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{bold(para.trim())}</p>
      ))}
    </div>
  );
}

function bold(s: string): ReactNode {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-bold text-white print-dark">{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part.replace(/\*/g, '')}</Fragment>
    ),
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Dot({ color, className = '' }: { color?: string; className?: string }) {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${className}`} style={{ background: color ?? 'var(--color-gold-400)' }} />;
}

/** "What we saw": a drawn diagram of each hand next to the photo, with a legend of the lines. */
function HandsHero({
  observations,
  mode,
  personName,
  dominantHands,
  photos,
}: {
  observations: PersonObservation[];
  mode: string;
  personName: (i: number) => string;
  dominantHands?: Hand[];
  photos?: ResultPhoto[];
}) {
  const [person, setPerson] = useState(0);
  const [side, setSide] = useState<Hand>(dominantHands?.[0] ?? 'right');
  const [active, setActive] = useState<LineKey | null>(null);

  const hands = observations[person]?.hands ?? [];
  const hand = hands.find((h) => h.hand === side) ?? hands[0];
  if (!hand) return null;

  const dominant = dominantHands?.[person];
  const role = dominant ? (hand.hand === dominant ? 'Dominant hand: what you’ve built' : 'Non-dominant hand: what you were born with') : null;
  const photo = photos?.find((p) => p.slot === `p${person}-${hand.hand}-palm`);
  const choosePerson = (i: number) => {
    setPerson(i);
    setSide(dominantHands?.[i] ?? 'right');
    setActive(null);
  };

  const shape = [
    hand.element !== 'unclear' ? `${cap(hand.element)} hand` : '',
    hand.palm_shape !== 'unclear' ? `${hand.palm_shape} palm` : '',
    hand.finger_length !== 'unclear' ? `${hand.finger_length} fingers` : '',
    hand.index_vs_ring === 'index_longer' ? 'index finger longer than ring' : hand.index_vs_ring === 'ring_longer' ? 'ring finger longer than index' : '',
  ].filter(Boolean);

  return (
    <section className="panel mb-8 overflow-hidden" aria-labelledby="hands-title">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">What we saw</p>
          <h2 id="hands-title" className="font-display text-2xl text-white print-dark">Your hands</h2>
        </div>
        <div className="flex flex-col items-end gap-2 print:hidden">
          {mode === 'couple' && (
            <Segmented
              label="Person"
              value={String(person)}
              options={observations.map((_, i) => ({ value: String(i), label: personName(i) }))}
              onChange={(v) => choosePerson(Number(v))}
            />
          )}
          <Segmented
            label="Hand"
            value={hand.hand}
            options={hands.map((h) => ({ value: h.hand, label: `${cap(h.hand)}${h.hand === dominant ? ' · dominant' : ''}` }))}
            onChange={(v) => {
              setSide(v as Hand);
              setActive(null);
            }}
          />
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
          {role && <p className="mt-3 text-center text-sm font-bold text-violet-100 print-dark">{role}</p>}
          {shape.length > 0 && <p className="mt-1 text-center text-sm text-violet-300/80 print-muted">{shape.join(' · ')}</p>}
        </div>

        <div>
          <ul className="space-y-1.5">
            {LINE_KEYS.map((k) => {
              const words = lineWords(hand.lines[k]);
              const seen = words.length > 0;
              const on = active === k;
              return (
                <li key={k}>
                  <button
                    type="button"
                    disabled={!seen}
                    onClick={() => setActive(on ? null : k)}
                    aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition ${
                      on ? 'bg-white/10' : seen ? 'hover:bg-white/5' : 'cursor-default opacity-45'
                    }`}
                  >
                    <Dot color={seen ? LINE_COLORS[k] : 'rgb(255 255 255 / 0.25)'} className="mt-1.5 size-2.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white print-dark">
                        {LINE_NAMES[k]} <span className="font-normal text-violet-300/70">· {LINE_MEANINGS[k]}</span>
                      </span>
                      <span className="block text-sm text-violet-200/90 print-muted">
                        {seen ? words.join(' · ') : 'Not visible in this photo'}
                        {seen && hand.lines[k].features.length > 0 && <span className="text-violet-300/70"> · {hand.lines[k].features.join(', ')}</span>}
                      </span>
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

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  if (options.length < 2) return null;
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-white/10 bg-night-900/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${o.value === value ? 'bg-gold-400 text-night-900' : 'text-violet-200 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AtAGlance({ traits }: { traits: Reading['traits'] }) {
  return (
    <section className="mb-10" aria-labelledby="glance-title">
      <h2 id="glance-title" className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">At a glance</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {traits.map((t) => {
          const color = t.line && t.line !== 'none' ? LINE_COLORS[t.line] : undefined;
          return (
            <li key={t.label} className="panel relative overflow-hidden px-4 py-3.5">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: color ?? 'rgb(254 200 120 / 0.5)' }} />
              <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-violet-300/80 print-muted">
                {t.label}
              </span>
              <span className="mt-1 block font-display text-lg leading-snug text-white print-dark">{t.value}</span>
              {t.line && t.line !== 'none' && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-violet-300/60 print-muted">
                  <Dot color={color} /> {LINE_NAMES[t.line]}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SectionCard({ section: s, hand }: { section: ReadingSection; hand?: HandObservation }) {
  const Icon = ICONS[s.id] ?? Sparkles;
  const lines = s.lines ?? [];
  return (
    <section id={`s-${s.id}`} className="panel scroll-mt-6 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {s.name ? (
            <>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-400 print-muted">
                <Icon size={15} /> {s.title}
              </p>
              <h2 className="mt-2 font-display text-2xl leading-tight text-white sm:text-3xl print-dark">{s.name}</h2>
            </>
          ) : (
            <h2 className="flex items-center gap-3 font-display text-xl text-white sm:text-2xl print-dark">
              <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Icon size={20} /></span>
              {s.title}
            </h2>
          )}
          {s.tags && s.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <li key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-violet-100 print-dark">{t}</li>
              ))}
            </ul>
          )}
        </div>
        {hand && lines.length > 0 && (
          <HandDiagram hand={hand} highlight={lines} mini className="w-16 shrink-0 sm:w-20" title={`Hand diagram highlighting the ${lines.map((l) => LINE_NAMES[l].toLowerCase()).join(' and ')}`} />
        )}
      </div>

      {lines.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-violet-300/80 print-muted">
          <span className="font-bold uppercase tracking-wider text-violet-300/60">Read from</span>
          {lines.map((l) => (
            <span key={l} className="flex items-center gap-1.5"><Dot color={LINE_COLORS[l]} /> {LINE_NAMES[l]}</span>
          ))}
        </p>
      )}

      <div className="mt-5">
        <Prose text={s.body} />
      </div>

      {s.evidence.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 pt-4">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-300/60 print-muted">Based on</span>
          {s.evidence.map((e) => (
            <span key={e} className="rounded-full bg-white/5 px-3 py-1 text-xs text-violet-200 print-muted">{e}</span>
          ))}
        </div>
      )}
    </section>
  );
}

/** Section shortcuts that stay at the bottom of the screen while the sections scroll by. */
function SectionNav({ items }: { items: { id: string; label: string; color?: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (el && bar.current) bar.current.scrollTo({ left: el.offsetLeft - bar.current.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  return (
    <nav aria-label="Reading sections" className="sticky bottom-3 z-20 mt-6 print:hidden">
      <div
        ref={bar}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-night-900/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((i) => (
          <a
            key={i.id}
            href={`#${i.id}`}
            data-id={i.id}
            aria-current={active === i.id ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActive(i.id);
            }}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
              active === i.id ? 'bg-white/12 text-white' : 'text-violet-300/80 hover:text-white'
            }`}
          >
            {i.color && <Dot color={i.color} />}
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function FamilyPanel({ family }: { family: NonNullable<Reading['family']> }) {
  return (
    <section id="s-family" className="panel scroll-mt-6 p-6 sm:p-8">
      <h2 className="mb-5 flex items-center gap-3 font-display text-xl text-white print-dark">
        <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Baby size={20} /></span> Marriage & Family
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Prediction icon={HeartHandshake} label="Significant marriages / partnerships" p={family.marriages} />
        <Prediction icon={Baby} label="Potential children" p={family.children} />
      </div>
      <p className="mt-5 leading-relaxed text-violet-100 print-dark">{family.timing}</p>
      <p className="mt-4 text-xs italic text-violet-300/60 print-muted">
        Palmistry shows tendencies and potential, not certainties. Family comes in many forms.
      </p>
    </section>
  );
}

function Prediction({ icon: Icon, label, p }: { icon: LucideIcon; label: string; p: FamilyPrediction }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-5 text-center">
      <Icon size={22} className="mx-auto mb-2 text-gold-400" />
      <p className="text-xs font-bold uppercase tracking-wider text-violet-300/80 print-muted">{label}</p>
      <p className="my-1 font-display text-4xl text-white print-dark">{p.range}</p>
      <p className="mb-3 text-xs text-violet-300/70 print-muted">{p.confidence} confidence</p>
      <p className="text-left text-sm leading-relaxed text-violet-100 print-dark">{p.explanation}</p>
    </div>
  );
}

function FeedbackBox({ mode, focus, readingId }: { mode: string; focus: string; readingId?: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function submit() {
    if (!rating) return;
    setState('sending');
    await sendFeedback({ rating, comment, mode, focus, readingId }).catch(() => {});
    setState('sent');
  }

  if (state === 'sent') {
    return <p className="panel mx-auto mt-12 max-w-lg p-6 text-center text-violet-100 print:hidden">Thank you! Your feedback helps us improve.</p>;
  }
  return (
    <div className="panel mx-auto mt-12 max-w-lg p-6 text-center print:hidden">
      <h2 className="font-display text-lg text-white">Did this reading resonate?</h2>
      <div className="mt-4 flex justify-center gap-3">
        {([
          [1, ThumbsUp, 'Spot on'],
          [-1, ThumbsDown, 'Off base'],
        ] as const).map(([v, Icon, label]) => (
          <button
            key={v}
            onClick={() => setRating(v)}
            aria-pressed={rating === v}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition ${
              rating === v ? 'border-gold-400 bg-gold-400/15 text-white' : 'border-white/10 text-violet-200 hover:border-white/30'
            }`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>
      {rating !== null && (
        <div className="mt-4 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            placeholder="What resonated, or what felt off? (optional)"
            className="min-h-24 w-full rounded-xl border border-white/10 bg-night-900/70 p-3 text-sm text-white placeholder:text-violet-300/40 focus:border-gold-400 focus:outline-none"
          />
          <Button onClick={submit} disabled={state === 'sending'} className="w-full">
            {state === 'sending' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send feedback
          </Button>
        </div>
      )}
    </div>
  );
}

function PrivateLink() {
  const [copied, setCopied] = useState(false);
  const url = window.location.href.split('?')[0];
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your private link:', url);
    }
  }
  return (
    <section className="panel mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div className="flex items-start gap-3">
        <Link2 size={20} className="mt-0.5 shrink-0 text-gold-400" />
        <div>
          <p className="font-bold text-white">This is your private link</p>
          <p className="text-sm text-violet-200/80">Bookmark it to come back anytime. Anyone with the link can see this reading and its photos.</p>
        </div>
      </div>
      <Button variant="secondary" onClick={copy} className="shrink-0">
        {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy link'}
      </Button>
    </section>
  );
}

function PhotoStrip({ photos }: { photos: ResultPhoto[] }) {
  return (
    <section className="mb-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">Photos used for this reading</p>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {photos.map((p) => (
          <li key={p.slot}>
            <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10 hover:border-gold-400/60">
              <img src={p.url} alt={p.label} loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </a>
            <span className="mt-1 block text-center text-xs text-violet-300/80 print-muted">{p.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeleteBox({ onDelete }: { onDelete: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle');
  async function run() {
    setState('deleting');
    try {
      await onDelete();
    } catch {
      setState('error');
    }
  }
  return (
    <div className="mx-auto mt-8 max-w-lg text-center print:hidden">
      {state === 'idle' ? (
        <button onClick={() => setState('confirm')} className="inline-flex items-center gap-2 text-sm text-violet-300/70 underline hover:text-red-300">
          <Trash2 size={15} /> Delete this reading and its photos
        </button>
      ) : (
        <div className="panel border-red-400/30 p-5">
          <p className="font-bold text-white">Delete this reading permanently?</p>
          <p className="mt-1 text-sm text-violet-200/80">Your reading and photos will be erased and this link will stop working. This can’t be undone.</p>
          {state === 'error' && <p className="mt-2 text-sm text-red-300">Something went wrong. Please try again.</p>}
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setState('idle')} disabled={state === 'deleting'}>Keep it</Button>
            <Button onClick={run} disabled={state === 'deleting'} className="!bg-red-500 !text-white hover:!bg-red-400">
              {state === 'deleting' ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MarketingToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => Promise<void> }) {
  const [checked, setChecked] = useState(value);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  async function toggle(v: boolean) {
    setChecked(v);
    setState('saving');
    try {
      await onChange(v);
      setState('saved');
    } catch {
      setChecked(!v);
      setState('error');
    }
  }
  return (
    <label className="mb-8 flex cursor-pointer items-start gap-3 text-sm text-violet-200/90 print:hidden">
      <input type="checkbox" className="mt-0.5 size-5 accent-gold-400" checked={checked} disabled={state === 'saving'} onChange={(e) => toggle(e.target.checked)} />
      <span>
        Palm Readings AI may use these palm photos in its marketing (never with your name).
        {state === 'saved' && <span className="ml-2 font-bold text-gold-400">Saved</span>}
        {state === 'error' && <span className="ml-2 font-bold text-red-300">Couldn’t save, please try again</span>}
      </span>
    </label>
  );
}
