import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SavedReadingData, SiteConfig } from '../../shared/types';
import { Results, type ResultPhoto } from './components/Results';
import { Button } from './components/ui';
import { ApiError, deleteSavedReading, fetchConfig, fetchSavedReading, photoUrl, startCheckout, track, unlockReading, updateMarketingConsent } from './lib/api';

function photoLabel(slot: string, data: SavedReadingData): string {
  const [p, hand, view] = slot.split('-');
  const i = Number(p.slice(1));
  const who = data.mode === 'couple' ? `${data.people[i]?.name || (i === 0 ? 'Partner A' : 'Partner B')}: ` : '';
  return `${who}${hand === 'left' ? 'Left' : 'Right'} ${view === 'side' ? 'side' : 'palm'}`;
}

/** ?checkout=<session> when coming back from paying to unlock this reading. Read once, then removed from the address. */
function takeCheckoutParam(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get('checkout') ?? undefined;
  if (checkout) window.history.replaceState(null, '', window.location.pathname);
  return checkout;
}

type UnlockStatus = { state: 'writing' } | { state: 'error'; message: string; onRetry: () => void } | undefined;

/** The page at /r/<id>/: loads a saved reading by its private-link id, and unlocks a free preview once paid. */
export default function SavedReadingView() {
  const id = window.location.pathname.split('/')[2] ?? '';
  const [checkout] = useState(takeCheckoutParam);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error' | 'deleted'>('loading');
  const [data, setData] = useState<SavedReadingData | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [unlock, setUnlock] = useState<UnlockStatus>();
  const started = useRef(false);

  useEffect(() => {
    fetchSavedReading(id)
      .then((d) => {
        setData(d);
        setState(d ? 'ready' : 'missing');
      })
      .catch(() => setState('error'));
    fetchConfig()
      .then(setConfig)
      .catch(() => setConfig({ prices: { solo: 499, couple: 799 }, freeAvailable: false, payments: 'off' }));
  }, [id]);

  /** Polls until another request finishes writing the paid part (e.g. after a refresh mid-way). */
  const waitForFull = useCallback(async () => {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const d = await fetchSavedReading(id).catch(() => null);
      if (d?.tier === 'full') {
        setData(d);
        setUnlock(undefined);
        return;
      }
    }
    setUnlock({ state: 'error', message: 'Your full reading is taking longer than usual.', onRetry: () => window.location.reload() });
  }, [id]);

  const writeFull = useCallback(
    async (session?: string) => {
      setUnlock({ state: 'writing' });
      document.getElementById('s-unlock')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        await unlockReading(id, session, (e) => {
          if (e.type === 'reading') {
            setData((d) => (d ? { ...d, reading: e.reading, tier: 'full', paidAt: d.paidAt ?? new Date().toISOString() } : d));
            setUnlock(undefined);
          } else if (e.type === 'error') {
            if (e.code === 'writing') void waitForFull();
            else setUnlock({ state: 'error', message: e.message, onRetry: () => void writeFull(session) });
          }
        });
      } catch (e) {
        const notPaid = e instanceof ApiError && e.code === 'payment_required';
        setUnlock({
          state: 'error',
          message: notPaid
            ? 'We haven’t received your payment yet. If you just paid, wait a moment and try again.'
            : e instanceof Error
              ? e.message
              : 'Something went wrong.',
          onRetry: () => void writeFull(session),
        });
      }
    },
    [id, waitForFull],
  );

  // A paid preview (just back from checkout, or paid earlier but not yet written): write the rest now.
  useEffect(() => {
    if (!data || started.current || data.tier !== 'preview') return;
    if (data.paidAt || checkout) {
      started.current = true;
      if (checkout) track('purchase', { kind: 'unlock', mode: data.mode });
      void writeFull(checkout);
    }
  }, [data, checkout, writeFull]);

  const startNew = () => window.location.assign('/reading/?new=1');

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-ink-soft">
        <Loader2 className="mr-2 animate-spin" /> Loading your reading…
      </div>
    );
  }
  if (state !== 'ready' || !data) {
    const msg = {
      missing: ['Reading not found', 'This link may be mistyped, or the reading was deleted.'],
      error: ['Something went wrong', 'We couldn’t load this reading. Please refresh to try again.'],
      deleted: ['Your reading was deleted', 'Your reading and photos have been permanently erased.'],
    }[state as 'missing' | 'error' | 'deleted'];
    return (
      <section className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <h1 className="font-display text-3xl font-medium text-white">{msg[0]}</h1>
        <p className="mt-3 text-ink-muted">{msg[1]}</p>
        <Button className="mt-8" onClick={startNew}>Start a new reading</Button>
      </section>
    );
  }

  const photos: ResultPhoto[] = data.photosDeletedAt ? [] : data.photoSlots.map((slot) => ({ slot, url: photoUrl(id, slot), label: photoLabel(slot, data) }));
  const preview = data.tier === 'preview';

  return (
    <div className="w-full">
      <Results
        saved={{
          mode: data.mode,
          focus: data.focus,
          names: data.people.map((p) => p.name ?? ''),
          dominantHands: data.people.map((p) => p.dominantHand),
          reading: data.reading,
          observations: data.observations,
          createdAt: data.createdAt,
        }}
        readingId={id}
        photos={photos}
        photosRemoved={!!data.photosDeletedAt}
        marketingConsent={{ value: data.marketingConsent, onChange: (v) => updateMarketingConsent(id, v) }}
        onReset={startNew}
        onDelete={async () => {
          await deleteSavedReading(id);
          setState('deleted');
          window.scrollTo({ top: 0 });
        }}
        locked={
          preview
            ? {
                price: config?.prices[data.mode] ?? 499,
                payments: config?.payments ?? 'off',
                onUnlock: () => startCheckout({ kind: 'unlock', mode: data.mode, focus: data.focus, readingId: id }),
                status: unlock,
              }
            : undefined
        }
      />
    </div>
  );
}
