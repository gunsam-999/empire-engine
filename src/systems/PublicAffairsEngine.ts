// ============================================================================
// PublicAffairsEngine (Session 5.5)  -  company confidence aggregator.
// Confidence (0–100) reflects how the outside world views your enterprise,
// aggregating signals from echelon standing, press heat, rival pressure,
// ethics score, and coalition activity. Players can issue a press statement
// to boost confidence (200 influence, 10-min cooldown, +25 confidence).
// Confidence feeds a 0.80–1.30× production multiplier.
// ============================================================================

import type { GameState, PublicAffairsState } from '../game/types';

export const STATEMENT_COST = 200;              // influence
export const STATEMENT_COOLDOWN_MS = 600_000;  // 10 min
export const STATEMENT_BOOST = 25;             // confidence gained per statement

export function defaultPublicAffairsState(): PublicAffairsState {
  return { confidence: 50, lastStatementAt: 0 };
}

export function canIssueStatement(pa: PublicAffairsState, now: number): boolean {
  return now >= pa.lastStatementAt + STATEMENT_COOLDOWN_MS;
}

export function statementCooldownRemainingSec(pa: PublicAffairsState, now: number): number {
  return Math.max(0, Math.ceil((pa.lastStatementAt + STATEMENT_COOLDOWN_MS - now) / 1000));
}

export function issueStatement(pa: PublicAffairsState, now: number): PublicAffairsState {
  return {
    confidence: Math.min(100, pa.confidence + STATEMENT_BOOST),
    lastStatementAt: now,
  };
}

/** 0.80–1.30× production based on confidence. */
export function getPublicAffairsMult(state: GameState): number {
  const c = (state.publicAffairs ?? defaultPublicAffairsState()).confidence;
  return 0.80 + (c / 100) * 0.50;
}

const ECHELON_CONFIDENCE_RATE: Record<string, number> = {
  STARTUP: 0.2,
  CONTENDER: 0.5,
  PLAYER: 1.0,
  LEADER: 2.0,
  MOGUL: 3.0,
  TITAN: 4.0,
};

export function tickPublicAffairs(
  pa: PublicAffairsState,
  state: GameState,
  dt: number
): PublicAffairsState {
  const perMin = dt / 60;

  // Echelon standing raises confidence over time
  const tier = (state.echelon?.tier as string) ?? 'STARTUP';
  const echelonGain = (ECHELON_CONFIDENCE_RATE[tier] ?? 0.2) * perMin;

  // Newspaper heat drags confidence down (0–100 heat → 0–2/min)
  const heat = state.newspaper?.heatScore ?? 0;
  const newsDrag = (heat / 100) * 2.0 * perMin;

  // Ethics bonus/penalty (ethics ±100 → ±1.5/min)
  const ethics = state.story?.ethics ?? 0;
  const ethicsDrift = (ethics / 100) * 1.5 * perMin;

  // Coalition active: hard -2/min
  const coalitionDrag = (state.coalitionActive ? 2.0 : 0) * perMin;

  // Each active rival telegraph: -0.5/min
  const telegraphs = (state.rivals ?? []).filter((r) => r.telegraph).length;
  const rivalDrag = telegraphs * 0.5 * perMin;

  // Soft mean-reversion toward 40 prevents runaway in either direction
  const reversion = (40 - pa.confidence) * 0.005 * perMin;

  const delta = echelonGain - newsDrag + ethicsDrift - coalitionDrag - rivalDrag + reversion;
  const next = Math.max(0, Math.min(100, pa.confidence + delta));

  return { ...pa, confidence: next };
}

export interface PublicSignal {
  label: string;
  value: string;
  positive: boolean;
}

/** Top signals driving confidence change (for UI). Ordered by magnitude. */
export function getPublicSignals(state: GameState): PublicSignal[] {
  const signals: PublicSignal[] = [];

  const tier = (state.echelon?.tier as string) ?? 'STARTUP';
  const echelonRate = ECHELON_CONFIDENCE_RATE[tier] ?? 0.2;
  signals.push({
    label: 'Market standing',
    value: `+${echelonRate.toFixed(1)}/min`,
    positive: true,
  });

  const heat = state.newspaper?.heatScore ?? 0;
  if (heat > 5) {
    signals.push({
      label: 'Press heat',
      value: `-${((heat / 100) * 2).toFixed(1)}/min`,
      positive: false,
    });
  }

  const ethics = state.story?.ethics ?? 0;
  if (Math.abs(ethics) > 5) {
    const rate = ((ethics / 100) * 1.5).toFixed(1);
    signals.push({
      label: ethics > 0 ? 'Ethical standing' : 'Reputation damage',
      value: `${ethics > 0 ? '+' : ''}${rate}/min`,
      positive: ethics > 0,
    });
  }

  if (state.coalitionActive) {
    signals.push({ label: 'Coalition pressure', value: '-2.0/min', positive: false });
  }

  const telegraphs = (state.rivals ?? []).filter((r) => r.telegraph).length;
  if (telegraphs > 0) {
    signals.push({
      label: 'Rival threats',
      value: `-${(telegraphs * 0.5).toFixed(1)}/min`,
      positive: false,
    });
  }

  return signals.slice(0, 4);
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'Dominant';
  if (confidence >= 60) return 'Strong';
  if (confidence >= 40) return 'Stable';
  if (confidence >= 20) return 'Shaky';
  return 'Crisis';
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 60) return '#34d399';
  if (confidence >= 40) return '#fbbf24';
  return '#f87171';
}
