import { useEffect, useState } from 'react';
import { Check, Loader2, Moon } from 'lucide-react';
import type { PersonObservation, Stage } from '../../shared/types';
import { lineSummary } from './observationText';

const STEPS: { stage: Stage | 'upload'; label: string }[] = [
  { stage: 'upload', label: 'Uploading your photos' },
  { stage: 'observing', label: 'Tracing your lines, mounts and hand shape' },
  { stage: 'interpreting', label: 'Writing your personal reading' },
];

export function Progress({ stage, observations }: { stage: Stage | null; observations: PersonObservation[] | null }) {
  const current = stage === null ? 0 : stage === 'observing' ? 1 : 2;
  const highlights = observations ? collectHighlights(observations) : [];
  const [shown, setShown] = useState(0);

  // Reveal observed features one by one while the reading is being written.
  useEffect(() => {
    if (!highlights.length) return;
    const t = setInterval(() => setShown((n) => Math.min(n + 1, highlights.length)), 1200);
    return () => clearInterval(t);
  }, [highlights.length]);

  return (
    <section className="mx-auto flex max-w-lg flex-col items-center py-10 text-center" aria-live="polite">
      <div className="relative mb-10">
        <Moon size={72} className="animate-[spin_6s_linear_infinite] text-gold-400" />
        <div className="absolute inset-0 -z-10 rounded-full bg-violet-500/30 blur-3xl" />
      </div>
      <h1 className="font-display text-3xl text-white">Reading your hands</h1>
      <p className="mt-2 text-violet-200/80">This usually takes under a minute. Please keep this page open.</p>

      <ol className="mt-8 w-full space-y-3 text-left">
        {STEPS.map((s, i) => (
          <li key={s.stage} className={`panel flex items-center gap-3 px-4 py-3 ${i > current ? 'opacity-40' : ''}`}>
            {i < current ? (
              <Check size={20} className="text-gold-400" />
            ) : i === current ? (
              <Loader2 size={20} className="animate-spin text-gold-400" />
            ) : (
              <span className="size-5 rounded-full border border-white/20" />
            )}
            <span className={i === current ? 'font-semibold text-white' : 'text-violet-200'}>{s.label}</span>
          </li>
        ))}
      </ol>

      {highlights.length > 0 && (
        <div className="mt-8 w-full text-left">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400">What we’re seeing</p>
          <ul className="space-y-2">
            {highlights.slice(0, shown).map((h) => (
              <li key={h} className="animate-[fadeIn_0.6s_ease] text-sm text-violet-100">✦ {h}</li>
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
