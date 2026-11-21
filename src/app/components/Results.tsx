import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, ChevronDown, FlaskConical, Printer, RotateCcw } from 'lucide-react';
import type { Curious, FamilyPrediction, GlanceItem, Hand, HandObservation, LineKey, Reading, ReadingSection, Seen } from '../../../shared/types';
import { FOCUS_LABELS } from '../../../shared/plan';
import type { SavedReading } from '../lib/storage';
import { HandDiagram } from './HandDiagram';
import { HandExplorer } from './HandExplorer';
import { LINE_COLORS, LINE_NAMES } from './observationText';
import { DeleteBox, FeedbackBox, MarketingToggle, PhotoStrip, PrivateLink, type ResultPhoto } from './ReadingTools';
import { CARD, Chip, Dot, Prose, SEEN_COLORS, SEEN_LABELS } from './readingUi';
import { Button } from './ui';

export type { ResultPhoto } from './ReadingTools';

/** Which section answers each "most curious about" topic, in order of preference. */
const CURIOUS_SECTIONS: Record<Curious, string[]> = {
  marriage: ['marriage_family'],
  children: ['marriage_family'],
  career: ['career', 'strengths', 'work_style'],
  money: ['money'],
  life_changes: [],
};

const DISCLAIMER =
  'These answers are traditional palmistry interpretations of the lines in your photos. They describe tendencies and possibilities, not facts or guarantees about your future.';

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
  const who = mode === 'couple' ? `${names[0] || 'Partner A'} & ${names[1] || 'Partner B'}` : names[0] ? `${names[0]}’s reading` : 'Your reading';
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
    return [...rest.filter((s) => s.id === curiousId), ...rest.filter((s) => s.id !== curiousId)];
  }, [reading, curiousId]);
  const familyInSection = reading.sections.some((s) => s.id === 'marriage_family');
  const timelineFirst = reading.curious === 'life_changes';
  const careerId = ['career', 'strengths', 'work_style'].find((id) => reading.sections.some((x) => x.id === id));

  const navItems = useMemo<NavItem[]>(() => {
    const timeline = reading.timeline?.length ? [{ id: 's-timeline', label: 'Life timeline', color: LINE_COLORS.life }] : [];
    return [
      { id: 's-glance', label: reading.glance ? 'Life at a glance' : 'At a glance', color: '#f6c77f' },
      ...(timelineFirst ? timeline : []),
      { id: 's-hands', label: 'Your hands', color: '#c9b8f0' },
      ...(compare ? [{ id: `s-${compare.id}`, label: compare.title, color: lineColor(compare.lines) }] : []),
      ...(timelineFirst ? [] : timeline),
      ...sections.map((s) => ({ id: `s-${s.id}`, label: s.title, color: lineColor(s.lines) })),
      ...(reading.family && !familyInSection ? [{ id: 's-family', label: 'Marriage & Family', color: LINE_COLORS.heart }] : []),
      { id: 's-reflection', label: 'Reflection', color: '#c9b8f0' },
    ];
  }, [reading, sections, compare, familyInSection, timelineFirst]);
  const active = useActiveSection(navItems);

  const timeline = reading.timeline?.length ? <LifeTimeline entries={reading.timeline} /> : null;

  return (
    <article>
      <ReadingHero eyebrow={`${mode === 'couple' ? 'Couples Compatibility' : FOCUS_LABELS[focus]} · ${who}`} headline={reading.headline} summary={reading.summary} />

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-10 px-4 pb-24 pt-6 sm:px-8 print:block">
        <SideNav items={navItems} active={active} />

        <div className="min-w-0 flex-[999_1_560px]">
          <div className="flex flex-col gap-7">
            {reading.sample && <SampleBanner />}
            {readingId && <PrivateLink />}

            {reading.glance ? (
              <LifeAtAGlance glance={reading.glance} family={reading.family} curious={reading.curious} sectionIds={reading.sections.map((s) => s.id)} careerId={careerId} />
            ) : (
              <>
                {reading.traits && <AtAGlance traits={reading.traits} />}
                {reading.family && <FamilyCards family={reading.family} />}
              </>
            )}

            {timelineFirst && timeline}

            <HandExplorer mode={mode} observations={observations} dominantHands={dominantHands} personName={personName} notes={reading.hand_notes} photos={photos} />

            {compare && <SectionCard section={compare} hands={bothHands(0)} compare />}

            {!timelineFirst && timeline}

            {sections.map((s) => {
              const hand = mainHand(s.id === 'person_b' ? 1 : 0);
              return (
                <SectionCard
                  key={s.id}
                  section={s}
                  hands={hand ? [hand] : []}
                  asked={s.id === curiousId}
                  careerPaths={s.id === careerId ? reading.career_paths : undefined}
                  family={s.id === 'marriage_family' ? reading.family : undefined}
                />
              );
            })}

            {reading.family && !familyInSection && (
              <section id="s-family" className={CARD}>
                <p className="eyebrow print-muted">Marriage & family</p>
                <h2 className="mt-2 font-display text-[30px] font-medium text-white print-dark">What the lines suggest</h2>
                <div className="mt-6">
                  <FamilyDetails family={reading.family} />
                </div>
              </section>
            )}

            <Reflection steps={reading.action_steps} />

            <section className="relative overflow-hidden rounded-card-lg border border-gold-400/30 bg-[linear-gradient(135deg,rgba(40,22,84,0.7),rgba(10,8,24,0.9))] px-6 py-10 text-center sm:px-10">
              <p className="eyebrow print-muted">{reading.closing.kind === 'mantra' ? 'Your mantra' : 'A question to sit with'}</p>
              <p className="mt-3 font-accent text-[32px] font-medium italic leading-snug text-white sm:text-[38px] print-dark">“{reading.closing.text}”</p>
            </section>
          </div>
          <BottomNav items={navItems} active={active} />

          <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center print:hidden">
            <Button onClick={() => window.print()}>
              <Printer size={18} /> Save as PDF
            </Button>
            <Button variant="secondary" onClick={onReset}>
              <RotateCcw size={18} /> Start a new reading
            </Button>
          </div>

          <FeedbackBox mode={mode} focus={focus} readingId={readingId} />

          <div className="mt-12">
            {photos && photos.length > 0 && <PhotoStrip photos={photos} />}
            {photosRemoved && (
              <p className="panel mb-5 p-4 text-base text-ink-muted print:hidden">
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

const lineColor = (lines?: LineKey[]) => (lines?.[0] ? LINE_COLORS[lines[0]] : '#c9b8f0');

// ---------- Hero ----------

/** Splits the headline so the last words get the italic gold accent, e.g. "A deep feeler with a *strategist's mind*". */
function splitHeadline(headline: string): [string, string] {
  const words = headline.trim().split(/\s+/);
  const n = words.length <= 3 ? 1 : 2;
  return [words.slice(0, -n).join(' '), words.slice(-n).join(' ')];
}

function ReadingHero({ eyebrow, headline, summary }: { eyebrow: string; headline: string; summary: string }) {
  const [lead, accent] = splitHeadline(headline);
  return (
    <section className="starfield relative overflow-hidden bg-night-950 print:bg-none">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_90%_at_50%_0%,rgba(110,52,200,0.42),transparent_70%)] print:hidden" />
      <div className="relative mx-auto max-w-[900px] px-4 pb-16 pt-16 text-center sm:px-8 sm:pb-[72px] sm:pt-[88px]">
        <div aria-hidden className="relative mx-auto mb-7 size-[120px] print:hidden">
          <div className="absolute inset-0 rounded-full border border-dashed border-gold-400/45" />
          <div className="absolute inset-[14px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.5),rgba(6,6,15,0)_70%)]" />
          <img src="/images/palm-readings-ai-icon.png" alt="" className="absolute inset-3 size-24" />
        </div>
        <p className="eyebrow print-muted">{eyebrow}</p>
        <h1 className="mt-4 font-display text-[clamp(36px,4.6vw,60px)] font-medium leading-[1.1] text-white print-dark">
          {lead} <span className="accent">{accent}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[700px] text-[19px] leading-relaxed text-ink-soft print-dark">{summary}</p>
      </div>
    </section>
  );
}

function SampleBanner() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-[22px] border-2 border-gold-400/70 bg-[rgba(60,36,8,0.55)] p-5 text-ink">
      <FlaskConical size={22} className="mt-0.5 shrink-0 text-gold-400" />
      <div className="text-base leading-relaxed">
        <p className="font-medium text-white">Sample reading: your photos were not analyzed</p>
        <p className="text-ink-soft">
          The site is running in test mode (<code className="rounded bg-black/30 px-1">AI_PROVIDER=mock</code>), so every reading shows the same sample text,
          whatever photos are uploaded. Set <code className="rounded bg-black/30 px-1">AI_PROVIDER</code> to openai, anthropic or gemini to get a real reading.
        </p>
      </div>
    </div>
  );
}

