import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  Baby, Brain, Briefcase, ChevronDown, Compass, Flame, Gem, Heart, HeartHandshake, MessageCircle, Milestone, Printer,
  RotateCcw, Sparkles, Sprout, Target, TrendingUp, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import type { Curious, FamilyPrediction, GlanceItem, Hand, HandObservation, LineKey, Reading, ReadingSection, Seen } from '../../../shared/types';
import { FOCUS_LABELS } from '../../../shared/plan';
import type { SavedReading } from '../lib/storage';
import { HandDiagram } from './HandDiagram';
import { HandExplorer } from './HandExplorer';
import { LINE_COLORS, LINE_NAMES } from './observationText';
import { DeleteBox, FeedbackBox, MarketingToggle, PhotoStrip, PrivateLink, type ResultPhoto } from './ReadingTools';
import { Dot, Prose, SeenLabel } from './readingUi';
import { Button } from './ui';

export type { ResultPhoto } from './ReadingTools';

const ICONS: Record<string, LucideIcon> = {
  personality: Sparkles, potential_vs_path: Sprout, love: Heart, marriage_family: HeartHandshake, career: Briefcase, money: Wallet,
  energy: Flame, turning_points: Milestone,
  love_style: Heart, needs: HeartHandshake, patterns: Brain, timeline: Milestone, next_chapter: Compass,
  work_style: Briefcase, drive: Target, strengths: Gem, blockers: Brain, career_timeline: TrendingUp,
  person_a: Users, person_b: Users, dynamic: HeartHandshake, communication: MessageCircle, long_term: Compass,
};

/** Which section answers each "most curious about" topic, in order of preference. */
const CURIOUS_SECTIONS: Record<Curious, string[]> = {
  marriage: ['marriage_family'],
  children: ['marriage_family'],
  career: ['career', 'strengths', 'work_style'],
  money: ['money'],
  life_changes: [],
};
interface ResultsProps {
  saved: SavedReading;
  onReset: () => void;
  /** Set when the reading is saved at a private link. */
  readingId?: string;
  photos?: ResultPhoto[];
  /** True when photos were removed under the 3-year retention rule. */
  photosRemoved?: boolean;
  marketingConsent?: { value: boolean; onChange: (v: boolean) => Promise<void> };
  onDelete?: () => Promise<void>;
}

