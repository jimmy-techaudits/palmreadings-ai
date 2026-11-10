import { useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Camera, Hand as HandIcon, Loader2, RefreshCw, ShieldCheck, Sparkles, Sun, X, ZoomIn } from 'lucide-react';
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
  onBack: () => void;
  onSubmit: () => void;
}

const TIPS = [
  { icon: Sun, text: 'Bright, even light. A window works well. Avoid harsh shadows.' },
  { icon: HandIcon, text: 'Open your hand flat, fingers together, palm facing the camera.' },
  { icon: ZoomIn, text: 'Fill the frame from wrist to fingertips, in focus.' },
];

export function StepPhotos({
  mode, people, slots, photos, issues, consent, marketingConsent, onPhoto, onConsent, onMarketingConsent, onBack, onSubmit,
}: Props) {
  const ready = consent && slots.every((s) => !s.required || photos[s.slot]);
  const missing = slots.filter((s) => s.required && !photos[s.slot]).length;

  return (
    <section>
      <StepHeader
        eyebrow="Step 3 of 3"
        title="Photograph your palms"
        subtitle="Clear photos make the biggest difference to how accurate and personal your reading is."
      />

      <div className="panel mb-8 grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        {TIPS.map((t) => (
          <div key={t.text} className="flex items-start gap-3">
            <t.icon size={22} className="mt-0.5 shrink-0 text-gold-400" />
            <p className="text-sm leading-relaxed text-violet-100">{t.text}</p>
          </div>
        ))}
      </div>

      {people.map((p, i) => {
        const personSlots = slots.filter((s) => s.person === i);
        return (
          <div key={i} className="mb-8">
            {mode === 'couple' && (
              <h2 className="mb-3 font-display text-lg text-gold-400">{p.name.trim() || (i === 0 ? 'Partner A' : 'Partner B')}</h2>
            )}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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

      <label className="panel flex cursor-pointer items-start gap-4 p-5">
        <input type="checkbox" className="mt-1 size-5 accent-gold-400" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
        <span className="text-sm leading-relaxed text-violet-100">
          <span className="flex items-center gap-2 font-bold text-white"><ShieldCheck size={18} className="text-gold-400" /> Your photos &amp; privacy</span>
          Your photos are analyzed by our AI provider, and your photos and reading are saved at a private link so you can come back
          anytime. You can delete them there whenever you like, and photos are removed automatically three years after you last
          open your reading. By continuing, you confirm you’re 18 or older{mode === 'couple' ? ', your partner has agreed to share their photos,' : ''} and
          you agree to our{' '}
          <a href="/terms/" target="_blank" className="text-gold-400 underline">Terms</a> and{' '}
          <a href="/privacy-policy/" target="_blank" className="text-gold-400 underline">Privacy Policy</a>.
        </span>
      </label>

      <label className="mt-3 flex cursor-pointer items-start gap-4 px-5 py-2">
        <input type="checkbox" className="mt-1 size-5 accent-gold-400" checked={marketingConsent} onChange={(e) => onMarketingConsent(e.target.checked)} />
        <span className="text-sm leading-relaxed text-violet-200/90">
          <span className="font-bold text-white">Optional:</span> Palm Readings AI may use my palm photos
          {mode === 'couple' ? ' (and, with their agreement, my partner’s)' : ''} in its marketing, such as on social media or the
          website. Never with your name. You can change this anytime from your reading’s private link.
        </span>
      </label>

      <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft size={18} /> Back</Button>
        <Button onClick={onSubmit} disabled={!ready} className="sm:min-w-64">
          <Sparkles size={18} />
          {ready ? 'Reveal my reading' : missing > 0 ? `Add ${missing} more photo${missing > 1 ? 's' : ''}` : 'Tick the box to continue'}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
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

  return (
    <div className={spec.view === 'side' ? 'col-span-2 md:col-span-1' : ''}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-semibold text-white">{title}</span>
        <span className={`text-xs ${spec.required ? 'text-gold-400' : 'text-violet-300/60'}`}>{spec.required ? 'Required' : 'Optional, improves accuracy'}</span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      <div
        className={`relative ${spec.view === 'side' ? 'aspect-[4/3] md:aspect-[4/5]' : 'aspect-[4/5]'} overflow-hidden rounded-2xl border-2 ${
          shownError ? 'border-red-400/70' : value ? 'border-gold-400/50' : 'border-dashed border-white/15'
        }`}
      >
        {value ? (
          <>
            <img src={value} alt={title} className={`h-full w-full object-cover ${shownError ? 'opacity-40' : ''}`} />
            <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
              <button onClick={() => inputRef.current?.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/15 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/25">
                <RefreshCw size={14} /> Replace
              </button>
              <button onClick={() => { setError(null); onChange(null); }} aria-label={`Remove ${title}`} className="rounded-lg bg-white/15 px-3 py-2 text-white backdrop-blur hover:bg-red-500/50">
                <X size={14} />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white/[0.02] p-4 text-center text-violet-200 transition hover:bg-white/[0.06] hover:text-white"
          >
            {busy ? <Loader2 size={30} className="animate-spin" /> : <Camera size={30} className="text-gold-400" />}
            <span className="text-sm font-bold">{busy ? 'Preparing…' : 'Take or upload photo'}</span>
            <span className="text-xs leading-snug text-violet-300/70">{hint}</span>
          </button>
        )}
        {shownError && (
          <div className="absolute inset-x-2 top-2 flex items-start gap-2 rounded-lg bg-red-950/90 p-2.5 text-xs font-semibold text-red-100">
            <AlertCircle size={16} className="shrink-0" /> {shownError}
          </div>
        )}
      </div>
    </div>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
