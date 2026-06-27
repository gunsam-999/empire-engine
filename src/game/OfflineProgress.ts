// OfflineProgress  -  compute gains accrued while the game was closed.

import { incomePerSec, insightPerSec } from '../systems/EconomyEngine';
import { tickMarketing } from '../systems/MarketingSystem';
import type { GameState, OfflineSummary } from './types';

const MAX_OFFLINE_SECONDS = 86400; // 24h cap
const MIN_OFFLINE_SECONDS = 60; // ignore short gaps
const OFFLINE_EFFICIENCY = 0.5;

export interface OfflineResult {
  summary: OfflineSummary | null;
  state: GameState;
}

/**
 * Returns gains for being away since state.lastTick.
 * Only produces a summary when away longer than MIN_OFFLINE_SECONDS.
 */
export function computeOffline(state: GameState, now: number = Date.now()): OfflineResult {
  if (!state.setup) {
    return { summary: null, state: { ...state, lastTick: now } };
  }

  const elapsedMs = now - (state.lastTick || now);
  const dt = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, elapsedMs / 1000));

  if (dt < MIN_OFFLINE_SECONDS) {
    return { summary: null, state: { ...state, lastTick: now } };
  }

  const cashGain = incomePerSec(state) * dt * OFFLINE_EFFICIENCY;
  const insightGain = insightPerSec(state) * dt * OFFLINE_EFFICIENCY;

  // Organic marketing keeps working while away (at offline efficiency).
  const offlineMktDt = dt * OFFLINE_EFFICIENCY;
  const mkt = state.marketing
    ? tickMarketing(state, offlineMktDt, now).marketing
    : state.marketing;
  const reachGain = mkt ? mkt.reach - (state.marketing?.reach ?? 0) : 0;

  const nextState: GameState = {
    ...state,
    cash: state.cash + cashGain,
    lifetimeEarnings: state.lifetimeEarnings + cashGain,
    insight: state.insight + insightGain,
    marketing: mkt ?? state.marketing,
    lastTick: now,
  };

  const events: string[] = [];
  if (cashGain > 0) events.push('Production continued while you were away.');
  if (reachGain > 1) events.push('Your marketing kept reaching new people.');

  const summary: OfflineSummary = {
    seconds: dt,
    cash: cashGain,
    insight: insightGain,
    events,
  };

  return { summary, state: nextState };
}
