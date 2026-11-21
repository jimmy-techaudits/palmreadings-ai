import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Focus, Mode } from '../../../shared/types';
import { StepHeader } from './ui';

interface Option {
  mode: Mode;
  focus: Focus;
  title: string;
  description: string;
  icon: ReactNode;
  /** Emblem tint: border and radial fill in the card's theme color. */
  emblem: string;
}

const svg = (children: ReactNode) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const OPTIONS: Option[] = [
  {
    mode: 'solo',
    focus: 'overall',
    title: 'Full Life Reading',
    description: 'Personality, love, marriage and family, career, money, and your life timeline, comparing both hands.',
    icon: svg(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
      </>,
    ),
    emblem: 'border-gold-400/40 bg-[radial-gradient(circle,rgba(246,199,127,0.18),transparent_70%)]',
  },
  {
    mode: 'solo',
    focus: 'love',
    title: 'Love & Relationships',
    description: 'How you love, what you need, your patterns, marriage and family, and your timeline.',
    icon: svg(<path d="M2 9.5a5.5 5.5 0 0 1 9.6-3.7.6.6 0 0 0 .8 0A5.5 5.5 0 0 1 22 9.5c0 2.3-1.5 4-3 5.5l-5.5 5.3a2 2 0 0 1-3 0L5 15c-1.5-1.5-3-3.2-3-5.5" />),
    emblem: 'border-line-heart/45 bg-[radial-gradient(circle,rgba(242,139,168,0.18),transparent_70%)]',
  },
  {
    mode: 'solo',
    focus: 'career',
    title: 'Career & Purpose',
    description: 'Your work style and drive, the careers that fit, money, and your timeline.',
    icon: svg(
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z" />
      </>,
    ),
    emblem: 'border-line-fate/45 bg-[radial-gradient(circle,rgba(196,166,255,0.18),transparent_70%)]',
  },
  {
    mode: 'couple',
    focus: 'overall',
    title: 'Couples Compatibility',
    description: 'Read both partners’ hands to see how you connect, clash, and grow.',
    icon: svg(
      <>
        <circle cx="9" cy="12" r="6" />
        <circle cx="15" cy="12" r="6" />
      </>,
    ),
    emblem: 'border-line-life/45 bg-[radial-gradient(circle,rgba(110,231,200,0.16),transparent_70%)]',
  },
];

/** Long enough to see the selected card before moving on to step 2. */
const ADVANCE_DELAY_MS = 220;

export function StepChoose({ onChoose }: { onChoose: (mode: Mode, focus: Focus) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    timer.current = window.setTimeout(() => onChoose(OPTIONS[i].mode, OPTIONS[i].focus), ADVANCE_DELAY_MS);
  }

  return (
    <section>
      <StepHeader
        eyebrow="Step 1 of 3"
        title={
          <>
            What would you like to <em className="accent">explore?</em>
          </>
        }
        subtitle="Every reading looks at both of your hands. Pick the area you most want guidance on."
      />
      {/* Choosing a card starts the next step straight away, so these are buttons rather than radios. */}
      <div role="group" aria-label="Reading type" className="mt-10 grid gap-5 sm:mt-[52px] sm:grid-cols-2">
        {OPTIONS.map((o, i) => {
          const on = picked === i;
          return (
            <button
              key={o.title}
              type="button"
              onClick={() => pick(i)}
              className={`block w-full rounded-card-lg border p-6 text-left transition-[border-color,background-color,box-shadow] duration-200 sm:p-8 ${
                on
                  ? 'border-gold-400 bg-[linear-gradient(160deg,rgba(60,30,120,0.75),rgba(20,14,46,0.85))] shadow-[0_0_0_4px_rgba(246,199,127,0.12),0_30px_80px_rgba(80,30,160,0.35)]'
                  : 'border-lavender-300/16 bg-[rgba(20,16,44,0.6)] hover:border-gold-400/50'
              }`}
            >
              <span className="flex items-start justify-between gap-4">
                <span className={`flex size-[60px] items-center justify-center rounded-full border text-gold-400 ${o.emblem}`}>{o.icon}</span>
                <span
                  aria-hidden="true"
                  className={`size-6 rounded-full ${on ? 'border-[7px] border-gold-400 bg-plum-900' : 'border-[1.5px] border-lavender-300/45'}`}
                />
              </span>
              <span className="mt-5 block font-display text-2xl text-white">{o.title}</span>
              <span className="mt-2 block text-base text-ink-muted">{o.description}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-balance text-center text-sm text-ink-subtle">
        <ShieldCheck size={18} strokeWidth={1.7} className="mr-2.5 inline-block align-[-3px] text-gold-400" aria-hidden="true" />
        No account needed. Your reading is saved at a private link.
      </p>
    </section>
  );
}
