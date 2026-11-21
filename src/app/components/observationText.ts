import type { LineKey, LineObservation } from '../../../shared/types';

export const LINE_NAMES: Record<LineKey, string> = {
  heart: 'Heart line',
  head: 'Head line',
  life: 'Life line',
  fate: 'Fate line',
  sun: 'Sun line',
  mercury: 'Mercury line',
};

/** What each line is read for, in a few words. */
export const LINE_MEANINGS: Record<LineKey, string> = {
  heart: 'love and emotions',
  head: 'mind and decisions',
  life: 'energy and life changes',
  fate: 'path and purpose',
  sun: 'creativity and recognition',
  mercury: 'communication and business',
};

/** One color per line, used on the hand diagrams, legends, traits and sections. */
export const LINE_COLORS: Record<LineKey, string> = {
  heart: '#f28ba8',
  head: '#f6c77f',
  life: '#6ee7c8',
  fate: '#c4a6ff',
  sun: '#c6e66e',
  mercury: '#8fb8ff',
};

/** Plain descriptors for an observed line, e.g. ["Long", "Deep", "Strongly curved"]. Empty if not visible. */
export function lineWords(l: LineObservation): string[] {
  if (l.visibility === 'not_visible') return [];
  const words = [
    l.length !== 'unclear' ? l.length : '',
    l.visibility === 'faint' ? 'faint' : l.depth !== 'unclear' ? l.depth : '',
    l.shape !== 'unclear' ? l.shape.replace('_', ' ') : '',
  ].filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/** Plain-language one-liner for an observed line, or null if it wasn't visible. */
export function lineSummary(key: LineKey, l: LineObservation): string | null {
  if (l.visibility === 'not_visible') return null;
  const ends = l.ends && l.ends !== 'n/a' ? `, ending ${l.ends}` : '';
  return `${lineWords(l).join(', ').toLowerCase()} ${LINE_NAMES[key].toLowerCase()}${ends}`.trim().replace(/^./, (c) => c.toUpperCase());
}