export function Results({ saved, onReset, readingId, photos, photosRemoved, marketingConsent, onDelete }: ResultsProps) {
  const { reading, observations, mode, focus, names, dominantHands } = saved;
  const title = mode === 'couple' ? `${names[0] || 'Partner A'} & ${names[1] || 'Partner B'}` : names[0] ? `${names[0]}’s Reading` : 'Your Reading';
  const personName = (i: number) => names[i] || (i === 0 ? 'Partner A' : 'Partner B');

  /** A person's dominant hand: the hand the small diagrams show. */
  const mainHand = (i: number): HandObservation | undefined => {
    const hands = observations[i]?.hands ?? [];
    return hands.find((h) => h.hand === dominantHands?.[i]) ?? hands.find((h) => h.hand === 'right') ?? hands[0];
  };
  const bothHands = (i: number) => (['left', 'right'] as Hand[]).flatMap((s) => observations[i]?.hands.filter((h) => h.hand === s) ?? []);

  // The section that answers what they were most curious about comes first.
  const curiousId = reading.curious ? CURIOUS_SECTIONS[reading.curious].find((id) => reading.sections.some((s) => s.id === id)) : undefined;
  const compare = reading.sections.find((s) => s.id === 'potential_vs_path');
  const sections = useMemo(() => {
    const rest = reading.sections.filter((s) => s.id !== 'potential_vs_path');
    const first = rest.filter((s) => s.id === curiousId);
    return [...first, ...rest.filter((s) => s.id !== curiousId)];
  }, [reading, curiousId]);
  const familyInSection = reading.sections.some((s) => s.id === 'marriage_family');
  const timelineFirst = reading.curious === 'life_changes';

  const navItems = useMemo<NavItem[]>(() => {
    const timeline = reading.timeline?.length ? [{ id: 's-timeline', label: 'Life timeline' }] : [];
    return [
      { id: 's-glance', label: reading.glance ? 'Life at a glance' : 'At a glance' },
      ...(timelineFirst ? timeline : []),
      { id: 's-hands', label: 'Your hands' },
      ...(compare ? [{ id: `s-${compare.id}`, label: compare.title, color: lineColor(compare.lines), lines: compare.lines }] : []),
      ...(timelineFirst ? [] : timeline),
      ...sections.map((s) => ({ id: `s-${s.id}`, label: s.title, color: lineColor(s.lines), lines: s.lines })),
      ...(reading.family && !familyInSection ? [{ id: 's-family', label: 'Marriage & Family' }] : []),
      { id: 's-reflection', label: 'Reflection' },
    ];
  }, [reading, sections, compare, familyInSection, timelineFirst]);
  const active = useActiveSection(navItems);
  const activeLines = navItems.find((n) => n.id === active)?.lines;

  const timeline = reading.timeline?.length ? <LifeTimeline entries={reading.timeline} /> : null;

  return (
    <article className="mx-auto max-w-3xl lg:max-w-none">
      <header className="mx-auto mb-8 max-w-3xl text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">
          {mode === 'couple' ? 'Couples Compatibility' : FOCUS_LABELS[focus]} · {title}
        </p>
        <h1 className="font-display text-3xl leading-tight text-white sm:text-5xl print-dark">{reading.headline}</h1>
        <p className="mx-auto mt-5 max-w-2xl font-read text-[1.05rem] leading-relaxed text-violet-100 sm:text-lg print-dark">{reading.summary}</p>
      </header>

      <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10 print:!block">
        <aside className="hidden lg:block print:hidden" aria-label="Reading navigation">
          <div className="sticky top-6">
            {mainHand(0) && (
              <div className="mb-4 flex items-center gap-3 px-3">
                <HandDiagram hand={mainHand(0)!} highlight={activeLines?.length ? activeLines : undefined} mini className="w-12 shrink-0" />
                <p className="text-xs leading-snug text-violet-300/70">Lines used in the section you’re reading light up here.</p>
              </div>
            )}
            <SideNav items={navItems} active={active} />
          </div>
        </aside>

        <div className="min-w-0">
          {readingId && <PrivateLink />}

          <div>
            {reading.glance ? (
              <LifeAtAGlance glance={reading.glance} family={reading.family} curious={reading.curious} sectionIds={reading.sections.map((s) => s.id)} />
            ) : (
              <>
                {reading.traits && <AtAGlance traits={reading.traits} />}
                {reading.family && <FamilyCards family={reading.family} />}
              </>
            )}

            {timelineFirst && timeline}

            <HandExplorer
              mode={mode}
              observations={observations}
              dominantHands={dominantHands}
              personName={personName}
              notes={reading.hand_notes}
              photos={photos}
            />

            <div className="space-y-5">
              {compare && <SectionCard section={compare} hands={bothHands(0)} />}

              {!timelineFirst && timeline}

              {sections.map((s) => {
                const hand = mainHand(s.id === 'person_b' ? 1 : 0);
                const isCareer = s.id === (['career', 'strengths', 'work_style'].find((id) => reading.sections.some((x) => x.id === id)) ?? '');
                return (
                  <SectionCard
                    key={s.id}
                    section={s}
                    hands={hand ? [hand] : []}
                    asked={s.id === curiousId}
                    careerPaths={isCareer ? reading.career_paths : undefined}
                    family={s.id === 'marriage_family' ? reading.family : undefined}
                  />
                );
              })}

              {reading.family && !familyInSection && (
                <section id="s-family" className="panel scroll-mt-6 p-6 sm:p-8">
                  <h2 className="mb-5 flex items-center gap-3 font-display text-xl text-white print-dark">
                    <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Baby size={20} /></span> Marriage & Family
                  </h2>
                  <FamilyDetails family={reading.family} />
                </section>
              )}

              <Reflection steps={reading.action_steps} />

              <section className="rounded-2xl border border-gold-400/30 bg-gradient-to-br from-violet-900/40 to-night-900 p-8 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">
                  {reading.closing.kind === 'mantra' ? 'Your mantra' : 'A question to sit with'}
                </p>
                <p className="font-display text-2xl leading-snug text-white print-dark">“{reading.closing.text}”</p>
              </section>
            </div>
            <BottomNav items={navItems} active={active} />
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center print:hidden">
            <Button onClick={() => window.print()}><Printer size={18} /> Save as PDF</Button>
            <Button variant="secondary" onClick={onReset}><RotateCcw size={18} /> Start a new reading</Button>
          </div>

          <FeedbackBox mode={mode} focus={focus} readingId={readingId} />

          <div className="mt-12">
            {photos && photos.length > 0 && <PhotoStrip photos={photos} />}
            {photosRemoved && (
              <p className="panel mb-5 p-4 text-sm text-violet-200/80 print:hidden">
                The photos for this reading were removed after three years without being opened. Your reading is still here.
              </p>
            )}
            {marketingConsent && !photosRemoved && <MarketingToggle {...marketingConsent} />}
          </div>

          {onDelete && <DeleteBox onDelete={onDelete} />}
        </div>
      </div>
    </article>
  );
}

