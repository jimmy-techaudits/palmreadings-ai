import { ArrowLeft, ArrowRight, Baby, Briefcase, HeartHandshake, Milestone, Wallet, type LucideIcon } from 'lucide-react';
import type { Curious, Hand, Mode } from '../../../shared/types';
import { Button, StepHeader } from './ui';

export interface PersonDraft {
  name: string;
  age: string;
  pronouns: string;
  dominantHand?: Hand;
}

const PRONOUNS = ['', 'she/her', 'he/him', 'they/them', 'she/they', 'he/they'];
const input =
  'w-full rounded-xl border border-white/10 bg-night-900/70 px-4 py-3 text-white placeholder:text-violet-300/40 focus:border-gold-400 focus:outline-none';

const CURIOUS_OPTIONS: { value: Curious; label: string; icon: LucideIcon }[] = [
  { value: 'marriage', label: 'Marriage', icon: HeartHandshake },
  { value: 'children', label: 'Children', icon: Baby },
  { value: 'career', label: 'Career', icon: Briefcase },
  { value: 'money', label: 'Money', icon: Wallet },
  { value: 'life_changes', label: 'Life changes', icon: Milestone },
];

interface Props {
  mode: Mode;
  people: PersonDraft[];
  includeFamily: boolean;
  curious: Curious | null;
  onChange: (people: PersonDraft[]) => void;
  onFamilyChange: (v: boolean) => void;
  onCuriousChange: (v: Curious | null) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepDetails({ mode, people, includeFamily, curious, onChange, onFamilyChange, onCuriousChange, onBack, onNext }: Props) {
  const update = (i: number, patch: Partial<PersonDraft>) => onChange(people.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const ready = people.every((p) => p.dominantHand);

  return (
    <section className="mx-auto max-w-3xl">
      <StepHeader
        eyebrow="Step 2 of 3"
        title={mode === 'couple' ? 'Tell us about you both' : 'Tell us about you'}
        subtitle="We read both hands. In our method your dominant hand shows the life you’re building and the other shows your natural tendencies."
      />

      <div className={`grid gap-5 ${mode === 'couple' ? 'md:grid-cols-2' : ''}`}>
        {people.map((p, i) => (
          <div key={i} className="panel space-y-5 p-5 sm:p-6">
            {mode === 'couple' && <h2 className="font-display text-lg text-gold-400">{i === 0 ? 'Partner A' : 'Partner B'}</h2>}

            <fieldset>
              <legend className="mb-2 text-sm font-bold text-white">
                Which hand do you write with? <span className="text-gold-400">*</span>
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(['left', 'right'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={p.dominantHand === h}
                    onClick={() => update(i, { dominantHand: h })}
                    className={`rounded-xl border px-4 py-3 font-semibold capitalize transition ${
                      p.dominantHand === h ? 'border-gold-400 bg-gold-400/15 text-white' : 'border-white/10 text-violet-200 hover:border-white/30'
                    }`}
                  >
                    {h} hand
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1.5 block text-sm font-semibold text-violet-100">First name <span className="font-normal text-violet-300/60">(optional)</span></span>
                <input className={input} value={p.name} maxLength={40} onChange={(e) => update(i, { name: e.target.value })} autoComplete="given-name" />
              </label>
              <label className="col-span-1 block">
                <span className="mb-1.5 block text-sm font-semibold text-violet-100">Age <span className="font-normal text-violet-300/60">(optional)</span></span>
                <input className={input} inputMode="numeric" value={p.age} onChange={(e) => update(i, { age: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
              </label>
              <label className="col-span-1 block">
                <span className="mb-1.5 block text-sm font-semibold text-violet-100">Pronouns</span>
                <select className={input} value={p.pronouns} onChange={(e) => update(i, { pronouns: e.target.value })}>
                  {PRONOUNS.map((v) => (
                    <option key={v} value={v}>{v || 'Prefer not to say'}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-violet-300/60">Age helps us place your life phases on the timeline of your lines.</p>
          </div>
        ))}
      </div>

      <label className="panel mt-5 flex cursor-pointer items-start gap-4 p-5 sm:p-6">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-gold-400"
          checked={includeFamily}
          onChange={(e) => {
            onFamilyChange(e.target.checked);
            if (!e.target.checked && (curious === 'marriage' || curious === 'children')) onCuriousChange(null);
          }}
        />
        <span>
          <span className="flex items-center gap-2 font-bold text-white">
            <Baby size={18} className="text-gold-400" /> Include marriage & children predictions
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-violet-200/80">
            Read from the small lines on the edge of your palm below the little finger, so we’ll ask for one extra photo of the side of
            your hand. Untick this if you’d rather skip it.
          </span>
        </span>
      </label>

      {mode === 'solo' && (
        <fieldset className="panel mt-5 p-5 sm:p-6">
          <legend className="sr-only">What are you most curious about?</legend>
          <p className="font-bold text-white">
            What are you most curious about? <span className="font-normal text-violet-300/60">(optional)</span>
          </p>
          <p className="mt-1 text-sm text-violet-200/80">We’ll show this first and go deepest on it. You still get the full reading.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CURIOUS_OPTIONS.map(({ value, label, icon: Icon }) => {
              const on = curious === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    onCuriousChange(on ? null : value);
                    if (!on && (value === 'marriage' || value === 'children')) onFamilyChange(true);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    on ? 'border-gold-400 bg-gold-400/15 text-white' : 'border-white/10 text-violet-200 hover:border-white/30'
                  }`}
                >
                  <Icon size={16} className="text-gold-400" /> {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft size={18} /> Back</Button>
        <Button onClick={onNext} disabled={!ready}>Continue to photos <ArrowRight size={18} /></Button>
      </div>
    </section>
  );
}
