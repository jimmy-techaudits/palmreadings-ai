import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { PersonObservation, Stage } from '../../../shared/types';
import { lineSummary } from './observationText';

const STEPS: { stage: Stage | 'upload'; label: string }[] = [
  { stage: 'upload', label: 'Uploading your photos' },
  { stage: 'observing', label: 'Tracing your lines, mounts and hand shape' },
  { stage: 'interpreting', label: 'Writing your personal reading' },
  { stage: 'writing_full', label: 'Writing every section of your full reading' },
];

export function Progress({ stage, observations, paid = false }: { stage: Stage | null; observations: PersonObservation[] | null; paid?: boolean }) {
  const steps = paid ? STEPS : STEPS.slice(0, 3);
  const current = stage === null ? 0 : stage === 'observing' ? 1 : stage === 'interpreting' ? 2 : 3;
  const highlights = observations ? collectHighlights(observations) : [];
  const [shown, setShown] = useState(0);

  // Reveal observed features one by one while the reading is being written.
  useEffect(() => {
    if (!highlights.length) return;
    const t = setInterval(() => setShown((n) => Math.min(n + 1, highlights.length)), 1200);
    return () => clearInterval(t);
  }, [highlights.length]);

  return (
    <section className="mx-auto mt-10 flex max-w-[600px] flex-col items-center text-center sm:mt-14" aria-live="polite">
      <div className="relative flex size-44 items-center justify-center" aria-hidden="true">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(110,52,200,0.45),transparent_70%)] blur-xl" />
        <div className="absolute inset-0 rounded-full border border-lavender-300/15" />
        <div className="absolute inset-4 animate-[spin_24s_linear_infinite] rounded-full border border-dashed border-gold-400/50">
          <span className="absolute -top-[5px] left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-gold-400 shadow-[0_0_12px_#f6c77f]" />
        </div>
        <div className="absolute inset-9 rounded-full border border-lavender-300/20 bg-[radial-gradient(circle,rgba(110,52,200,0.35),rgba(20,16,44,0.6)_70%)]" />
        <img src="/images/palm-readings-ai-icon.png" alt="" width="64" height="64" className="relative size-16 object-contain" />
      </div>
      <p className="eyebrow mt-8">Your reading</p>
      <h1 className="mt-3.5 font-display text-[clamp(34px,4vw,52px)] font-medium leading-[1.12] text-white">
        Reading your <em className="accent">hands</em>
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        {paid ? 'This usually takes a minute or two.' : 'This usually takes under a minute.'} Please keep this page open.
      </p>

      <ol className="mt-10 w-full space-y-3 text-left">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li
              key={s.stage}
              className={`flex items-center gap-4 rounded-card-sm border px-5 py-4 ${
                state === 'current'
                  ? 'border-gold-400/35 bg-[linear-gradient(135deg,rgba(40,22,84,0.6),rgba(20,16,44,0.6))]'
                  : 'border-lavender-300/14 bg-[rgba(20,16,44,0.6)]'
              }`}
            >
              {state === 'done' ? (
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-gold-400/60 text-plum-900" aria-hidden="true">
                  <Check size={16} strokeWidth={2.6} />
                </span>
              ) : state === 'current' ? (
                <span className="flex size-7 flex-none items-center justify-center rounded-full shadow-[0_0_0_6px_rgba(246,199,127,0.12)]" aria-hidden="true">
                  <Loader2 size={22} className="animate-spin text-gold-400" />
                </span>
              ) : (
                <span className="size-7 flex-none rounded-full border border-lavender-300/35 bg-[#0e0b22]" aria-hidden="true" />
              )}
              <span className={state === 'current' ? 'font-medium text-white' : state === 'done' ? 'text-ink-soft' : 'text-ink-subtle'}>
                {s.label}
                {state === 'done' && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {highlights.length > 0 && (
        <div className="mt-10 w-full text-left">
          <p className="eyebrow mb-4">What we’re seeing</p>
          <ul className="space-y-2.5">
            {highlights.slice(0, shown).map((h) => (
              <li key={h} className="flex animate-[fadeIn_0.6s_ease] items-start gap-2.5 text-base text-ink-soft">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mt-1 shrink-0 text-gold-400" aria-hidden="true">
                  <path d="M11 3l1.6 5.4L18 10l-5.4 1.6L11 17l-1.6-5.4L4 10l5.4-1.6z" />
                </svg>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function collectHighlights(observations: PersonObservation[]): string[] {
  const out: string[] = [];
  for (const o of observations) {
    for (const h of o.hands) {
      if (h.element !== 'unclear') out.push(`${cap(h.hand)} hand: ${h.element} hand shape`);
      for (const key of ['heart', 'head', 'fate'] as const) {
        const s = lineSummary(key, h.lines[key]);
        if (s) out.push(`${cap(h.hand)} hand: ${s}`);
      }
    }
  }
  return out.slice(0, 6);
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
