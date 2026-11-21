import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, Camera, Check, Hand as HandIcon, ImageDown, Loader2, RefreshCw, ShieldCheck, Sun, X, ZoomIn } from 'lucide-react';
import type { SlotSpec } from '../../../shared/plan';
import type { Mode, SlotId } from '../../../shared/types';
import { ImageLoadError, prepareImage } from '../lib/image';
import type { PersonDraft } from './StepDetails';
import { Button, StepHeader } from './ui';

interface Props {
  mode: Mode;
  people: PersonDraft[];
  slots: SlotSpec[];
  photos: Partial<Record<SlotId, string>>;
  issues: Partial<Record<SlotId, string>>;
  consent: boolean;
  marketingConsent: boolean;
  onPhoto: (slot: SlotId, dataUrl: string | null) => void;
  onConsent: (v: boolean) => void;
  onMarketingConsent: (v: boolean) => void;
  /** Bot check widget, and whether it has produced a token yet. */
  botCheck: ReactNode;
  botReady: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

const TIPS = [
  { icon: Sun, text: 'Bright, even light. A window works well. Avoid harsh shadows.' },
  { icon: HandIcon, text: 'Open your hand flat, fingers together, palm facing the camera.' },
  { icon: ZoomIn, text: 'Fill the frame from wrist to fingertips, in focus.' },
];

export function StepPhotos({
  mode, people, slots, photos, issues, consent, marketingConsent, onPhoto, onConsent, onMarketingConsent, botCheck, botReady,
  onBack, onSubmit,
}: Props) {
  const ready = consent && botReady && slots.every((s) => !s.required || photos[s.slot]);

  // A photo dropped next to a tile (instead of on it) would make the browser open the image and
  // leave the page, losing everything entered so far. Swallow drops outside the tiles.
  useEffect(() => {
    const stop = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    return () => {
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', stop);
    };
  }, []);
  const missing = slots.filter((s) => s.required && !photos[s.slot]).length;

  return (
    <section>
      <StepHeader
        eyebrow="Step 3 of 3"
        title={
          <>
            Photograph your <em className="accent">palms</em>
          </>
        }
        subtitle="Clear photos make the biggest difference to how accurate and personal your reading is."
      />

      <ul className="mt-10 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))] sm:mt-11">
        {TIPS.map((t) => (
          <li key={t.text} className="flex items-center gap-3.5 rounded-[20px] border border-lavender-300/14 bg-[rgba(20,16,44,0.6)] px-5 py-4 sm:px-[22px] sm:py-[18px]">
            <t.icon size={26} strokeWidth={1.7} className="shrink-0 text-gold-400" aria-hidden="true" />
            <span className="text-base leading-snug text-ink-soft">{t.text}</span>
          </li>
        ))}
      </ul>

      {people.map((p, i) => {
        const personSlots = slots.filter((s) => s.person === i);
        return (
          <div key={i} className="mt-7">
            {mode === 'couple' && (
              <h2 className="mb-4 font-display text-2xl font-medium text-gold-400">{p.name.trim() || (i === 0 ? 'Partner A' : 'Partner B')}</h2>
            )}
            <div className="flex flex-wrap justify-center gap-5">
              {personSlots.map((s) => (
                <PhotoTile
                  key={s.slot}
                  spec={s}
                  dominant={p.dominantHand === s.hand}
                  value={photos[s.slot]}
                  issue={issues[s.slot]}
                  onChange={(v) => onPhoto(s.slot, v)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="mt-7 flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-4 rounded-card border border-lavender-300/16 bg-[rgba(20,16,44,0.6)] p-5 sm:px-7 sm:py-6">
          <input type="checkbox" className="mt-1 size-[22px] flex-none cursor-pointer accent-gold-400" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
          <span className="text-base text-ink-soft">
            <span className="mb-1 flex items-center gap-2 text-[17px] font-medium text-white">
              <ShieldCheck size={18} strokeWidth={1.8} className="shrink-0 text-gold-400" aria-hidden="true" /> Your photos &amp; privacy
            </span>
            Your photos are analyzed by our AI provider, and your photos and reading are saved at a private link so you can come back
            anytime. You can delete them there whenever you like, and photos are removed automatically three years after you last
            open your reading. By continuing, you confirm you’re 18 or older{mode === 'couple' ? ', your partner has agreed to share their photos,' : ''} and
            you agree to our{' '}
            <a href="/terms/" target="_blank" className="text-gold-400 underline underline-offset-2 hover:text-gold-300">Terms</a> and{' '}
            <a href="/privacy-policy/" target="_blank" className="text-gold-400 underline underline-offset-2 hover:text-gold-300">Privacy Policy</a>.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-4 px-5 py-3 sm:px-7">
          <input type="checkbox" className="mt-1 size-[22px] flex-none cursor-pointer accent-gold-400" checked={marketingConsent} onChange={(e) => onMarketingConsent(e.target.checked)} />
          <span className="text-base text-ink-muted">
            <strong className="font-medium text-white">Optional:</strong> Palm Readings AI may use my palm photos
            {mode === 'couple' ? ' (and, with their agreement, my partner’s)' : ''} in its marketing, such as on social media or the
            website. Never with your name. You can change this anytime from your reading’s private link.
          </span>
        </label>
      </div>

      <div className="mt-6">{botCheck}</div>

      <div className="mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Button variant="ghost" onClick={onBack} className="min-h-12 px-[18px]">
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={!ready} className="px-[34px] sm:min-w-64">
          {ready && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 3l1.6 5.4L18 10l-5.4 1.6L11 17l-1.6-5.4L4 10l5.4-1.6z" />
            </svg>
          )}
          {ready
            ? 'Reveal my reading'
            : missing > 0
              ? `Add ${missing} more photo${missing > 1 ? 's' : ''}`
              : !consent
                ? 'Tick the box to continue'
                : 'Checking your connection…'}
        </Button>
      </div>
    </section>
  );
}

function PhotoTile({
  spec,
  dominant,
  value,
  issue,
  onChange,
}: {
  spec: SlotSpec;
  dominant: boolean;
  value?: string;
  issue?: string;
  onChange: (v: string | null) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave also fire for child elements; count them so the highlight doesn't flicker.
  const dragDepth = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const shownError = error ?? issue;

  const title = spec.view === 'palm' ? `${cap(spec.hand)} palm` : `${cap(spec.hand)} hand, pinky side`;
  const hint =
    spec.view === 'palm'
      ? dominant ? 'Your dominant hand' : 'Your other hand'
      : 'Turn your hand so the edge below your little finger faces the camera, fingers gently curled';

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await prepareImage(file));
    } catch (e) {
      setError(e instanceof ImageLoadError ? e.message : 'Could not read this photo. Please try another.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files');
  const drag = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (!busy) handleFile(e.dataTransfer.files[0]);
    },
  };

  return (
    // Column flex with a growing label row keeps the tiles aligned when one label wraps to two lines.
    <div className="flex w-full flex-col sm:w-[calc(50%-10px)] lg:w-[calc((100%-40px)/3)]">
      <div className="mb-2.5 flex flex-1 flex-wrap content-end items-baseline justify-between gap-x-2">
        <span id={`${id}-title`} className="text-lg font-medium text-white">{title}</span>
        <span className={`text-xs ${spec.required ? 'text-gold-400' : 'text-ink-subtle'}`}>{spec.required ? 'Required' : 'Optional, improves accuracy'}</span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      <div
        {...drag}
        className={`group relative aspect-[4/5] overflow-hidden rounded-[26px] transition-[border-color,background-color] duration-200 ${
          dragging
            ? 'border-[1.5px] border-gold-400 bg-gold-400/10'
            : shownError
              ? 'border-[1.5px] border-red-400/70'
              : value
                ? 'border border-gold-400 shadow-[0_0_0_4px_rgba(246,199,127,0.1)]'
                : 'border-[1.5px] border-dashed border-lavender-300/30 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.16),rgba(14,10,34,0.7)_70%)] hover:border-gold-400/60'
        }`}
      >
        {value ? (
          <>
            <img src={value} alt={title} className={`h-full w-full object-cover ${shownError ? 'opacity-40' : ''}`} />
            {!shownError && (
              <span aria-hidden="true" className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-gold-400 text-plum-900 shadow-gold">
                <Check size={22} strokeWidth={2.4} />
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-night-950/90 to-transparent p-3 pt-12">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-lavender-300/30 bg-night-950/60 px-4 text-sm font-medium text-white backdrop-blur transition-colors hover:border-gold-400/60 hover:bg-night-950/80"
              >
                <RefreshCw size={16} aria-hidden="true" /> Replace<span className="sr-only"> {title.toLowerCase()} photo</span>
              </button>
              <button
                type="button"
                onClick={() => { setError(null); onChange(null); }}
                aria-label={`Remove ${title}`}
                className="flex size-11 flex-none items-center justify-center rounded-full border border-lavender-300/30 bg-night-950/60 text-white backdrop-blur transition-colors hover:border-red-300/60 hover:bg-red-950/80"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-labelledby={`${id}-title ${id}-action`}
            aria-describedby={`${id}-hint`}
            className="flex h-full w-full flex-col items-center justify-center gap-3.5 p-5 text-center"
          >
            {busy ? (
              <Loader2 size={36} className="animate-spin text-gold-400" aria-hidden="true" />
            ) : (
              <HandOutline mirrored={spec.hand === 'right'} />
            )}
            <span
              id={`${id}-action`}
              className="max-w-full text-balance rounded-[22px] border border-gold-400/40 bg-gold-400/12 px-[18px] py-2.5 text-base font-medium leading-snug text-gold-300 transition-colors group-hover:bg-gold-400/20"
            >
              {busy ? (
                'Preparing…'
              ) : (
                <>
                  <Camera size={18} strokeWidth={2} className="mr-2 inline-block align-[-3px]" aria-hidden="true" />
                  <span className="[@media(pointer:fine)]:hidden">Take or upload photo</span>
                  <span className="hidden [@media(pointer:fine)]:inline">Drag a photo here or click to choose</span>
                </>
              )}
            </span>
            <span id={`${id}-hint`} className="max-w-[240px] text-sm text-ink-muted">{hint}</span>
          </button>
        )}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-night-950/80 p-4 text-center text-white backdrop-blur-sm">
            <ImageDown size={32} className="text-gold-400" aria-hidden="true" />
            <span className="text-sm font-semibold">Drop to {value ? 'replace' : 'add'} {title.toLowerCase()}</span>
          </div>
        )}
        {shownError && (
          <div className="absolute inset-x-3 top-3 flex items-start gap-2 rounded-[14px] border border-red-400/40 bg-red-950/90 p-3 text-sm font-medium text-red-100">
            <AlertCircle size={18} className="mt-px shrink-0" aria-hidden="true" /> {shownError}
          </div>
        )}
      </div>
    </div>
  );
}

/** Dashed hand-outline guide for an empty tile. The shape is a left palm seen from the front (thumb on the left); mirrored for the right palm, whose thumb shows on the right. */
function HandOutline({ mirrored }: { mirrored: boolean }) {
  return (
    <svg
      viewBox="0 0 24 28"
      fill="none"
      stroke="rgba(201,184,240,0.45)"
      strokeWidth="0.6"
      strokeDasharray="1.2 1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-auto w-[clamp(80px,30%,120px)] ${mirrored ? '-scale-x-100' : ''}`}
    >
      <path d="M18 13V7a2 2 0 0 0-4 0" />
      <path d="M14 12V4a2 2 0 0 0-4 0v3" />
      <path d="M10 12.5V7a2 2 0 0 0-4 0v9" />
      <path d="M18 9a2 2 0 1 1 4 0v7a9 9 0 0 1-9 9h-2c-3 0-5-1-6.5-2.5l-4-4a2 2 0 0 1 3-3L7 17" />
    </svg>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
