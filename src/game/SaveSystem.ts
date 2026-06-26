// SaveSystem — localStorage persistence with version guard + base64 export/import.

import type { GameState } from './types';

export const SAVE_KEY = 'empire-engine-save-v1';
export const SAVE_VERSION = 1;

export function saveGame(state: GameState): boolean {
  try {
    const json = JSON.stringify({ ...state, lastSaved: Date.now() });
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch (e) {
    console.warn('[SaveSystem] save failed', e);
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    const parsed = JSON.parse(json) as GameState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.version !== 'number' || parsed.version > SAVE_VERSION) {
      console.warn('[SaveSystem] save version mismatch, ignoring', parsed.version);
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('[SaveSystem] load failed', e);
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('[SaveSystem] clear failed', e);
  }
}

/** Base64 (URI-safe) export of the current save. */
export function exportSave(state: GameState): string {
  try {
    const json = JSON.stringify(state);
    return btoa(encodeURIComponent(json));
  } catch (e) {
    console.warn('[SaveSystem] export failed', e);
    return '';
  }
}

/** Reverse of exportSave. Returns null on malformed input. */
export function importSave(encoded: string): GameState | null {
  try {
    const json = decodeURIComponent(atob(encoded.trim()));
    const parsed = JSON.parse(json) as GameState;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number') return null;
    return parsed;
  } catch (e) {
    console.warn('[SaveSystem] import failed', e);
    return null;
  }
}
