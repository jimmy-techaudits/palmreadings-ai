import { useState } from 'react';
import { ArrowLeft, Check, Loader2, Lock } from 'lucide-react';
import type { Focus, Mode } from '../../../shared/types';
import { FOCUS_LABELS } from '../../../shared/plan';
import { formatPrice } from '../lib/api';
import { Button, StepHeader } from './ui';

/** What a full reading includes, shown on the paywall and the unlock card. */
export const FULL_READING_INCLUDES = [
  'Your life at a glance: marriage, children, career, money, turning point and life path',
  'Both hands explored, line by line',
  'Born with vs. built: how your two hands compare',
  'Your life timeline of turning points',
  'Love, marriage and family in depth',
  'Career and success, with the paths that fit you',
  'Money, energy and wellbeing',
  'A personal reflection and your mantra',
];

interface Props {
  mode: Mode;
  focus: Focus;
  /** Price in cents. */
  price: number;
  /** Why payment is needed. */
  reason: 'couple' | 'free_used';
  /** "mock": local test checkout, no real payment. */
  payments: 'stripe' | 'mock' | 'off';
  /** Shown when a previous attempt failed. */
  error?: string;
  onPay: () => Promise<void>;
  onBack: () => void;
}

/** Shown before the details step when a reading must be paid for up front. */
export function StepPaywall({ mode, focus, price, reason, payments, error, onPay, onBack }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  async function pay() {
    setBusy(true);
    setFailed('');
    try {
      await onPay();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'We could not start the checkout. Please try again.');
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-[760px]">
      <StepHeader
        eyebrow={mode === 'couple' ? 'Couples Compatibility' : FOCUS_LABELS[focus]}
        title={
          reason === 'free_used' ? (
            <>
              Your full reading <em className="accent">awaits</em>
            </>
          ) : (
            <>
              Read both of your <em className="accent">hands</em>
            </>
          )
        }
        subtitle={
          reason === 'free_used'
            ? 'You’ve already had your free reading. A full reading gives you everything your hands show, with nothing locked.'
            : 'A couples reading reads all four hands to show how you connect, where you clash and how you grow together.'
        }
      />

      <div className="mt-10 rounded-card-lg border border-gold-400/35 bg-[linear-gradient(160deg,rgba(40,22,84,0.75),rgba(14,10,34,0.8))] p-6 shadow-panel sm:p-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{mode === 'couple' ? 'Couples reading' : 'Full reading'}</p>
            <p className="mt-2 font-display text-[44px] leading-none text-white">{formatPrice(price)}</p>
            <p className="mt-2 text-base text-ink-muted">One-time payment. No subscription, no account.</p>
          </div>
          <Lock size={36} strokeWidth={1.4} className="text-gold-400/70" aria-hidden="true" />
        </div>

        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {(mode === 'couple'
            ? ['Both partners’ hands read and compared', 'How your dynamic works', 'A communication translation guide', 'Your long-term potential', 'Marriage and children lines, if you include them', 'A shared reflection and mantra']
            : FULL_READING_INCLUDES
          ).map((item) => (
            <li key={item} className="flex gap-3 text-base text-ink-soft">
              <Check size={18} className="mt-1 shrink-0 text-gold-400" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        {(error || failed) && (
          <p role="alert" className="mt-6 rounded-card-sm border border-[#f28ba8]/35 bg-[#f28ba8]/[0.08] px-4 py-3 text-base text-[#ffd0dc]">
            {failed || error}
          </p>
        )}

        <Button onClick={pay} disabled={busy || payments === 'off'} className="mt-8 w-full">
          {busy ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
          {payments === 'off' ? 'Payments are coming soon' : `Continue to secure checkout · ${formatPrice(price)}`}
        </Button>
        <p className="mt-4 text-center text-sm text-ink-subtle">
          {payments === 'mock' ? (
            <strong className="text-gold-300">Test mode: no real payment is taken.</strong>
          ) : (
            <>Payments are processed securely by Stripe. </>
          )}{' '}
          After paying you’ll come right back here to add your details and photos. See our{' '}
          <a href="/refund-policy/" className="text-gold-400 underline underline-offset-4">
            Refund Policy
          </a>
          .
        </p>
      </div>

      <div className="mt-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </Button>
      </div>
    </section>
  );
}