// ---------- Life at a glance ----------

function countLabel(range: string, one: string, many: string) {
  return range.trim() === '1' ? one : many;
}

interface GlanceCardData {
  key: string;
  topic: Curious | 'life_path';
  label: string;
  value: string;
  /** Marriage and children values are numbers and read larger. */
  big?: boolean;
  note: string;
  seen?: Seen;
  href?: string;
}

function LifeAtAGlance({
  glance,
  family,
  curious,
  sectionIds,
  careerId,
}: {
  glance: NonNullable<Reading['glance']>;
  family: Reading['family'];
  curious?: Curious;
  sectionIds: string[];
  careerId?: string;
}) {
  const has = (id: string) => sectionIds.includes(id);
  const familyHref = has('marriage_family') ? '#s-marriage_family' : undefined;

  const fromItem = (g: GlanceItem) => ({ value: g.answer, note: g.detail, seen: g.visibility });
  const fromFamily = (p: FamilyPrediction | undefined, one: string, many: string): Pick<GlanceCardData, 'value' | 'big' | 'note' | 'seen'> =>
    p
      ? p.range.trim() === '?' || p.visibility === 'not_assessable'
        ? { value: 'Can’t read from these photos', note: 'The lines were too fine to see clearly.', seen: 'not_assessable' }
        : { value: `${p.range} ${countLabel(p.range, one, many).toLowerCase()}`, big: true, note: `${capFirst(p.confidence)} confidence`, seen: p.visibility }
      : { value: 'Not included', note: 'Needs a photo of the side of your hand. Start a new reading to add it.' };

  const cards: GlanceCardData[] = [
    { key: 'marriage', topic: 'marriage', label: 'Marriage', href: familyHref, ...fromFamily(family?.marriages, 'Marriage', 'Marriages') },
    { key: 'children', topic: 'children', label: 'Children', href: familyHref, ...fromFamily(family?.children, 'Child', 'Children') },
    { key: 'career', topic: 'career', label: 'Career', href: careerId ? `#s-${careerId}` : undefined, ...fromItem(glance.career) },
    { key: 'money', topic: 'money', label: 'Money', href: has('money') ? '#s-money' : undefined, ...fromItem(glance.money) },
    { key: 'turning', topic: 'life_changes', label: 'Biggest turning point', href: '#s-timeline', ...fromItem(glance.turning_point) },
    { key: 'path', topic: 'life_path', label: 'Life path', href: has('potential_vs_path') ? '#s-potential_vs_path' : undefined, ...fromItem(glance.life_path) },
  ];
  const ordered = curious ? [...cards.filter((c) => c.topic === curious), ...cards.filter((c) => c.topic !== curious)] : cards;

  return (
    <section id="s-glance" className="scroll-mt-6" aria-labelledby="glance-title">
      <h2 id="glance-title" className="font-display text-[30px] font-medium leading-tight text-white print-dark">
        Your life at a glance
      </h2>
      <p className="mt-1.5 text-base text-ink-subtle print:hidden">Tap a card to see how we read it.</p>
      <ul className="mt-5 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        {ordered.map((c) => {
          const asked = c.topic === curious;
          const body = (
            <>
              <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="text-xs uppercase tracking-[0.12em] text-gold-400 print-muted">{c.label}</span>
                {asked && <span className="whitespace-nowrap rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-medium text-plum-900">You asked</span>}
              </span>
              <span className={`font-display leading-[1.15] text-white print-dark ${c.big ? 'text-[26px]' : c.seen ? 'text-[21px]' : 'text-lg text-ink-soft'}`}>{c.value}</span>
              <span className="text-sm text-ink-muted print-muted">{c.note}</span>
              {c.seen && (
                <span className="mt-auto inline-flex items-center gap-2 pt-2 text-xs" style={{ color: SEEN_COLORS[c.seen] }}>
                  <span aria-hidden className="size-2 rounded-full" style={{ background: SEEN_COLORS[c.seen] }} />
                  {SEEN_LABELS[c.seen]}
                </span>
              )}
            </>
          );
          const cls = `flex h-full flex-col gap-1.5 rounded-[22px] border p-[22px] text-left transition bg-[linear-gradient(180deg,rgba(30,20,66,0.7),rgba(14,10,34,0.7))] ${
            asked ? 'border-gold-400/70 shadow-[0_0_0_1px_rgba(246,199,127,0.25),0_10px_34px_rgba(246,199,127,0.12)]' : 'border-lavender-300/16'
          } ${c.href ? 'hover:-translate-y-0.5 hover:border-gold-400/50' : ''}`;
          return (
            <li key={c.key}>
              {c.href ? (
                <a href={c.href} onClick={(e) => jump(e, c.href!.slice(1))} className={cls}>
                  {body}
                </a>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3.5 text-xs leading-relaxed text-ink-faint print-muted">{DISCLAIMER}</p>
    </section>
  );
}

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Older solo readings and couples readings: named traits instead of life answers. */
function AtAGlance({ traits }: { traits: NonNullable<Reading['traits']> }) {
  return (
    <section id="s-glance" className="scroll-mt-6" aria-labelledby="glance-title">
      <h2 id="glance-title" className="font-display text-[30px] font-medium text-white print-dark">At a glance</h2>
      <ul className="mt-5 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        {traits.map((t) => {
          const color = t.line && t.line !== 'none' ? LINE_COLORS[t.line] : undefined;
          return (
            <li key={t.label} className="flex flex-col gap-1.5 rounded-[22px] border border-lavender-300/16 bg-[linear-gradient(180deg,rgba(30,20,66,0.7),rgba(14,10,34,0.7))] p-[22px]">
              <span className="text-xs uppercase tracking-[0.12em] text-gold-400 print-muted">{t.label}</span>
              <span className="font-display text-[21px] leading-[1.15] text-white print-dark">{t.value}</span>
              {t.line && t.line !== 'none' && (
                <span className="mt-1 flex items-center gap-2 text-sm text-ink-muted print-muted">
                  <Dot color={color} glow /> {LINE_NAMES[t.line]}
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
    <div>
      <div className="grid grid-cols-2 gap-3.5">
        {(
          [
            ['Marriage', family.marriages, 'marriage', 'marriages'],
            ['Children', family.children, 'child', 'children'],
          ] as const
        ).map(([label, p, one, many]) => (
          <a
            key={label}
            href="#s-family"
            onClick={(e) => jump(e, 's-family')}
            className="flex flex-col gap-1.5 rounded-[22px] border border-lavender-300/16 bg-[linear-gradient(180deg,rgba(30,20,66,0.7),rgba(14,10,34,0.7))] p-[22px] hover:border-gold-400/50"
          >
            <span className="text-xs uppercase tracking-[0.12em] text-gold-400">{label}</span>
            <span className="font-display text-[26px] leading-[1.15] text-white print-dark">
              {p.range} {countLabel(p.range, one, many)}
            </span>
            {p.visibility && (
              <span className="mt-1 inline-flex items-center gap-2 text-xs" style={{ color: SEEN_COLORS[p.visibility] }}>
                <span aria-hidden className="size-2 rounded-full" style={{ background: SEEN_COLORS[p.visibility] }} /> {SEEN_LABELS[p.visibility]}
              </span>
            )}
          </a>
        ))}
      </div>
      <p className="mt-3.5 text-xs leading-relaxed text-ink-faint print-muted">{DISCLAIMER}</p>
    </div>
  );
}

// ---------- Timeline ----------

const AREA_LABELS = { love: 'Love', career: 'Career', life: 'Life' } as const;

function LifeTimeline({ entries }: { entries: NonNullable<Reading['timeline']> }) {
  return (
    <section id="s-timeline" className={CARD} aria-labelledby="timeline-title">
      <p className="eyebrow print-muted">Turning points</p>
      <h2 id="timeline-title" className="mt-2 font-display text-[30px] font-medium text-white print-dark">
        Your life timeline
      </h2>
      <ol className="mt-7">
        {entries.map((e, i) => {
          const color = e.line !== 'none' ? LINE_COLORS[e.line] : '#f6c77f';
          const last = i === entries.length - 1;
          return (
            <li key={i} className="relative flex gap-[22px] pb-7">
              <span aria-hidden className="relative flex w-[22px] shrink-0 justify-center">
                {!last && <span className="absolute -bottom-7 top-[22px] w-px bg-[linear-gradient(180deg,rgba(246,199,127,0.5),rgba(201,184,240,0.12))]" />}
                <span className="relative mt-1 size-3.5 rounded-full" style={{ background: color, boxShadow: `0 0 0 5px rgba(246,199,127,0.08), 0 0 14px ${color}` }} />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2.5">
                  <span className="font-accent text-[22px] italic text-gold-300 print-dark">{e.when}</span>
                  <span className="rounded-full bg-lavender-300/10 px-2.5 py-0.5 text-xs text-[#c8bee8] print-muted">
                    {AREA_LABELS[e.area]}
                    {e.timing === 'unclear' ? ' · timing unclear' : ''}
                  </span>
                </p>
                <p className="mt-1 text-[19px] font-medium text-white print-dark">{e.title}</p>
                <p className="mt-1 text-base leading-relaxed text-ink-muted print-dark">{e.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-ink-faint print-muted">Ages come from the traditional palmistry timing scale and are approximate and symbolic, not forecasts.</p>
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
  compare = false,
}: {
  section: ReadingSection;
  hands: HandObservation[];
  asked?: boolean;
  careerPaths?: string[];
  family?: Reading['family'];
  /** Born With vs. Built: show the left and right hands side by side. */
  compare?: boolean;
}) {
  const lines = s.lines ?? [];
  const evidence = s.evidence.map((e) => (typeof e === 'string' ? e : `${e.text}${e.visibility === 'faint' ? ' (faint)' : ''}`));
  return (
    <section id={`s-${s.id}`} className={`${CARD} ${asked ? '!border-gold-400/60' : ''}`}>
      {asked && <p className="mb-4 inline-block rounded-full bg-gold-400 px-3 py-1 text-xs font-medium text-plum-900">You asked about this</p>}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-[1_1_15rem]">
          <p className="eyebrow print-muted">{s.title}</p>
          <h2 className={`mt-2 leading-[1.1] text-white print-dark ${s.name ? 'font-accent text-[40px] font-medium italic' : 'font-display text-[30px] font-medium'}`}>
            {s.name ?? s.title}
          </h2>
          {s.tags && s.tags.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </p>
          )}
        </div>
        {lines.length > 0 && hands.length > 0 && (
          <div className="flex shrink-0 items-center gap-3.5 text-xs text-ink-subtle">
            {hands.map((h, i) => (
              <span key={h.hand} className="contents">
                {i > 0 && <ArrowRight size={24} className="text-gold-400" aria-hidden />}
                <span className="flex flex-col items-center gap-1">
                  <span
                    className={`flex items-center justify-center rounded-card-sm border p-1 ${
                      compare && i === hands.length - 1 ? 'border-line-fate/40 bg-line-fate/[0.12]' : 'border-lavender-300/15 bg-lavender-300/[0.08]'
                    }`}
                  >
                    <HandDiagram
                      hand={h}
                      highlight={lines}
                      mini
                      className="w-14"
                      title={`${h.hand} hand diagram highlighting the ${lines.map((l) => LINE_NAMES[l].toLowerCase()).join(' and ')}`}
                    />
                  </span>
                  {compare && (h.hand === 'left' ? 'Left' : 'Right')}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {family && (
        <div className="mt-6">
          <FamilyDetails family={family} />
        </div>
      )}

      <Prose text={s.body} className="mt-6 max-w-[760px]" />

      {careerPaths && careerPaths.length > 0 && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.12em] text-gold-400 print-muted">Paths that fit</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {careerPaths.map((c) => (
              <li key={c} className="rounded-full border border-gold-400/35 bg-gold-400/[0.08] px-4 py-1.5 text-base text-gold-300 print-dark">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.tension && (
        <div className="mt-6 rounded-card-sm border border-[#f28ba8]/25 bg-[#f28ba8]/[0.06] px-[22px] py-5">
          <p className="font-display text-base tracking-[0.06em] text-[#f7a9bf] print-muted">The other side</p>
          <p className="mt-1.5 text-base leading-relaxed text-[#e4dcfa] print-dark">{s.tension}</p>
        </div>
      )}

      {evidence.length > 0 && <p className="mt-[18px] text-xs leading-relaxed text-ink-subtle print-muted">Based on: {evidence.join(' · ')}</p>}
    </section>
  );
}

function FamilyDetails({ family }: { family: NonNullable<Reading['family']> }) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Prediction label="Significant marriages or partnerships" p={family.marriages} one="marriage" many="marriages" />
        <Prediction label="Potential children" p={family.children} one="child" many="children" />
      </div>
      <p className="mt-4 text-base leading-relaxed text-ink-soft print-dark">{family.timing}</p>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint print-muted">
        These numbers come from the relationship and children lines on the edge of your palm, as traditional palmistry reads them. They are not predictions of how
        many marriages or children you will have, and family comes in many forms.
      </p>
    </div>
  );
}

function Prediction({ label, p, one, many }: { label: string; p: FamilyPrediction; one: string; many: string }) {
  const unreadable = p.range.trim() === '?' || p.visibility === 'not_assessable';
  return (
    <div className="rounded-card-sm border border-lavender-300/12 bg-[rgba(30,20,66,0.6)] p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-gold-400 print-muted">{label}</p>
      {unreadable ? (
        <p className="mt-2 font-display text-xl text-ink-soft print-dark">Can’t read from these photos</p>
      ) : (
        <p className="mt-1 font-display text-[34px] leading-tight text-white print-dark">
          {p.range} <span className="text-[22px]">{countLabel(p.range, one, many)}</span>
        </p>
      )}
      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted print-muted">
        {!unreadable && <span>{capFirst(p.confidence)} confidence</span>}
        {p.visibility && (
          <span className="inline-flex items-center gap-2" style={{ color: SEEN_COLORS[p.visibility] }}>
            <span aria-hidden className="size-2 rounded-full" style={{ background: SEEN_COLORS[p.visibility] }} /> {SEEN_LABELS[p.visibility]}
          </span>
        )}
      </p>
      <p className="mt-3 text-base leading-relaxed text-ink-soft print-dark">{p.explanation}</p>
    </div>
  );
}

function Reflection({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  return (
    <section id="s-reflection" className={`${CARD} !py-0`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between gap-3 py-6 text-left print:hidden">
        <span>
          <span className="eyebrow block">Optional</span>
          <span className="mt-1 block font-display text-2xl font-medium text-white">Personal reflection</span>
          <span className="mt-1 block text-base text-ink-muted">{steps.length} small things to try in the next two weeks</span>
        </span>
        <ChevronDown className={`shrink-0 text-gold-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <ol className={`space-y-3 pb-7 ${open ? '' : 'hidden print:block'}`}>
        {steps.map((a, i) => (
          <li key={a} className="flex gap-3 text-ink-soft print-dark">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-gold)] text-sm font-semibold text-plum-900">{i + 1}</span>
            <span className="pt-1 text-base leading-relaxed">{a}</span>
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

/** Desktop: the "Your reading" card on the left, which stays in view while the reading scrolls. */
function SideNav({ items, active }: { items: NavItem[]; active?: string }) {
  return (
    <nav
      aria-label="Your reading"
      className="sticky top-6 hidden max-h-[calc(100vh-3rem)] max-w-[260px] min-w-0 flex-[1_1_220px] overflow-y-auto rounded-card border border-lavender-300/14 bg-[rgba(20,16,44,0.55)] px-2.5 py-5 lg:block print:hidden"
    >
      <p className="mx-3 mb-2.5 font-display text-[15px] tracking-[0.12em] text-gold-400">Your reading</p>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? 'true' : undefined}
              onClick={(e) => jump(e, i.id)}
              className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-1.5 text-[15px] transition ${
                active === i.id ? 'bg-gold-400/10 text-white shadow-[inset_2px_0_0_#f6c77f]' : 'text-[#c8bee8] hover:bg-lavender-300/[0.08] hover:text-white'
              }`}
            >
              <span aria-hidden className="size-[7px] shrink-0 rounded-full" style={{ background: i.color }} />
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
        className="flex gap-1 overflow-x-auto rounded-full border border-lavender-300/20 bg-[rgba(10,8,24,0.92)] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((i) => (
          <a
            key={i.id}
            href={`#${i.id}`}
            data-id={i.id}
            aria-current={active === i.id ? 'true' : undefined}
            onClick={(e) => jump(e, i.id)}
            className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition ${
              active === i.id ? 'bg-gold-400 font-medium text-plum-900' : 'text-[#c8bee8] hover:text-white'
            }`}
          >
            <span aria-hidden className="size-[7px] shrink-0 rounded-full" style={{ background: active === i.id ? '#1a0b2e' : i.color }} />
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
