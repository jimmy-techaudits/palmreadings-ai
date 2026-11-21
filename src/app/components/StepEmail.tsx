import { useState, type FormEvent } from 'react';
import { ArrowLeft, Mail, Sparkles } from 'lucide-react';
import { EMAIL_CONSENT_TEXT } from '../../../shared/business';
import { Button, StepHeader } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Before a free reading: the email box is the main path (we email the private link, and giving it
 * means agreeing to occasional emails), with a quieter "Continue without email".
 */
export function StepEmail({ onSubmit, onBack }: { onSubmit: (email: string | null) => void; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError('Please enter a valid email address.');
      return;
    }
    onSubmit(value);
  }

  return (
    <section className="mx-auto max-w-[640px]">
      <StepHeader
        eyebrow="Almost there"
        title={
          <>
            Where should we send your <em className="accent">reading?</em>
          </>
        }
        subtitle="We’ll email you the private link to your reading so you can come back to it anytime."
      />

      <form onSubmit={submit} noValidate className="mt-10 rounded-card-lg border border-lavender-300/16 bg-[rgba(20,16,44,0.6)] p-6 sm:p-9">
        <label className="block">
          <span className="mb-2 block text-base font-medium text-white">Your email</span>
          <span className="relative block">
            <Mail size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              aria-invalid={!!error}
              aria-describedby="email-consent email-error"
              placeholder="you@example.com"
              className="min-h-[52px] w-full rounded-input border border-lavender-300/20 bg-[rgba(6,6,15,0.6)] py-3 pl-12 pr-4 text-lg text-white placeholder:text-ink-faint focus:border-gold-400"
            />
          </span>
        </label>
        {error && (
          <p id="email-error" role="alert" className="mt-2 text-base text-[#ffb3c1]">
            {error}
          </p>
        )}
        <p id="email-consent" className="mt-3 text-sm leading-relaxed text-ink-subtle">
          {EMAIL_CONSENT_TEXT} See our{' '}
          <a href="/privacy-policy/" target="_blank" className="text-gold-400 underline underline-offset-4">
            Privacy Policy
          </a>
          .
        </p>
        <Button type="submit" className="mt-7 w-full">
          <Sparkles size={18} aria-hidden="true" /> Email me my reading
        </Button>
        <div className="mt-4 text-center">
          <button type="button" onClick={() => onSubmit(null)} className="min-h-11 text-base text-ink-subtle underline underline-offset-4 hover:text-white">
            Continue without email
          </button>
        </div>
      </form>

      <div className="mt-8">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} /> Back to photos
        </Button>
      </div>
    </section>
  );
}
