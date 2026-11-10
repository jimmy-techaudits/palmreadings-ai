import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SavedReadingData } from '../../shared/types';
import { Results, type ResultPhoto } from './components/Results';
import { Button } from './components/ui';
import { deleteSavedReading, fetchSavedReading, photoUrl } from './lib/api';

function photoLabel(slot: string, data: SavedReadingData): string {
  const [p, hand, view] = slot.split('-');
  const i = Number(p.slice(1));
  const who = data.mode === 'couple' ? `${data.people[i]?.name || (i === 0 ? 'Partner A' : 'Partner B')}: ` : '';
  return `${who}${hand === 'left' ? 'Left' : 'Right'} ${view === 'side' ? 'side' : 'palm'}`;
}

/** The page at /r/<id>/: loads a saved reading by its private-link id. */
export default function SavedReadingView() {
  const id = window.location.pathname.split('/')[2] ?? '';
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error' | 'deleted'>('loading');
  const [data, setData] = useState<SavedReadingData | null>(null);

  useEffect(() => {
    fetchSavedReading(id)
      .then((d) => {
        setData(d);
        setState(d ? 'ready' : 'missing');
      })
      .catch(() => setState('error'));
  }, [id]);

  const startNew = () => window.location.assign('/reading/?new=1');

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-violet-200">
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
        <h1 className="font-display text-3xl text-white">{msg[0]}</h1>
        <p className="mt-3 text-violet-200/80">{msg[1]}</p>
        <Button className="mt-8" onClick={startNew}>Start a new reading</Button>
      </section>
    );
  }

  const photos: ResultPhoto[] = data.photoSlots.map((slot) => ({ slot, url: photoUrl(id, slot), label: photoLabel(slot, data) }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <Results
        saved={{
          mode: data.mode,
          focus: data.focus,
          names: data.people.map((p) => p.name ?? ''),
          reading: data.reading,
          observations: data.observations,
          createdAt: data.createdAt,
        }}
        readingId={id}
        photos={photos}
        onReset={startNew}
        onDelete={async () => {
          await deleteSavedReading(id);
          setState('deleted');
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}
