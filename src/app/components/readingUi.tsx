// Small pieces shared by the results page components.
import { Fragment, type ReactNode } from 'react';
import type { Seen } from '../../../shared/types';

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Dot({ color, className = '' }: { color?: string; className?: string }) {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${className}`} style={{ background: color ?? 'var(--color-gold-400)' }} />;
}

/** Renders paragraphs separated by blank lines, with **bold** support. No HTML injection. */
export function Prose({ text }: { text: string }) {
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

export const SEEN_LABELS: Record<Seen, string> = {
  clear: 'Clearly visible',
  faint: 'Faint or partly visible',
  not_assessable: 'Can’t assess from this photo',
};
const SEEN_COLORS: Record<Seen, string> = { clear: '#5eead4', faint: '#fec878', not_assessable: 'rgb(255 255 255 / 0.3)' };

/** How clearly something could be seen, in words (used instead of percentage confidence). */
export function SeenLabel({ seen, className = '' }: { seen: Seen; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-violet-300/80 print-muted ${className}`}>
      <Dot color={SEEN_COLORS[seen]} className="size-1.5" /> {SEEN_LABELS[seen]}
    </span>
  );
}
