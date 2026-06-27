// haptics  -  feather-light wrapper over the Vibration API.
//
// Most desktop browsers and iOS Safari no-op navigator.vibrate, so this is a
// progressive enhancement: it fires a short pattern on Android/Chrome and does
// nothing (silently) everywhere else. Callers pass a semantic intensity; the
// module owns the actual millisecond patterns so they stay consistent.

export type HapticKind = 'tap' | 'buy' | 'success' | 'heavy';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  buy: 12,
  success: [10, 40, 18],
  heavy: [16, 30, 16, 30, 28],
};

let enabled = true;

/** Toggle haptics globally (mirrors the Settings switch). */
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export function haptic(kind: HapticKind = 'tap'): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* vibrate can throw if called without a user gesture  -  ignore. */
  }
}
