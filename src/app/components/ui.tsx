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

export function StepHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mt-10 text-center sm:mt-14">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-3.5 font-display text-[clamp(34px,4vw,52px)] font-medium leading-[1.12] text-white">{title}</h1>
      {subtitle && <p className="mx-auto mt-4 max-w-[600px] text-lg text-ink-muted">{subtitle}</p>}
    </div>
  );
}

const STEPS = ['Choose', 'About you', 'Photos', 'Reading'];

/** Four-node "constellation" progress: done nodes are faded gold, the current one glows, upcoming ones are outlined. */
export function Stepper({ current }: { current: number }) {
  return (
    <ol className="mx-auto grid max-w-[560px] grid-cols-4" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className="relative flex flex-col items-center gap-2.5" aria-current={state === 'current' ? 'step' : undefined}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-[9px] h-px w-full ${
                  i <= current ? 'bg-[linear-gradient(90deg,#f6c77f,rgba(246,199,127,0.5))]' : 'bg-lavender-300/20'
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-[1] size-[18px] rounded-full ${
                state === 'current'
                  ? 'bg-gold-400 shadow-[0_0_0_6px_rgba(246,199,127,0.15),0_0_20px_#f6c77f]'
                  : state === 'done'
                    ? 'bg-[#967a52]' /* gold at 60% over the page, opaque so the line doesn't show through */
                    : 'border border-lavender-300/35 bg-[#0e0b22]'
              }`}
            />
            <span className={`text-center text-sm ${state === 'current' ? 'font-medium text-white' : 'text-ink-subtle'}`}>
              {label}
              {state === 'done' && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
