// Keeps the last reading in this tab so a refresh doesn't lose it.
// Saved, shareable readings come in a later phase.
import type { Focus, Mode, PersonObservation, Reading } from '../../../shared/types';

export interface SavedReading {
  mode: Mode;
  focus: Focus;
  names: string[];
  reading: Reading;
  observations: PersonObservation[];
  createdAt: string;
}

const KEY = 'palmreadings:last';

export function saveReading(r: SavedReading) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* storage unavailable */
  }
}

export function loadReading(): SavedReading | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedReading) : null;
  } catch {
    return null;
  }
}

export function clearReading() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
