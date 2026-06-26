// MarketSystem — random-walk price drift toward 1 with rare boom/crash. Pure.

import type { GameState } from '../game/types';

const HISTORY_CAP = 40;
const REVERT = 0.04; // pull toward 1.0
const NOISE = 0.03;
const BOOM_CHANCE = 0.01;
const CRASH_CHANCE = 0.01;

export interface MarketTick {
  priceMul: number;
  trend: number;
  history: number[];
  demandShiftAt: number;
  stockpiling: boolean;
}

/**
 * Advance the market one step. dt is seconds since last tick (scales noise).
 * rng is a 0..1 source (defaults to Math.random).
 */
export function driftMarket(
  market: GameState['market'],
  dt: number,
  now: number = Date.now(),
  rng: () => number = Math.random
): MarketTick {
  const prev = market?.priceMul ?? 1;
  const scale = Math.min(1, Math.max(0, dt / 1)); // normalize to ~1s steps

  // Mean-reverting random walk.
  let price = prev + (1 - prev) * REVERT * scale + (rng() - 0.5) * 2 * NOISE * scale;

  // Rare shocks.
  if (rng() < BOOM_CHANCE * scale) price += 0.25;
  if (rng() < CRASH_CHANCE * scale) price -= 0.25;

  price = Math.min(2.0, Math.max(0.4, price));

  const trend = price - prev;

  const history = [...(market?.history ?? []), Number(price.toFixed(4))];
  while (history.length > HISTORY_CAP) history.shift();

  let demandShiftAt = market?.demandShiftAt ?? 0;
  if (now >= demandShiftAt) {
    // schedule next demand shift 60-180s out
    demandShiftAt = now + (60 + rng() * 120) * 1000;
  }

  return {
    priceMul: price,
    trend,
    history,
    demandShiftAt,
    stockpiling: market?.stockpiling ?? false,
  };
}

export function defaultMarket(now: number = Date.now()): GameState['market'] {
  return {
    priceMul: 1,
    trend: 0,
    history: [1],
    demandShiftAt: now + 120_000,
    stockpiling: false,
  };
}
