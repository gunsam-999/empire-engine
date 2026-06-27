// EventSystem  -  micro/major/crisis event selection + reward application. Pure.

import { MICRO_EVENTS, MAJOR_EVENTS, CRISIS_EVENTS } from '../data/events';
import type { GameReward, GameState } from '../game/types';

export interface GameEventDef {
  id: string;
  title: string;
  text: string;
  icon: string;
  options: {
    label: string;
    reward?: GameReward;
    cost?: { cash?: number; influence?: number; lp?: number };
  }[];
}

const MICRO_INTERVAL_MS = 45_000;

/** Should a micro-event fire now? (rate-limited via events.lastMicroAt) */
export function shouldFireMicro(state: GameState, now: number = Date.now()): boolean {
  return now - (state.events?.lastMicroAt ?? 0) >= MICRO_INTERVAL_MS;
}

export function pickMicroEvent(rng: () => number = Math.random): GameEventDef | undefined {
  const list = MICRO_EVENTS as GameEventDef[];
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

export function pickMajorEvent(rng: () => number = Math.random): GameEventDef | undefined {
  const list = MAJOR_EVENTS as GameEventDef[];
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

export function pickCrisisEvent(rng: () => number = Math.random): GameEventDef | undefined {
  const list = CRISIS_EVENTS as GameEventDef[];
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

/** Pure: apply a reward to a state, returning a new state. */
export function applyReward(state: GameState, reward?: GameReward, now: number = Date.now()): GameState {
  if (!reward) return state;
  const next: GameState = { ...state };
  if (reward.cash) {
    next.cash = state.cash + reward.cash;
    next.lifetimeEarnings = state.lifetimeEarnings + Math.max(0, reward.cash);
  }
  if (reward.insight) next.insight = state.insight + reward.insight;
  if (reward.influence) next.influence = state.influence + reward.influence;
  if (reward.lp) next.legacyPoints = state.legacyPoints + reward.lp;
  if (reward.advisorId) {
    next.advisors = {
      ...state.advisors,
      owned: {
        ...state.advisors.owned,
        [reward.advisorId]: state.advisors.owned[reward.advisorId] || 1,
      },
    };
  }
  if (reward.boost) {
    next.events = {
      ...state.events,
      boost: { mult: reward.boost.mult, endsAt: now + reward.boost.seconds * 1000, source: 'event' },
    };
  }
  return next;
}

/** Can the player afford a cost block? */
export function canAfford(
  state: GameState,
  cost?: { cash?: number; influence?: number; lp?: number }
): boolean {
  if (!cost) return true;
  if (cost.cash && state.cash < cost.cash) return false;
  if (cost.influence && state.influence < cost.influence) return false;
  if (cost.lp && state.legacyPoints < cost.lp) return false;
  return true;
}
