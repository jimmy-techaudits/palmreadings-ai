import { useId } from 'react';
import { ArrowLeft, ArrowRight, Clock, Hand as HandIcon } from 'lucide-react';
import type { Curious, Hand, Mode } from '../../../shared/types';
import { Button, StepHeader } from './ui';

export interface PersonDraft {
  name: string;
  age: string;
  pronouns: string;
  dominantHand?: Hand;
}

const PRONOUNS = ['', 'she/her', 'he/him', 'they/them', 'she/they', 'he/they'];
const field =
  'h-14 w-full rounded-input border border-lavender-300/20 px-[18px] text-[17px] font-normal text-white placeholder:text-ink-faint focus:border-gold-400';
const card = 'rounded-card-lg border border-lavender-300/16 bg-[rgba(20,16,44,0.6)] p-5 sm:p-8';
const labelText = 'flex flex-col gap-2 text-base font-medium text-[#e4dcfa]';
const optional = <span className="text-sm font-normal text-ink-subtle">(optional)</span>;

const CURIOUS_OPTIONS: { value: Curious; label: string }[] = [
  { value: 'marriage', label: 'Marriage' },
  { value: 'children', label: 'Children' },
  { value: 'career', label: 'Career' },
  { value: 'money', label: 'Money' },
  { value: 'life_changes', label: 'Life changes' },
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
  const familyId = useId();

  function toggleFamily() {
    const next = !includeFamily;
    onFamilyChange(next);
    if (!next && (curious === 'marriage' || curious === 'children')) onCuriousChange(null);
  }

  return (
    <section className="mx-auto max-w-[796px]">
      <StepHeader
        eyebrow="Step 2 of 3"
        title={
          mode === 'couple' ? (
            <>
              Tell us about <em className="accent">you both</em>
            </>
          ) : (
            <>
              Tell us about <em className="accent">you</em>
            </>
          )
        }
        subtitle="We read both hands. In our method your dominant hand shows the life you’re building and the other shows your natural tendencies."
      />

      <div className="mt-10 flex flex-col gap-5 sm:mt-12">
        {people.map((p, i) =>
          mode === 'couple' ? (
            <div key={i} className={`${card} flex flex-col gap-7`}>
              <h2 className="font-display text-2xl font-medium text-gold-400">{i === 0 ? 'Partner A' : 'Partner B'}</h2>
              <HandChoice value={p.dominantHand} onChange={(h) => update(i, { dominantHand: h })} />
              <PersonFields person={p} onChange={(patch) => update(i, patch)} />
            </div>
          ) : (
            <div key={i} className="contents">
              <div className={card}>
                <HandChoice value={p.dominantHand} onChange={(h) => update(i, { dominantHand: h })} />
              </div>
              <div className={card}>
                <PersonFields person={p} onChange={(patch) => update(i, patch)} />
              </div>
            </div>
          ),
        )}

        <div className="flex items-start gap-4 rounded-card-lg border border-gold-400/25 bg-[linear-gradient(135deg,rgba(40,22,84,0.6),rgba(20,16,44,0.6))] p-5 sm:gap-5 sm:px-8 sm:py-7">
          <div className="min-w-0 flex-1">
            <p id={`${familyId}-label`} className="text-lg font-medium text-white">
              Include marriage &amp; children predictions
            </p>
            <p id={`${familyId}-desc`} className="mt-1.5 text-base text-ink-muted">
              Read from the small lines on the edge of your palm below the little finger, so we’ll ask for one extra photo of the side of
              your hand. Turn this off if you’d rather skip it.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeFamily}
            aria-labelledby={`${familyId}-label`}
            aria-describedby={`${familyId}-desc`}
            onClick={toggleFamily}
            className={`relative h-[34px] w-[60px] flex-none cursor-pointer rounded-full border transition-colors ${
              includeFamily ? 'border-gold-400 bg-gold-400' : 'border-lavender-300/30 bg-night-950/60'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-[3px] size-[26px] rounded-full transition-[left] duration-200 ${
                includeFamily ? 'left-[29px] bg-plum-900' : 'left-[3px] bg-lavender-300'
              }`}
            />
          </button>
        </div>

        {mode === 'solo' && (
          <fieldset className={card}>
            <legend className="float-left w-full text-lg font-medium text-white">
              What are you most curious about? <span className="text-base font-normal text-ink-subtle">(optional)</span>
            </legend>
            <p className="clear-both pt-1.5 text-base text-ink-muted">We’ll show this first and go deepest on it. You still get the full reading.</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {CURIOUS_OPTIONS.map(({ value, label }) => {
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
                    className={`min-h-12 rounded-full border px-[22px] py-2.5 text-base font-medium transition-colors ${
                      on
                        ? 'border-gold-400 bg-gold-400 text-plum-900'
                        : 'border-lavender-300/22 bg-night-950/50 text-[#e4dcfa] hover:border-gold-400/50 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      <div className="mt-9 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Button variant="ghost" onClick={onBack} className="min-h-12 px-[18px]">
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </Button>
        <Button onClick={onNext} disabled={!ready}>
          Continue to photos <ArrowRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

function HandChoice({ value, onChange }: { value?: Hand; onChange: (h: Hand) => void }) {
  return (
    <fieldset>
      <legend className="float-left mb-[18px] w-full text-lg font-medium text-white">
        Which hand do you write with? <span className="text-gold-400" aria-hidden="true">*</span>
        <span className="sr-only">(required)</span>
      </legend>
      <div className="clear-both grid grid-cols-2 gap-3.5">
        {(['left', 'right'] as const).map((h) => {
          const on = value === h;
          return (
            <button
              key={h}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(h)}
              className={`flex flex-col items-center gap-3 rounded-[22px] border px-4 py-6 transition-[border-color,background-color,box-shadow] duration-200 sm:py-7 ${
                on
                  ? 'border-gold-400 bg-[linear-gradient(160deg,rgba(60,30,120,0.7),rgba(20,14,46,0.8))] text-gold-300 shadow-[0_0_0_4px_rgba(246,199,127,0.12)]'
                  : 'border-lavender-300/18 bg-night-950/50 text-ink-soft hover:border-gold-400/50'
              }`}
            >
              {/* Shown palm-up, as you see your own palm: the icon's thumb is on the left, which matches the left hand. Mirror it for the right. */}
              <HandIcon size={44} strokeWidth={1.4} aria-hidden="true" className={h === 'right' ? '-scale-x-100' : ''} />
              <span className="text-lg font-medium">{h === 'left' ? 'Left hand' : 'Right hand'}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PersonFields({ person: p, onChange }: { person: PersonDraft; onChange: (patch: Partial<PersonDraft>) => void }) {
  return (
    <div>
      <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        <label className={labelText}>
          <span>First name {optional}</span>
          <input
            className={`${field} bg-night-950/60`}
            value={p.name}
            maxLength={40}
            onChange={(e) => onChange({ name: e.target.value })}
            autoComplete="given-name"
            placeholder="So we can address you"
          />
        </label>
        <label className={labelText}>
          <span>Age {optional}</span>
          <input
            className={`${field} bg-night-950/60`}
            inputMode="numeric"
            value={p.age}
            onChange={(e) => onChange({ age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
            placeholder="e.g. 32"
          />
        </label>
        <label className={labelText}>
          <span>Pronouns {optional}</span>
          <select className={`${field} bg-night-850`} value={p.pronouns} onChange={(e) => onChange({ pronouns: e.target.value })}>
            {PRONOUNS.map((v) => (
              <option key={v} value={v}>
                {v || 'Prefer not to say'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-[18px] flex items-start gap-2 text-sm text-ink-subtle">
        <Clock size={16} strokeWidth={1.8} className="mt-[3px] shrink-0 text-gold-400" aria-hidden="true" />
        Age helps us place your life phases on the timeline of your lines.
      </p>
    </div>
  );
}
