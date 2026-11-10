import type { LineObservation } from '../../shared/types';

export const LINE_NAMES: Record<string, string> = {
  heart: 'Heart line',
  head: 'Head line',
  life: 'Life line',
  fate: 'Fate line',
  sun: 'Sun line',
  mercury: 'Mercury line',
};

/** Plain-language one-liner for an observed line, or null if it wasn't visible. */
export function lineSummary(key: string, l: LineObservation): string | null {
  if (l.visibility === 'not_visible') return null;
  const words = [
    l.visibility === 'faint' ? 'faint' : l.depth !== 'unclear' ? l.depth : '',
    l.length !== 'unclear' ? l.length : '',
    l.shape !== 'unclear' ? l.shape.replace('_', ' ') : '',
  ].filter(Boolean);
  const ends = l.ends && l.ends !== 'n/a' ? `, ending ${l.ends}` : '';
  return `${words.join(', ')} ${LINE_NAMES[key].toLowerCase()}${ends}`.trim().replace(/^./, (c) => c.toUpperCase());
}
