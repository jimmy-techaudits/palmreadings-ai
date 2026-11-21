import { useId } from 'react';
import { LINE_KEYS, type HandObservation, type LineKey, type LineObservation } from '../../../shared/types';
import { LINE_COLORS, LINE_NAMES } from './observationText';

/**
 * A drawn palm with the lines placed from what the Observe step reported:
 * length, curve, where each line starts and ends, depth, faintness, forks,
 * branches and breaks. It is a diagram, not a tracing of the photo, but every
 * difference in it comes from the observations, so two hands never look alike
 * unless they were described alike.
 *
 * Drawn as a left palm seen from the front (thumb on the left) and mirrored
 * for the right hand.
 */

type Pt = [number, number];
interface Geometry {
  start: Pt;
  ctrl: Pt;
  end: Pt;
}

const W = 220;
const H = 290;
// Palm box (left palm, viewer's view).
const L = 58;
const R = 170;
const T = 112;

const has = (s: string, ...words: string[]) => words.some((w) => s.toLowerCase().includes(w));

function palmBottom(h: HandObservation) {
  return T + (h.palm_shape === 'square' ? 116 : 140);
}

function geometry(key: LineKey, l: LineObservation, h: HandObservation): Geometry {
  const B = palmBottom(h);
  const mid = (a: Pt, b: Pt, dx = 0, dy = 0): Pt => [(a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy];
  const lifeStart: Pt = [L + 4, T + 44];

  switch (key) {
    case 'heart': {
      const start: Pt = [R - 2, T + 32];
      let end: Pt;
      if (has(l.ends, 'index') && has(l.ends, 'middle', 'between')) end = [90, T + 14];
      else if (has(l.ends, 'index', 'jupiter')) end = [72, T + 18];
      else if (has(l.ends, 'middle', 'saturn')) end = [104, T + 22];
      else end = l.length === 'long' ? [76, T + 16] : l.length === 'short' ? [116, T + 26] : [94, T + 18];
      const sag = l.shape === 'strongly_curved' ? 24 : l.shape === 'gently_curved' ? 12 : 2;
      return { start, end, ctrl: [(start[0] + end[0]) / 2 + (sag > 2 ? 8 : 0), Math.max(start[1], end[1]) + sag] };
    }
    case 'head': {
      const joined = has(l.starts, 'life');
      const start: Pt = joined ? lifeStart : [L + 8, T + 36];
      const x = l.length === 'long' ? 160 : l.length === 'short' ? 114 : 140;
      const toLuna = has(l.ends, 'luna', 'wrist', 'slop');
      const y = toLuna || l.shape === 'strongly_curved' ? T + 96 : l.shape === 'gently_curved' ? T + 70 : T + 54;
      const end: Pt = [x, y];
      return { start, end, ctrl: l.shape === 'straight' ? mid(start, end) : [start[0] + (x - start[0]) * 0.55, start[1] + 12] };
    }
    case 'life': {
      const start = lifeStart;
      const long = l.length === 'long' || has(l.ends, 'wrist');
      const end: Pt = long ? [L + 40, B - 4] : l.length === 'short' ? [L + 22, B - 56] : [L + 32, B - 28];
      const reach = l.shape === 'strongly_curved' ? 74 : l.shape === 'straight' ? 40 : 58;
      return { start, end, ctrl: [L + reach, T + 92] };
    }
    case 'fate': {
      let start: Pt;
      if (has(l.starts, 'wrist', 'base')) start = [108, B - 4];
      else if (has(l.starts, 'luna', 'outer', 'edge')) start = [150, B - 22];
      else if (has(l.starts, 'life')) start = [L + 44, B - 34];
      else if (has(l.starts, 'mid', 'head', 'center', 'centre')) start = [110, T + 76];
      else start = l.length === 'long' ? [108, B - 4] : l.length === 'short' ? [110, T + 76] : [108, B - 34];
      let end: Pt;
      if (has(l.ends, 'heart')) end = [106, T + 30];
      else if (has(l.ends, 'head')) end = [107, T + 56];
      else if (has(l.ends, 'middle', 'saturn', 'finger')) end = [104, T + 6];
      else end = l.length === 'long' ? [104, T + 6] : [106, T + 30];
      return { start, end, ctrl: mid(start, end, 6, 0) };
    }
    case 'sun': {
      const start: Pt = l.length === 'long' ? [142, B - 30] : l.length === 'medium' ? [138, T + 84] : [136, T + 54];
      const end: Pt = [132, T + 10];
      return { start, end, ctrl: mid(start, end, 3, 0) };
    }
    case 'mercury': {
      const start: Pt = l.length === 'long' ? [L + 46, B - 30] : l.length === 'medium' ? [120, T + 100] : [142, T + 70];
      const end: Pt = [156, T + 24];
      return { start, end, ctrl: mid(start, end, -6, 4) };
    }
  }
}

function pathD(g: Geometry) {
  return `M${g.start[0]},${g.start[1]} Q${g.ctrl[0]},${g.ctrl[1]} ${g.end[0]},${g.end[1]}`;
}

/** Small strokes at the end (fork) or middle (branch) of a line. */
function extras(g: Geometry, l: LineObservation): string {
  const text = l.features.join(' ').toLowerCase();
  const out: string[] = [];
  const rot = (v: Pt, deg: number): Pt => {
    const r = (deg * Math.PI) / 180;
    return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)];
  };
  const unit = (a: Pt, b: Pt): Pt => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  };
  if (text.includes('fork') || text.includes('tassel')) {
    const dir = unit(g.ctrl, g.end);
    for (const deg of [-32, 32]) {
      const v = rot(dir, deg);
      out.push(`M${g.end[0] - dir[0] * 6},${g.end[1] - dir[1] * 6} l${v[0] * 13},${v[1] * 13}`);
    }
  }
  if (text.includes('branch')) {
    // Point halfway along the curve, with a short stroke rising toward the fingers.
    const t = 0.45;
    const p: Pt = [
      (1 - t) ** 2 * g.start[0] + 2 * (1 - t) * t * g.ctrl[0] + t ** 2 * g.end[0],
      (1 - t) ** 2 * g.start[1] + 2 * (1 - t) * t * g.ctrl[1] + t ** 2 * g.end[1],
    ];
    out.push(`M${p[0]},${p[1]} l${4},${-14}`);
  }
  return out.join(' ');
}

