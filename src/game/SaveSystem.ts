// SaveSystem  -  localStorage persistence with version guard + base64 export/import.
// Supports 3 named save slots plus the legacy auto-save key.

import type { GameState } from './types';

export const SAVE_KEY = 'empire-engine-save-v1';
export const SAVE_VERSION = 2;

// ---- Save slots -------------------------------------------------------------

export const SLOT_COUNT = 3;
export type SlotIndex = 1 | 2 | 3;
const SLOT_KEY = (slot: SlotIndex) => `empire-engine-slot-${slot}`;

export interface SaveSlotMeta {
  slot: SlotIndex;
  name: string;
  industry: string;
  savedAt: number;
  hasData: boolean;
}

export function saveToSlot(state: GameState, slot: SlotIndex): boolean {
  try {
    localStorage.setItem(SLOT_KEY(slot), JSON.stringify({ ...state, lastSaved: Date.now() }));
    return true;
  } catch (e) {
    console.warn('[SaveSystem] slot save failed', e);
    return false;
  }
}

export function loadFromSlot(slot: SlotIndex): GameState | null {
  try {
    const json = localStorage.getItem(SLOT_KEY(slot));
    if (!json) return null;
    const parsed = JSON.parse(json) as GameState;
    if (!parsed || typeof parsed.version !== 'number' || parsed.version > SAVE_VERSION) return null;
    return parsed;
  } catch (e) {
    console.warn('[SaveSystem] slot load failed', e);
    return null;
  }
}

export function getSlotMeta(slot: SlotIndex): SaveSlotMeta {
  try {
    const json = localStorage.getItem(SLOT_KEY(slot));
    if (!json) return { slot, name: '', industry: '', savedAt: 0, hasData: false };
    const parsed = JSON.parse(json) as GameState;
    return {
      slot,
      name: parsed.setup?.name ?? 'Unknown Empire',
      industry: parsed.setup?.industry ?? '',
      savedAt: (parsed as GameState & { lastSaved?: number }).lastSaved ?? 0,
      hasData: true,
    };
  } catch {
    return { slot, name: '', industry: '', savedAt: 0, hasData: false };
  }
}

export function listSlots(): SaveSlotMeta[] {
  return [1, 2, 3].map(s => getSlotMeta(s as SlotIndex));
}

export function clearSlot(slot: SlotIndex): void {
  try { localStorage.removeItem(SLOT_KEY(slot)); } catch { /* ignore */ }
}

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
