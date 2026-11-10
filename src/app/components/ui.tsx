import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gold-400 text-night-900 hover:bg-gold-300 disabled:bg-white/10 disabled:text-white/40 shadow-lg shadow-gold-500/10',
  secondary: 'bg-white/8 text-violet-50 border border-white/15 hover:bg-white/12',
  ghost: 'text-violet-200 hover:text-white hover:bg-white/5',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 ${VARIANTS[variant]} ${className}`}
    />
  );
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
