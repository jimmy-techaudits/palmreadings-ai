// Small pieces shared by the results page components.
import { Fragment, type ReactNode } from 'react';
import { LINE_KEYS, type Seen } from '../../../shared/types';
import { LINE_COLORS } from './observationText';

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Dot({ color, className = '', glow = false }: { color?: string; className?: string; glow?: boolean }) {
  const c = color ?? 'var(--color-gold-400)';
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${className}`} style={{ background: c, boxShadow: glow ? `0 0 10px ${c}` : undefined }} />;
}

/** Renders paragraphs separated by blank lines, with **bold** support. No HTML injection. */
export function Prose({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-4 text-[17px] leading-[1.7] text-ink-soft print-dark ${className}`}>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{bold(para.trim())}</p>
      ))}
    </div>
  );
}

/** Bold phrases that name a palm line take that line's color; others are white. */
function boldColor(phrase: string): string | undefined {
  const p = phrase.toLowerCase();
  if (p.includes('fork')) return LINE_COLORS.head;
  return LINE_KEYS.map((k) => (p.includes(`${k} line`) ? LINE_COLORS[k] : undefined)).find(Boolean);
}

function bold(s: string): ReactNode {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const text = part.slice(2, -2);
      return (
        <strong key={i} className="font-medium text-white print-dark" style={{ color: boldColor(text) }}>
          {text}
        </strong>
      );
    }
    return <Fragment key={i}>{part.replace(/\*/g, '')}</Fragment>;
  });
}

export const SEEN_LABELS: Record<Seen, string> = {
  clear: 'Clearly visible',
  faint: 'Faint or partly visible',
  not_assessable: 'Can’t assess from this photo',
};
export const SEEN_COLORS: Record<Seen, string> = { clear: '#6ee7c8', faint: '#f6c77f', not_assessable: '#a99fcb' };

/** How clearly something could be seen, in words (used instead of percentage confidence). */
export function SeenLabel({ seen, className = '' }: { seen: Seen; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs print-muted ${className}`} style={{ color: SEEN_COLORS[seen] }}>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: SEEN_COLORS[seen] }} /> {SEEN_LABELS[seen]}
    </span>
  );
}

/** Small outlined trait chip. */
export function Chip({ children, filled = false }: { children: ReactNode; filled?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs text-ink-soft print-dark ${
        filled ? 'bg-lavender-300/10' : 'border border-lavender-300/25'
      }`}
    >
      {children}
    </span>
  );
}

/** The large section card used across the reading. */
export const CARD = 'rounded-card-lg border border-lavender-300/16 bg-[rgba(14,10,34,0.75)] p-6 sm:p-8 scroll-mt-6';
