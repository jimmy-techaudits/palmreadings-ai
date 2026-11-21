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
    return <p className="panel mx-auto mt-12 max-w-lg p-6 text-center text-ink-soft print:hidden">Thank you! Your feedback helps us improve.</p>;
  }
  return (
    <div className="panel mx-auto mt-12 max-w-lg p-6 text-center sm:p-8 print:hidden">
      <h2 className="font-display text-2xl font-medium text-white">Did this reading <em className="accent">resonate?</em></h2>
      <div className="mt-4 flex justify-center gap-3">
        {([
          [1, ThumbsUp, 'Spot on'],
          [-1, ThumbsDown, 'Off base'],
        ] as const).map(([v, Icon, label]) => (
          <button
            key={v}
            onClick={() => setRating(v)}
            aria-pressed={rating === v}
            className={`flex min-h-11 items-center gap-2 rounded-full border px-5 py-2.5 font-medium transition ${
              rating === v ? 'border-gold-400 bg-gold-400/15 text-white' : 'border-lavender-300/25 text-ink-soft hover:border-lavender-300/50'
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
            className="min-h-24 w-full rounded-input border border-lavender-300/16 bg-[rgba(6,6,15,0.6)] p-3.5 text-base text-white placeholder:text-ink-faint focus:border-gold-400"
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
    <section className="flex flex-wrap items-center gap-4 rounded-[22px] border border-gold-400/28 bg-[linear-gradient(135deg,rgba(40,22,84,0.65),rgba(14,10,34,0.65))] px-6 py-5 print:hidden">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-400/12 text-gold-400">
        <Link2 size={20} />
      </span>
      <div className="min-w-0 flex-[1_1_280px]">
        <p className="font-medium text-white">This is your private link</p>
        <p className="mt-0.5 text-sm text-ink-muted">Bookmark it to come back anytime. Anyone with the link can see this reading and its photos.</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border border-gold-400/50 bg-gold-400/10 px-[22px] py-2.5 text-base font-medium text-gold-300 transition hover:bg-gold-400/20"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Link copied' : 'Copy link'}
      </button>
    </section>
  );
}

export function PhotoStrip({ photos }: { photos: ResultPhoto[] }) {
  return (
    <section className="mb-5">
      <p className="eyebrow mb-3 print-muted">Photos used for this reading</p>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {photos.map((p) => (
          <li key={p.slot}>
            <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-card-sm border border-lavender-300/16 hover:border-gold-400/60">
              <img src={p.url} alt={p.label} loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </a>
            <span className="mt-1.5 block text-center text-xs text-ink-subtle print-muted">{p.label}</span>
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
        <button onClick={() => setState('confirm')} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-subtle underline underline-offset-4 hover:text-[#f7a9bf]">
          <Trash2 size={15} /> Delete this reading and its photos
        </button>
      ) : (
        <div className="rounded-card border border-[#f28ba8]/35 bg-[#f28ba8]/[0.06] p-6">
          <p className="font-medium text-white">Delete this reading permanently?</p>
          <p className="mt-1 text-sm text-ink-muted">Your reading and photos will be erased and this link will stop working. This can’t be undone.</p>
          {state === 'error' && <p className="mt-2 text-sm text-[#f7a9bf]">Something went wrong. Please try again.</p>}
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setState('idle')} disabled={state === 'deleting'}>Keep it</Button>
            <Button onClick={run} disabled={state === 'deleting'} className="!bg-none !bg-[#e0577d] !text-white !shadow-none">
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
    <label className="mb-8 flex cursor-pointer items-start gap-3 text-base text-ink-soft print:hidden">
      <input type="checkbox" className="mt-0.5 size-5 accent-gold-400" checked={checked} disabled={state === 'saving'} onChange={(e) => toggle(e.target.checked)} />
      <span>
        Palm Readings AI may use these palm photos in its marketing (never with your name).
        {state === 'saved' && <span className="ml-2 font-bold text-gold-400">Saved</span>}
        {state === 'error' && <span className="ml-2 font-bold text-[#f7a9bf]">Couldn’t save, please try again</span>}
      </span>
    </label>
  );
}
