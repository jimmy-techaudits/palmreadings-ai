import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { photoSlots } from '../../shared/plan';
import type { Curious, Focus, Mode, PersonObservation, ReadingRequest, SlotId, Stage } from '../../shared/types';
import { Progress } from './components/Progress';
import { Results } from './components/Results';
import { StepChoose } from './components/StepChoose';
import { StepDetails, type PersonDraft } from './components/StepDetails';
import { StepPhotos } from './components/StepPhotos';
import { Turnstile, turnstileEnabled } from './components/Turnstile';
import { Button, Stepper } from './components/ui';
import { requestReading, track } from './lib/api';
import { stripDataUrl } from './lib/image';
import { clearReading, loadReading, saveReading, type SavedReading } from './lib/storage';

type Step = 'choose' | 'details' | 'photos' | 'reading' | 'error' | 'result';

const emptyPerson = (): PersonDraft => ({ name: '', age: '', pronouns: '' });

/** "Start a Reading" links use ?new=1 to begin fresh instead of reopening the last reading. */
function initialSaved(): SavedReading | null {
  const params = new URLSearchParams(window.location.search);
  if (params.has('new')) {
    clearReading();
    window.history.replaceState(null, '', window.location.pathname);
    return null;
  }
  return loadReading();
}

export default function App() {
  const [saved, setSaved] = useState<SavedReading | null>(initialSaved);
  const [step, setStep] = useState<Step>(() => (saved ? 'result' : 'choose'));
  const [mode, setMode] = useState<Mode>('solo');
  const [focus, setFocus] = useState<Focus>('overall');
  const [people, setPeople] = useState<PersonDraft[]>([emptyPerson()]);
  const [includeFamily, setIncludeFamily] = useState(true);
  const [curious, setCurious] = useState<Curious | null>(null);
  const [photos, setPhotos] = useState<Partial<Record<SlotId, string>>>({});
  const [issues, setIssues] = useState<Partial<Record<SlotId, string>>>({});
  const [consent, setConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [botToken, setBotToken] = useState<string | null>(null);
  // Turnstile tokens are single-use; bumping this re-mounts the widget for a fresh one.
  const [botKey, setBotKey] = useState(0);
  const [stage, setStage] = useState<Stage | null>(null);
  const [observations, setObservations] = useState<PersonObservation[] | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const complete = people.every((p) => p.dominantHand);
  const slots = useMemo(
    () => (complete ? photoSlots(people.map((p) => ({ dominantHand: p.dominantHand! })), includeFamily) : []),
    [people, includeFamily, complete],
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  // Drop photos for slots that no longer exist (e.g. dominant hand changed).
  useEffect(() => {
    const valid = new Set(slots.map((s) => s.slot));
    setPhotos((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => valid.has(k as SlotId))));
  }, [slots]);

  function choose(m: Mode, f: Focus) {
    setMode(m);
    setFocus(f);
    setPeople((prev) => (m === 'couple' ? [prev[0] ?? emptyPerson(), prev[1] ?? emptyPerson()] : [prev[0] ?? emptyPerson()]));
    setStep('details');
  }

  function reset() {
    abortRef.current?.abort();
    clearReading();
    setSaved(null);
    setPhotos({});
    setIssues({});
    setConsent(false);
    setMarketingConsent(false);
    setObservations(null);
    setStage(null);
    setIncludeFamily(true);
    setCurious(null);
    setPeople([emptyPerson()]);
    setStep('choose');
  }

  async function submit() {
    const req: ReadingRequest = {
      mode,
      focus,
      includeFamily,
      people: people.map((p) => ({
        name: p.name.trim() || undefined,
        age: p.age ? Number(p.age) : undefined,
        pronouns: p.pronouns || undefined,
        dominantHand: p.dominantHand!,
      })),
      photos: Object.entries(photos).map(([slot, data]) => ({ slot: slot as SlotId, data: stripDataUrl(data!) })),
      marketingConsent,
      curious: mode === 'solo' && curious ? curious : undefined,
      turnstileToken: botToken ?? undefined,
    };
    setBotToken(null);
    setBotKey((k) => k + 1);

    setIssues({});
    setStage(null);
    setObservations(null);
    setStep('reading');
    track('generate_reading', { mode, focus, include_family: includeFamily, curious: curious ?? 'none' });

    const controller = new AbortController();
    abortRef.current = controller;
    let obs: PersonObservation[] = [];
    try {
      await requestReading(
        req,
        (e) => {
          if (e.type === 'stage') setStage(e.stage);
          else if (e.type === 'observations') {
            obs = e.observations;
            setObservations(e.observations);
          } else if (e.type === 'photo_issues') {
            setIssues(Object.fromEntries(e.issues.map((i) => [i.slot, i.reason])));
            setStep('photos');
          } else if (e.type === 'error') {
            setError(e.message);
            setStep('error');
          } else if (e.type === 'reading') {
            if (e.id) {
              // Saved: go to the reading's private link.
              clearReading();
              window.location.assign(`/r/${e.id}/`);
              return;
            }
            const result: SavedReading = {
              mode,
              focus,
              names: people.map((p) => p.name.trim()),
              dominantHands: people.map((p) => p.dominantHand!),
              reading: e.reading,
              observations: obs,
              createdAt: new Date().toISOString(),
            };
            saveReading(result);
            setSaved(result);
            setStep('result');
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setStep('error');
    }
  }

  const stepIndex = { choose: 0, details: 1, photos: 2, reading: 3, error: 3, result: 3 }[step];

  if (step === 'result' && saved) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Results saved={saved} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="starfield relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_8%,rgba(110,52,200,0.32),transparent_70%)]" />
      <div className="relative mx-auto w-full max-w-[1100px] px-4 pb-20 pt-8 sm:px-8 sm:pb-[120px] sm:pt-12">
        <Stepper current={stepIndex} />

        {step === 'choose' && <StepChoose onChoose={choose} />}

        {step === 'details' && (
          <StepDetails
            mode={mode}
            people={people}
            includeFamily={includeFamily}
            curious={curious}
            onCuriousChange={setCurious}
            onChange={setPeople}
            onFamilyChange={setIncludeFamily}
            onBack={() => setStep('choose')}
            onNext={() => setStep('photos')}
          />
        )}

        {step === 'photos' && (
          <>
            {Object.keys(issues).length > 0 && (
              <div
                role="alert"
                className="mx-auto mt-10 flex max-w-xl items-start gap-3 rounded-card-sm border border-red-400/40 bg-red-950/40 px-5 py-4 text-base text-red-100"
              >
                <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                Some photos couldn’t be read clearly. Please replace the flagged ones and try again.
              </div>
            )}
            <StepPhotos
              mode={mode}
              people={people}
              slots={slots}
              photos={photos}
              issues={issues}
              consent={consent}
              marketingConsent={marketingConsent}
              onMarketingConsent={setMarketingConsent}
              botCheck={<Turnstile key={botKey} onToken={setBotToken} />}
              botReady={!turnstileEnabled || !!botToken}
              onPhoto={(slot, v) => {
                setPhotos((prev) => {
                  const next = { ...prev };
                  if (v) next[slot] = v;
                  else delete next[slot];
                  return next;
                });
                setIssues((prev) => {
                  const next = { ...prev };
                  delete next[slot];
                  return next;
                });
              }}
              onConsent={setConsent}
              onBack={() => setStep('details')}
              onSubmit={submit}
            />
          </>
        )}

        {step === 'reading' && <Progress stage={stage} observations={observations} />}

        {step === 'error' && (
          <section role="alert" className="mx-auto mt-10 flex max-w-[600px] flex-col items-center rounded-card-lg border border-lavender-300/16 bg-[rgba(20,16,44,0.6)] px-6 py-10 text-center sm:mt-14 sm:px-10 sm:py-12">
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full border border-line-heart/45 bg-[radial-gradient(circle,rgba(242,139,168,0.18),transparent_70%)] text-line-heart"
            >
              <AlertCircle size={28} strokeWidth={1.6} />
            </span>
            <h1 className="mt-6 font-display text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.15] text-white">
              The reading was <em className="accent">interrupted</em>
            </h1>
            <p className="mt-4 text-lg text-ink-muted">{error}</p>
            <p className="mt-2 text-base text-ink-subtle">Your photos and details are still here.</p>
            <Button className="mt-8" onClick={() => setStep('photos')}>Back to photos</Button>
          </section>
        )}
      </div>
    </div>
  );
}