function fingers(h: HandObservation) {
  const shorter = h.finger_length === 'short' ? 16 : h.finger_length === 'medium' ? 8 : 0;
  const idx = h.index_vs_ring === 'index_longer' ? -6 : h.index_vs_ring === 'ring_longer' ? 5 : 0;
  const ring = h.index_vs_ring === 'ring_longer' ? -6 : h.index_vs_ring === 'index_longer' ? 5 : 0;
  return [
    { x: 76, base: 128, tip: 56 + shorter + idx, w: 23 },
    { x: 103, base: 126, tip: 36 + shorter, w: 24 },
    { x: 130, base: 128, tip: 50 + shorter + ring, w: 23 },
    { x: 155, base: 140, tip: 82 + shorter, w: 19 },
  ];
}

interface Props {
  hand: HandObservation;
  /** Lines to emphasise; the others are dimmed. Omit to show all at full strength. */
  highlight?: LineKey[];
  /** Small version for section headers: no glow, thinner outline. */
  mini?: boolean;
  className?: string;
  title?: string;
}

export function HandDiagram({ hand, highlight, mini = false, className = '', title }: Props) {
  const id = useId().replace(/:/g, '');
  const B = palmBottom(hand);
  const silhouette = (pad: number, paint: string) => (
    <g>
      {fingers(hand).map((f) => (
        <line key={f.x} x1={f.x} y1={f.base} x2={f.x} y2={f.tip} stroke={paint} strokeWidth={f.w + pad} strokeLinecap="round" />
      ))}
      <line x1={68} y1={T + 92} x2={28} y2={T + 26} stroke={paint} strokeWidth={30 + pad} strokeLinecap="round" />
      <rect x={L - pad / 2} y={T - pad / 2} width={R - L + pad} height={B - T + pad} rx={32 + pad / 2} fill={paint} />
      <rect x={80 - pad / 2} y={B - 40} width={68 + pad} height={H - B + 40} fill={paint} />
    </g>
  );

  const visible = LINE_KEYS.filter((k) => hand.lines[k].visibility !== 'not_visible');
  const label =
    title ??
    `Diagram of the ${hand.hand} palm showing ${visible.map((k) => `${hand.lines[k].visibility === 'faint' ? 'a faint ' : ''}${LINE_NAMES[k].toLowerCase()}`).join(', ') || 'no clear lines'}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={className}>
      <defs>
        <linearGradient id={`skin-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0" stopColor="#2a1f5c" />
          <stop offset="1" stopColor="#1c1545" />
        </linearGradient>
        <linearGradient id={`fade-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={B - 10} x2="0" y2={H}>
          <stop offset="0" stopColor="#0e0b22" stopOpacity="0" />
          <stop offset="1" stopColor="#0e0b22" stopOpacity="1" />
        </linearGradient>
      </defs>
      <g transform={hand.hand === 'right' ? `translate(${W},0) scale(-1,1)` : undefined}>
        {silhouette(mini ? 4 : 3, mini ? 'rgb(216 180 254 / 0.35)' : 'rgb(216 180 254 / 0.28)')}
        {silhouette(0, `url(#skin-${id})`)}
        {/* Fade the wrist into the background. */}
        <rect x={70} y={B - 10} width={90} height={H - B + 10} fill={`url(#fade-${id})`} />
        {visible.map((k) => {
          const l = hand.lines[k];
          const g = geometry(k, l, hand);
          const dim = highlight && !highlight.includes(k);
          const faint = l.visibility === 'faint';
          const width = (faint ? 2 : l.depth === 'deep' ? 3.4 : l.depth === 'shallow' ? 2.2 : 2.8) * (mini ? 1.5 : 1);
          const broken = l.features.some((f) => /break/i.test(f));
          const color = LINE_COLORS[k];
          return (
            <g key={k} opacity={dim ? 0.12 : faint ? 0.6 : 1} style={!mini && !dim ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}>
              <path
                d={pathD(g)}
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={broken ? '46 7 100' : faint ? '5 3' : undefined}
              />
              {!mini && extras(g, l) && <path d={extras(g, l)} fill="none" stroke={color} strokeWidth={width * 0.75} strokeLinecap="round" />}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
