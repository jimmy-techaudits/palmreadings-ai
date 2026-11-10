import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { photoSlots } from '../../shared/plan';
import type { Focus, Mode, PersonObservation, ReadingRequest, SlotId, Stage } from '../../shared/types';
import { Progress } from './components/Progress';
import { Results } from './components/Results';
import { StepChoose } from './components/StepChoose';
import { StepDetails, type PersonDraft } from './components/StepDetails';
import { StepPhotos } from './components/StepPhotos';
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
  const [includeFamily, setIncludeFamily] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<SlotId, string>>>({});
  const [issues, setIssues] = useState<Partial<Record<SlotId, string>>>({});
  const [consent, setConsent] = useState(false);
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
    setObservations(null);
    setStage(null);
    setIncludeFamily(false);
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
    };

    setIssues({});
    setStage(null);
    setObservations(null);
    setStep('reading');
    track('generate_reading', { mode, focus, include_family: includeFamily });

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
            const result: SavedReading = {
              mode,
              focus,
              names: people.map((p) => p.name.trim()),
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      {step !== 'result' && <Stepper current={stepIndex} />}

      {step === 'choose' && <StepChoose onChoose={choose} />}

      {step === 'details' && (
        <StepDetails
          mode={mode}
          people={people}
          includeFamily={includeFamily}
          onChange={setPeople}
          onFamilyChange={setIncludeFamily}
          onBack={() => setStep('choose')}
          onNext={() => setStep('photos')}
        />
      )}

      {step === 'photos' && (
        <>
          {Object.keys(issues).length > 0 && (
            <div role="alert" className="mx-auto mb-6 flex max-w-xl items-start gap-3 rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100">
              <AlertCircle size={20} className="shrink-0" />
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
        <section role="alert" className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
          <AlertCircle size={40} className="mb-4 text-red-300" />
          <h1 className="font-display text-2xl text-white">The reading was interrupted</h1>
          <p className="mt-3 text-violet-200/80">{error}</p>
          <p className="mt-1 text-sm text-violet-300/60">Your photos and details are still here.</p>
          <Button className="mt-6" onClick={() => setStep('photos')}>Back to photos</Button>
        </section>
      )}

      {step === 'result' && saved && <Results saved={saved} onReset={reset} />}
    </div>
  );
}
