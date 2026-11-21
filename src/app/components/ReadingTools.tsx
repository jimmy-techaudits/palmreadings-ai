// Tools under a reading: feedback, private link, photos, marketing permission and delete.
import { useState } from 'react';
import { Check, Copy, Link2, Loader2, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { sendFeedback } from '../lib/api';
import { Button } from './ui';

export interface ResultPhoto {
  slot: string;
  url: string;
  label: string;
}

export function FeedbackBox({ mode, focus, readingId }: { mode: string; focus: string; readingId?: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function submit() {
    if (!rating) return;
    setState('sending');
    await sendFeedback({ rating, comment, mode, focus, readingId }).catch(() => {});
    setState('sent');
  }

  if (state === 'sent') {
    return <p className="panel mx-auto mt-12 max-w-lg p-6 text-center text-violet-100 print:hidden">Thank you! Your feedback helps us improve.</p>;
  }
  return (
    <div className="panel mx-auto mt-12 max-w-lg p-6 text-center print:hidden">
      <h2 className="font-display text-lg text-white">Did this reading resonate?</h2>
      <div className="mt-4 flex justify-center gap-3">
        {([
          [1, ThumbsUp, 'Spot on'],
          [-1, ThumbsDown, 'Off base'],
        ] as const).map(([v, Icon, label]) => (
          <button
            key={v}
            onClick={() => setRating(v)}
            aria-pressed={rating === v}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition ${
              rating === v ? 'border-gold-400 bg-gold-400/15 text-white' : 'border-white/10 text-violet-200 hover:border-white/30'
            }`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>
      {rating !== null && (
        <div className="mt-4 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            placeholder="What resonated, or what felt off? (optional)"
            className="min-h-24 w-full rounded-xl border border-white/10 bg-night-900/70 p-3 text-sm text-white placeholder:text-violet-300/40 focus:border-gold-400 focus:outline-none"
          />
          <Button onClick={submit} disabled={state === 'sending'} className="w-full">
            {state === 'sending' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send feedback
          </Button>
        </div>
      )}
    </div>
  );
}

export function PrivateLink() {
  const [copied, setCopied] = useState(false);
  const url = window.location.href.split('?')[0];
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your private link:', url);
    }
  }
  return (
    <section className="panel mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div className="flex items-start gap-3">
        <Link2 size={20} className="mt-0.5 shrink-0 text-gold-400" />
        <div>
          <p className="font-bold text-white">This is your private link</p>
          <p className="text-sm text-violet-200/80">Bookmark it to come back anytime. Anyone with the link can see this reading and its photos.</p>
        </div>
      </div>
      <Button variant="secondary" onClick={copy} className="shrink-0">
        {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy link'}
      </Button>
    </section>
  );
}

export function PhotoStrip({ photos }: { photos: ResultPhoto[] }) {
  return (
    <section className="mb-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">Photos used for this reading</p>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {photos.map((p) => (
          <li key={p.slot}>
            <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10 hover:border-gold-400/60">
              <img src={p.url} alt={p.label} loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </a>
            <span className="mt-1 block text-center text-xs text-violet-300/80 print-muted">{p.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DeleteBox({ onDelete }: { onDelete: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'deleting' | 'error'>('idle');
  async function run() {
    setState('deleting');
    try {
      await onDelete();
    } catch {
      setState('error');
    }
  }
  return (
    <div className="mx-auto mt-8 max-w-lg text-center print:hidden">
      {state === 'idle' ? (
        <button onClick={() => setState('confirm')} className="inline-flex items-center gap-2 text-sm text-violet-300/70 underline hover:text-red-300">
          <Trash2 size={15} /> Delete this reading and its photos
        </button>
      ) : (
        <div className="panel border-red-400/30 p-5">
          <p className="font-bold text-white">Delete this reading permanently?</p>
          <p className="mt-1 text-sm text-violet-200/80">Your reading and photos will be erased and this link will stop working. This can’t be undone.</p>
          {state === 'error' && <p className="mt-2 text-sm text-red-300">Something went wrong. Please try again.</p>}
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setState('idle')} disabled={state === 'deleting'}>Keep it</Button>
            <Button onClick={run} disabled={state === 'deleting'} className="!bg-red-500 !text-white hover:!bg-red-400">
              {state === 'deleting' ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketingToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => Promise<void> }) {
  const [checked, setChecked] = useState(value);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  async function toggle(v: boolean) {
    setChecked(v);
    setState('saving');
    try {
      await onChange(v);
      setState('saved');
    } catch {
      setChecked(!v);
      setState('error');
    }
  }
  return (
    <label className="mb-8 flex cursor-pointer items-start gap-3 text-sm text-violet-200/90 print:hidden">
      <input type="checkbox" className="mt-0.5 size-5 accent-gold-400" checked={checked} disabled={state === 'saving'} onChange={(e) => toggle(e.target.checked)} />
      <span>
        Palm Readings AI may use these palm photos in its marketing (never with your name).
        {state === 'saved' && <span className="ml-2 font-bold text-gold-400">Saved</span>}
        {state === 'error' && <span className="ml-2 font-bold text-red-300">Couldn’t save, please try again</span>}
      </span>
    </label>
  );
}
