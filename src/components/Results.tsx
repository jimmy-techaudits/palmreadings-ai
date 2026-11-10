import { Fragment, useState, type ReactNode } from 'react';
import {
  Baby, Briefcase, Brain, ChevronDown, Compass, Eye, Flame, Gem, Heart, HeartHandshake, Loader2,
  MessageCircle, Milestone, Printer, RotateCcw, Send, Sparkles, Sprout, Target, ThumbsDown, ThumbsUp, TrendingUp,
  Users, type LucideIcon,
} from 'lucide-react';
import type { FamilyPrediction, PersonObservation, Reading } from '../../shared/types';
import { FOCUS_LABELS } from '../../shared/plan';
import { sendFeedback } from '../lib/api';
import type { SavedReading } from '../lib/storage';
import { LINE_NAMES, lineSummary } from './observationText';
import { Button } from './ui';

const ICONS: Record<string, LucideIcon> = {
  personality: Sparkles, potential_vs_path: Sprout, love: Heart, career: Briefcase, energy: Flame, turning_points: Milestone,
  love_style: Heart, needs: HeartHandshake, patterns: Brain, timeline: Milestone, next_chapter: Compass,
  work_style: Briefcase, drive: Target, strengths: Gem, blockers: Brain, career_timeline: TrendingUp,
  person_a: Users, person_b: Users, dynamic: HeartHandshake, communication: MessageCircle, long_term: Compass,
};

export function Results({ saved, onReset }: { saved: SavedReading; onReset: () => void }) {
  const { reading, observations, mode, focus, names } = saved;
  const title = mode === 'couple' ? `${names[0] || 'Partner A'} & ${names[1] || 'Partner B'}` : names[0] ? `${names[0]}’s Reading` : 'Your Reading';

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">
          {mode === 'couple' ? 'Couples Compatibility' : FOCUS_LABELS[focus]} · {title}
        </p>
        <h1 className="font-display text-3xl leading-tight text-white sm:text-5xl print-dark">{reading.headline}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-violet-100 print-dark">{reading.summary}</p>
      </header>

      <ul className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {reading.traits.map((t) => (
          <li key={t.label} className="panel px-4 py-3 text-center">
            <span className="block text-xs font-bold uppercase tracking-wider text-gold-400 print-muted">{t.label}</span>
            <span className="mt-1 block font-semibold text-white print-dark">{t.value}</span>
          </li>
        ))}
      </ul>

      <ObservedPanel observations={observations} names={names} mode={mode} />

      <div className="space-y-5">
        {reading.sections.map((s) => {
          const Icon = ICONS[s.id] ?? Sparkles;
          return (
            <section key={s.id} className="panel p-6 sm:p-8">
              <h2 className="mb-4 flex items-center gap-3 font-display text-xl text-white sm:text-2xl print-dark">
                <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Icon size={20} /></span>
                {s.title}
              </h2>
              <Prose text={s.body} />
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
        })}

        {reading.family && <FamilyPanel family={reading.family} />}

        <section className="panel p-6 sm:p-8">
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

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center print:hidden">
        <Button onClick={() => window.print()}><Printer size={18} /> Save as PDF</Button>
        <Button variant="secondary" onClick={onReset}><RotateCcw size={18} /> Start a new reading</Button>
      </div>

      <FeedbackBox mode={mode} focus={focus} />
    </article>
  );
}

/** Renders paragraphs separated by blank lines, with **bold** support. No HTML injection. */
function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-[1.05rem] leading-relaxed text-violet-100 print-dark">
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

function ObservedPanel({ observations, names, mode }: { observations: PersonObservation[]; names: string[]; mode: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="panel mb-5 overflow-hidden print:hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-5 text-left sm:px-8">
        <span className="flex items-center gap-3">
          <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Eye size={20} /></span>
          <span>
            <span className="block font-display text-lg text-white">What we saw in your hands</span>
            <span className="block text-sm text-violet-300/70">The features your reading is based on</span>
          </span>
        </span>
        <ChevronDown className={`shrink-0 text-violet-300 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="grid gap-6 border-t border-white/5 p-5 sm:grid-cols-2 sm:px-8">
          {observations.flatMap((o, pi) =>
            o.hands.map((h) => (
              <div key={`${pi}-${h.hand}`}>
                <h3 className="mb-2 font-bold text-gold-400">
                  {mode === 'couple' ? `${names[pi] || (pi === 0 ? 'Partner A' : 'Partner B')}: ` : ''}
                  {h.hand === 'left' ? 'Left' : 'Right'} hand
                  {h.element !== 'unclear' && <span className="font-normal text-violet-300"> · {h.element} hand</span>}
                </h3>
                <ul className="space-y-1.5 text-sm text-violet-100">
                  {Object.entries(h.lines).map(([k, l]) => (
                    <li key={k}>
                      {lineSummary(k, l) ?? <span className="text-violet-300/50">{LINE_NAMES[k]}: not visible</span>}
                      {l.features.length > 0 && <span className="text-violet-300/70"> ({l.features.join(', ')})</span>}
                    </li>
                  ))}
                  {h.markings.map((m) => (
                    <li key={m.marking + m.location}>{m.marking} {m.location}</li>
                  ))}
                </ul>
              </div>
            )),
          )}
        </div>
      )}
    </section>
  );
}

function FamilyPanel({ family }: { family: NonNullable<Reading['family']> }) {
  return (
    <section className="panel p-6 sm:p-8">
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

function FeedbackBox({ mode, focus }: { mode: string; focus: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function submit() {
    if (!rating) return;
    setState('sending');
    await sendFeedback({ rating, comment, mode, focus }).catch(() => {});
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
