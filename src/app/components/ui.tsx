import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  // Gold pill (the main action) and outlined pill; styles live in global.css.
  primary: 'btn-gold px-7 py-3.5 text-lg',
  secondary: 'btn-ghost px-6 py-3 text-base',
  // Text link, e.g. "Back".
  ghost: 'min-h-11 rounded-full px-3 py-2 font-medium text-ink-soft hover:text-white disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={`inline-flex items-center justify-center gap-2 ${VARIANTS[variant]} ${className}`} />;
}

export function StepHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8 text-center">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-400">{eyebrow}</p>}
      <h1 className="font-display text-3xl text-white sm:text-4xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-3 max-w-xl text-violet-200/80">{subtitle}</p>}
    </div>
  );
}

const STEPS = ['Choose', 'About you', 'Photos', 'Reading'];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="mx-auto mb-10 flex max-w-md items-center justify-between gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5" aria-current={state === 'current' ? 'step' : undefined}>
            <span
              className={`h-1.5 w-full rounded-full ${state === 'todo' ? 'bg-white/10' : 'bg-gold-400'} ${state === 'current' ? 'opacity-100' : state === 'done' ? 'opacity-60' : ''}`}
            />
            <span className={`text-xs ${state === 'current' ? 'font-bold text-white' : 'text-violet-300/60'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