const lineColor = (lines?: LineKey[]) => (lines?.[0] ? LINE_COLORS[lines[0]] : undefined);

// ---------- Life at a glance ----------

const DISCLAIMER =
  'These answers are traditional palmistry interpretations of the lines in your photos. They describe tendencies and possibilities, not facts or guarantees about your future.';

function countLabel(range: string, one: string, many: string) {
  return range.trim() === '1' ? one : many;
}

interface GlanceCardData {
  key: string;
  topic: Curious | 'life_path';
  icon: LucideIcon;
  label: string;
  /** Big number cards (marriages, children) vs. short answer cards. */
  big?: string;
  answer: string;
  detail: string;
  seen?: Seen;
  color?: string;
  href?: string;
}

function LifeAtAGlance({
  glance,
  family,
  curious,
  sectionIds,
}: {
  glance: NonNullable<Reading['glance']>;
  family: Reading['family'];
  curious?: Curious;
  sectionIds: string[];
}) {
  const has = (id: string) => sectionIds.includes(id);
  const familyHref = has('marriage_family') ? '#s-marriage_family' : undefined;
  const careerSection = ['career', 'strengths', 'work_style'].find(has);

  const fromItem = (g: GlanceItem) => ({ answer: g.answer, detail: g.detail, seen: g.visibility, color: g.line !== 'none' ? LINE_COLORS[g.line] : undefined });
  const fromFamily = (p: FamilyPrediction | undefined, one: string, many: string): Pick<GlanceCardData, 'big' | 'answer' | 'detail' | 'seen'> =>
    p
      ? p.range.trim() === '?' || p.visibility === 'not_assessable'
        ? { answer: 'Can’t read from these photos', detail: 'The lines were too fine to see clearly.', seen: 'not_assessable' }
        : { big: p.range, answer: countLabel(p.range, one, many), detail: `${p.confidence} confidence`, seen: p.visibility }
      : { answer: 'Not included', detail: 'Needs a photo of the side of your hand. Start a new reading to add it.' };

  const cards: GlanceCardData[] = [
    { key: 'marriage', topic: 'marriage', icon: HeartHandshake, label: 'Marriage', href: familyHref, ...fromFamily(family?.marriages, 'Marriage', 'Marriages') },
    { key: 'children', topic: 'children', icon: Baby, label: 'Children', href: familyHref, ...fromFamily(family?.children, 'Child', 'Children') },
    { key: 'career', topic: 'career', icon: Briefcase, label: 'Career', href: careerSection ? `#s-${careerSection}` : undefined, ...fromItem(glance.career) },
    { key: 'money', topic: 'money', icon: Wallet, label: 'Money', href: has('money') ? '#s-money' : undefined, ...fromItem(glance.money) },
    { key: 'turning', topic: 'life_changes', icon: Milestone, label: 'Biggest turning point', href: '#s-timeline', ...fromItem(glance.turning_point) },
    { key: 'path', topic: 'life_path', icon: Compass, label: 'Life path', href: has('potential_vs_path') ? '#s-potential_vs_path' : undefined, ...fromItem(glance.life_path) },
  ];
  const ordered = curious ? [...cards.filter((c) => c.topic === curious), ...cards.filter((c) => c.topic !== curious)] : cards;

  return (
    <section id="s-glance" className="mb-8 scroll-mt-6" aria-labelledby="glance-title">
      <h2 id="glance-title" className="mb-1 font-display text-2xl text-white print-dark">Your life at a glance</h2>
      <p className="mb-4 text-sm text-violet-300/80 print-muted">Tap a card to see how we read it.</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ordered.map((c) => {
          const asked = c.topic === curious;
          const Body = (
            <>
              <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-violet-300/90 print-muted">
                  <c.icon size={14} className="text-gold-400" /> {c.label}
                </span>
                {asked && <span className="whitespace-nowrap rounded-full bg-gold-400 px-2 py-0.5 text-[0.65rem] font-bold text-night-900">You asked</span>}
              </span>
              {c.big ? (
                <span className="mt-2 flex flex-wrap items-baseline gap-x-2 text-white print-dark">
                  <span className="whitespace-nowrap font-display text-4xl leading-none sm:text-5xl">{c.big}</span>
                  <span className="font-display text-lg">{c.answer}</span>
                </span>
              ) : (
                <span className={`mt-2 block font-display leading-snug text-white print-dark ${c.seen ? 'text-lg' : 'text-base text-violet-200/80'}`}>{c.answer}</span>
              )}
              <span className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-violet-300/80 print-muted">
                {c.color && <Dot color={c.color} className="mt-1" />} {c.detail}
              </span>
              {c.seen && <SeenLabel seen={c.seen} className="mt-auto pt-2" />}
            </>
          );
          const cls = `panel flex h-full flex-col px-4 py-3.5 transition ${asked ? 'border-gold-400/70 bg-gold-400/[0.06]' : ''} ${
            c.href ? 'hover:border-white/25' : ''
          }`;
          return (
            <li key={c.key}>
              {c.href ? (
                <a href={c.href} onClick={(e) => jump(e, c.href!.slice(1))} className={cls}>
                  {Body}
                </a>
              ) : (
                <div className={cls}>{Body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-violet-300/70 print-muted">{DISCLAIMER}</p>
    </section>
  );
}

/** Older solo readings and couples readings: named traits instead of life answers. */
function AtAGlance({ traits }: { traits: NonNullable<Reading['traits']> }) {
  return (
    <section id="s-glance" className="mb-8 scroll-mt-6" aria-labelledby="glance-title">
      <h2 id="glance-title" className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 print-muted">At a glance</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {traits.map((t) => {
          const color = t.line && t.line !== 'none' ? LINE_COLORS[t.line] : undefined;
          return (
            <li key={t.label} className="panel relative overflow-hidden px-4 py-3.5">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: color ?? 'rgb(254 200 120 / 0.5)' }} />
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-violet-300/80 print-muted">{t.label}</span>
              <span className="mt-1 block font-display text-lg leading-snug text-white print-dark">{t.value}</span>
              {t.line && t.line !== 'none' && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-violet-300/60 print-muted">
                  <Dot color={color} /> {LINE_NAMES[t.line]}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Couples and older readings: big marriage and children numbers under the traits. */
function FamilyCards({ family }: { family: NonNullable<Reading['family']> }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3">
      {(
        [
          [HeartHandshake, 'Marriage', family.marriages, 'Marriage', 'Marriages'],
          [Baby, 'Children', family.children, 'Child', 'Children'],
        ] as const
      ).map(([Icon, label, p, one, many]) => (
        <a key={label} href="#s-family" onClick={(e) => jump(e, 's-family')} className="panel block px-4 py-3.5 hover:border-white/25">
          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-violet-300/90">
            <Icon size={14} className="text-gold-400" /> {label}
          </span>
          <span className="mt-2 flex flex-wrap items-baseline gap-x-2 text-white print-dark">
            <span className="whitespace-nowrap font-display text-4xl leading-none">{p.range}</span>
            <span className="font-display text-lg">{countLabel(p.range, one, many)}</span>
          </span>
          {p.visibility && <SeenLabel seen={p.visibility} className="mt-2" />}
        </a>
      ))}
      <p className="col-span-2 text-xs leading-relaxed text-violet-300/70 print-muted">{DISCLAIMER}</p>
    </div>
  );
}

// ---------- Timeline ----------

const AREA_LABELS = { love: 'Love', career: 'Career', life: 'Life' } as const;

function LifeTimeline({ entries }: { entries: NonNullable<Reading['timeline']> }) {
  return (
    <section id="s-timeline" className="panel mb-5 scroll-mt-6 p-6 sm:p-8" aria-labelledby="timeline-title">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-400 print-muted">
        <Milestone size={15} /> Turning points
      </p>
      <h2 id="timeline-title" className="mt-2 font-display text-2xl text-white sm:text-3xl print-dark">Your life timeline</h2>
      <ol className="mt-6">
        {entries.map((e, i) => {
          const color = e.line !== 'none' ? LINE_COLORS[e.line] : 'var(--color-gold-400)';
          const last = i === entries.length - 1;
          return (
            <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && <span aria-hidden className="absolute left-[0.6875rem] top-7 bottom-0 w-px bg-white/15" />}
              <span
                aria-hidden
                className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-night-900"
                style={{ borderColor: color }}
              >
                <span className="size-2 rounded-full" style={{ background: color }} />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-gold-400 print-dark">{e.when}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.7rem] font-bold text-violet-300/90">{AREA_LABELS[e.area]}</span>
                  {e.timing === 'unclear' && <span className="text-xs text-violet-300/60">Timing unclear</span>}
                </p>
                <p className="mt-0.5 font-display text-lg text-white print-dark">{e.title}</p>
                <p className="mt-1 font-read leading-relaxed text-violet-100 print-dark">{e.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs leading-relaxed text-violet-300/70 print-muted">
        Ages come from the traditional palmistry timing scale and are approximate and symbolic, not forecasts.
      </p>
    </section>
  );
}

// ---------- Sections ----------

function SectionCard({
  section: s,
  hands,
  asked,
  careerPaths,
  family,
}: {
  section: ReadingSection;
  hands: HandObservation[];
  asked?: boolean;
  careerPaths?: string[];
  family?: Reading['family'];
}) {
  const Icon = ICONS[s.id] ?? Sparkles;
  const lines = s.lines ?? [];
  return (
    <section id={`s-${s.id}`} className={`panel scroll-mt-6 p-6 sm:p-8 ${asked ? 'border-gold-400/60' : ''}`}>
      {asked && <p className="mb-3 inline-block rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-bold text-night-900">You asked about this</p>}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {s.name ? (
            <>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-400 print-muted">
                <Icon size={15} /> {s.title}
              </p>
              <h2 className="mt-2 font-display text-2xl leading-tight text-white sm:text-3xl print-dark">{s.name}</h2>
            </>
          ) : (
            <h2 className="flex items-center gap-3 font-display text-xl text-white sm:text-2xl print-dark">
              <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Icon size={20} /></span>
              {s.title}
            </h2>
          )}
          {s.tags && s.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <li key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-violet-100 print-dark">{t}</li>
              ))}
            </ul>
          )}
        </div>
        {lines.length > 0 && hands.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {hands.map((h) => (
              <figure key={h.hand} className="text-center">
                <HandDiagram
                  hand={h}
                  highlight={lines}
                  mini
                  className={hands.length > 1 ? 'w-12 sm:w-16' : 'w-16 sm:w-20'}
                  title={`${h.hand} hand diagram highlighting the ${lines.map((l) => LINE_NAMES[l].toLowerCase()).join(' and ')}`}
                />
                {hands.length > 1 && <figcaption className="text-[0.65rem] text-violet-300/60">{h.hand === 'left' ? 'Left' : 'Right'}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-violet-300/80 print-muted">
          <span className="font-bold uppercase tracking-wider text-violet-300/60">Read from</span>
          {lines.map((l) => (
            <span key={l} className="flex items-center gap-1.5"><Dot color={LINE_COLORS[l]} /> {LINE_NAMES[l]}</span>
          ))}
        </p>
      )}

      {family && (
        <div className="mt-5">
          <FamilyDetails family={family} />
        </div>
      )}

      <div className="mt-5">
        <Prose text={s.body} />
      </div>

      {careerPaths && careerPaths.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-300/60 print-muted">Paths that fit</p>
          <ul className="flex flex-wrap gap-2">
            {careerPaths.map((c) => (
              <li key={c} className="rounded-xl border border-gold-400/30 bg-gold-400/[0.06] px-3 py-1.5 text-sm font-bold text-white print-dark">{c}</li>
            ))}
          </ul>
        </div>
      )}

      {s.tension && (
        <div className="mt-5 rounded-xl border-l-2 border-gold-400/60 bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gold-400 print-muted">The other side</p>
          <p className="mt-1 font-read leading-relaxed text-violet-100 print-dark">{s.tension}</p>
        </div>
      )}

      {s.evidence.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 pt-4">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-300/60 print-muted">Based on</span>
          {s.evidence.map((e) => {
            const text = typeof e === 'string' ? e : e.text;
            const faint = typeof e !== 'string' && e.visibility === 'faint';
            return (
              <span key={text} className="rounded-full bg-white/5 px-3 py-1 text-xs text-violet-200 print-muted">
                {text}
                {faint && <span className="text-gold-400/80"> · faint</span>}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FamilyDetails({ family }: { family: NonNullable<Reading['family']> }) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Prediction icon={HeartHandshake} label="Significant marriages / partnerships" p={family.marriages} one="Marriage" many="Marriages" />
        <Prediction icon={Baby} label="Potential children" p={family.children} one="Child" many="Children" />
      </div>
      <p className="mt-4 font-read leading-relaxed text-violet-100 print-dark">{family.timing}</p>
      <p className="mt-3 text-xs italic leading-relaxed text-violet-300/60 print-muted">
        These numbers come from the relationship and children lines on the edge of your palm, as traditional palmistry reads them. They are not
        predictions of how many marriages or children you will have, and family comes in many forms.
      </p>
    </div>
  );
}

function Prediction({ icon: Icon, label, p, one, many }: { icon: LucideIcon; label: string; p: FamilyPrediction; one: string; many: string }) {
  const unreadable = p.range.trim() === '?' || p.visibility === 'not_assessable';
  return (
    <div className="rounded-xl bg-white/[0.04] p-5 text-center">
      <Icon size={22} className="mx-auto mb-2 text-gold-400" />
      <p className="text-xs font-bold uppercase tracking-wider text-violet-300/80 print-muted">{label}</p>
      {unreadable ? (
        <p className="my-2 font-display text-lg text-violet-200 print-dark">Can’t read from these photos</p>
      ) : (
        <p className="my-1 flex flex-wrap items-baseline justify-center gap-x-2 text-white print-dark">
          <span className="whitespace-nowrap font-display text-4xl">{p.range}</span>
          <span className="font-display text-lg">{countLabel(p.range, one, many)}</span>
        </p>
      )}
      <p className="mb-3 flex flex-wrap items-center justify-center gap-x-3 text-xs text-violet-300/70 print-muted">
        {!unreadable && <span>{p.confidence} confidence</span>}
        {p.visibility && <SeenLabel seen={p.visibility} />}
      </p>
      <p className="text-left text-sm leading-relaxed text-violet-100 print-dark">{p.explanation}</p>
    </div>
  );
}

function Reflection({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  return (
    <section id="s-reflection" className="panel scroll-mt-6 overflow-hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-5 text-left sm:px-8 print:hidden">
        <span className="flex items-center gap-3">
          <span className="rounded-lg bg-gold-400/10 p-2 text-gold-400"><Target size={18} /></span>
          <span>
            <span className="block font-display text-lg text-white">Personal reflection</span>
            <span className="block text-sm text-violet-300/70">Optional: {steps.length} small things to try in the next two weeks</span>
          </span>
        </span>
        <ChevronDown className={`shrink-0 text-violet-300 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <ol className={`space-y-3 px-5 pb-6 sm:px-8 ${open ? '' : 'hidden print:block'}`}>
        {steps.map((a, i) => (
          <li key={a} className="flex gap-3 text-violet-100 print-dark">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-night-900">{i + 1}</span>
            <span className="pt-0.5 leading-relaxed">{a}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- Navigation ----------

interface NavItem {
  id: string;
  label: string;
  color?: string;
  lines?: LineKey[];
}

/** The id of the section in the middle band of the screen. */
function useActiveSection(items: NavItem[]) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);
  return active;
}

function jump(e: MouseEvent, id: string) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}

/** Desktop: section links in the left sidebar. */
function SideNav({ items, active }: { items: NavItem[]; active?: string }) {
  return (
    <nav aria-label="Reading sections">
      <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-400">Your reading</p>
      <ul className="space-y-0.5">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? 'true' : undefined}
              onClick={(e) => jump(e, i.id)}
              className={`flex items-center gap-2 rounded-lg border-l-2 px-3 py-1.5 text-sm transition ${
                active === i.id ? 'border-gold-400 bg-white/8 font-bold text-white' : 'border-transparent text-violet-300/80 hover:text-white'
              }`}
            >
              <Dot color={i.color ?? 'rgb(255 255 255 / 0.2)'} />
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Phone and tablet: section shortcuts that stay at the bottom of the screen. */
function BottomNav({ items, active }: { items: NavItem[]; active?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (el && bar.current) bar.current.scrollTo({ left: el.offsetLeft - bar.current.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  return (
    <nav aria-label="Reading sections" className="sticky bottom-3 z-20 mt-6 lg:hidden print:hidden">
      <div
        ref={bar}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-night-900/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((i) => (
          <a
            key={i.id}
            href={`#${i.id}`}
            data-id={i.id}
            aria-current={active === i.id ? 'true' : undefined}
            onClick={(e) => jump(e, i.id)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
              active === i.id ? 'bg-white/12 text-white' : 'text-violet-300/80 hover:text-white'
            }`}
          >
            {i.color && <Dot color={i.color} />}
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
