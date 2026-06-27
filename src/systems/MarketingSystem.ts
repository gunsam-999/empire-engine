// ============================================================================
// MarketingSystem  -  all marketing formulas + selectors. Pure, side-effect free.
// Reach is the headline metric. Audience meaningfully boosts income via
// getMarketingMult (consumed by EconomyEngine.getMultipliers).
// ============================================================================

import {
  MARKETING_CHANNELS,
  getMarketingChannel,
  type MarketingChannel,
} from '../data/marketing';
import type { GameState, MarketingChannelState } from '../game/types';

const EMPTY_CHANNEL: MarketingChannelState = {
  level: 0,
  active: false,
  invested: 0,
  progressMs: 0,
};

// ---- Defaults / safe accessors ---------------------------------------------

/** Default channels map: every channel starts at level 0, inactive. */
export function defaultChannels(): Record<string, MarketingChannelState> {
  const out: Record<string, MarketingChannelState> = {};
  for (const ch of MARKETING_CHANNELS) {
    out[ch.id] = { level: 0, active: false, invested: 0, progressMs: 0 };
  }
  return out;
}

export function defaultMarketing(): GameState['marketing'] {
  return {
    reach: 0,
    audience: 0,
    followers: 0,
    brand: 1,
    channels: defaultChannels(),
    campaign: null,
  };
}

export function getChannel(state: GameState, id: string): MarketingChannelState {
  return state.marketing?.channels?.[id] ?? EMPTY_CHANNEL;
}

export function getChannelConfig(id: string): MarketingChannel | undefined {
  return getMarketingChannel(id);
}

// ---- Brand / campaign helpers ----------------------------------------------

/** Brand multiplier on reach. brand starts at 1, grows slowly with reach. */
export function brandMult(state: GameState): number {
  const brand = state.marketing?.brand ?? 1;
  return 1 + Math.log10(1 + Math.max(0, brand - 1)) * 0.25;
}

export function campaignActive(state: GameState, now: number = Date.now()): boolean {
  const c = state.marketing?.campaign;
  return !!c && c.endsAt > now;
}

export function campaignReachMult(state: GameState, now: number = Date.now()): number {
  const c = state.marketing?.campaign;
  return c && c.endsAt > now ? c.reachMult : 1;
}

/** Compounding factor for a channel: snowballs with brand & audience. */
function compoundingFactor(state: GameState, ch: MarketingChannel): number {
  if (ch.compounding <= 0) return 1;
  const audience = state.marketing?.audience ?? 0;
  const brand = state.marketing?.brand ?? 1;
  const snowball = Math.log10(1 + audience) * 0.18 + Math.log10(brand) * 0.4;
  return 1 + ch.compounding * snowball;
}

/** True if a paid channel can currently afford its per-second upkeep. */
export function paidAffordable(state: GameState, ch: MarketingChannel, dt = 1): boolean {
  if (!ch.upkeepPerSec) return true;
  return (state.cash ?? 0) >= ch.upkeepPerSec * dt;
}

// ---- Per-channel rate selectors --------------------------------------------

/** Sum of a numeric step field over unlocked steps (levels 1..level). */
function sumSteps(
  ch: MarketingChannel,
  level: number,
  field: 'reachRate' | 'followerRate' | 'audienceRate'
): number {
  let sum = 0;
  const lvl = Math.min(level, ch.steps.length);
  for (let i = 0; i < lvl; i++) {
    sum += ch.steps[i][field] ?? 0;
  }
  return sum;
}

/** Synergy: Content fuels Social (+25% social reach when both active). */
export function hasSocialContentSynergy(state: GameState): boolean {
  return getChannel(state, 'social').level > 0 && getChannel(state, 'content').level > 0;
}

export const SOCIAL_CONTENT_SYNERGY = 0.25;

/** Reach contributed per second by a single channel. */
export function channelReachRate(
  state: GameState,
  id: string,
  now: number = Date.now()
): number {
  const ch = getMarketingChannel(id);
  if (!ch) return 0;
  const cs = getChannel(state, id);
  if (cs.level <= 0) return 0;

  // Paid channels only produce while active AND affordable.
  if (ch.upkeepPerSec) {
    if (!cs.active || !paidAffordable(state, ch)) return 0;
  }

  let rate = sumSteps(ch, cs.level, 'reachRate');
  rate *= brandMult(state);
  rate *= compoundingFactor(state, ch);

  // Community: viral  -  scales with existing audience.
  if (ch.kind === 'community') {
    const audience = state.marketing?.audience ?? 0;
    rate *= 1 + Math.log10(1 + audience) * 0.5;
  }

  // Social synergy from content.
  if (ch.kind === 'social' && hasSocialContentSynergy(state)) {
    rate *= 1 + SOCIAL_CONTENT_SYNERGY;
  }

  rate *= campaignReachMult(state, now);
  return rate;
}

function channelFollowerRate(state: GameState, id: string): number {
  const ch = getMarketingChannel(id);
  if (!ch) return 0;
  const cs = getChannel(state, id);
  if (cs.level <= 0) return 0;
  if (ch.upkeepPerSec && (!cs.active || !paidAffordable(state, ch))) return 0;
  return sumSteps(ch, cs.level, 'followerRate') * brandMult(state);
}

function channelAudienceRate(state: GameState, id: string): number {
  const ch = getMarketingChannel(id);
  if (!ch) return 0;
  const cs = getChannel(state, id);
  if (cs.level <= 0) return 0;
  if (ch.upkeepPerSec && (!cs.active || !paidAffordable(state, ch))) return 0;
  let rate = sumSteps(ch, cs.level, 'audienceRate');
  if (ch.kind === 'community') {
    const audience = state.marketing?.audience ?? 0;
    rate *= 1 + Math.log10(1 + audience) * 0.5;
  }
  return rate;
}

// ---- Aggregate per-second selectors ----------------------------------------

export function reachPerSec(state: GameState, now: number = Date.now()): number {
  let sum = 0;
  for (const ch of MARKETING_CHANNELS) sum += channelReachRate(state, ch.id, now);
  return sum;
}

export function followersPerSec(state: GameState): number {
  let sum = 0;
  for (const ch of MARKETING_CHANNELS) sum += channelFollowerRate(state, ch.id);
  return sum;
}

export function audiencePerSec(state: GameState): number {
  let sum = 0;
  for (const ch of MARKETING_CHANNELS) sum += channelAudienceRate(state, ch.id);
  return sum;
}

/** Email retention factor: more email investment => slower churn / better hold. */
export function retentionFactor(state: GameState): number {
  const email = getChannel(state, 'email').level;
  return 1 + email * 0.04;
}

/** Total per-second cash upkeep for active+affordable paid channels. */
export function paidUpkeepPerSec(state: GameState): number {
  let sum = 0;
  for (const ch of MARKETING_CHANNELS) {
    if (!ch.upkeepPerSec) continue;
    const cs = getChannel(state, ch.id);
    if (cs.level > 0 && cs.active) sum += ch.upkeepPerSec;
  }
  return sum;
}

// ---- Revenue tie-in --------------------------------------------------------

/**
 * Marketing income multiplier. Early audience small => ~1; grows over time.
 * = 1 + log10(1 + audience) * 0.12 + (campaign active ? 0.25 : 0)
 */
export function getMarketingMult(state: GameState, now: number = Date.now()): number {
  const audience = state.marketing?.audience ?? 0;
  return 1 + Math.log10(1 + audience) * 0.12 + (campaignActive(state, now) ? 0.25 : 0);
}

// ---- Cost of next step -----------------------------------------------------

/** Cost (in the channel's currency) of the NEXT step to unlock, or Infinity. */
export function channelStepCost(state: GameState, id: string): number {
  const ch = getMarketingChannel(id);
  if (!ch) return Infinity;
  const cs = getChannel(state, id);
  const step = ch.steps[cs.level];
  return step ? step.cost : Infinity;
}

/** True if there is a further step to buy. */
export function channelHasNext(state: GameState, id: string): boolean {
  const ch = getMarketingChannel(id);
  if (!ch) return false;
  return getChannel(state, id).level < ch.steps.length;
}

// ---- TICK helper: advance the whole marketing block ------------------------

/**
 * Pure marketing tick. Returns the next marketing block + cash delta from paid
 * upkeep (negative). Auto-pauses unaffordable paid channels. Caller applies.
 */
export function tickMarketing(
  state: GameState,
  dt: number,
  now: number
): { marketing: GameState['marketing']; cashDelta: number } {
  const m = state.marketing ?? defaultMarketing();
  let channels = m.channels;
  let cashDelta = 0;

  // Pay upkeep for active paid channels; auto-pause if cash runs out.
  for (const ch of MARKETING_CHANNELS) {
    if (!ch.upkeepPerSec) continue;
    const cs = channels[ch.id];
    if (!cs || cs.level <= 0 || !cs.active) continue;
    const due = ch.upkeepPerSec * dt;
    if ((state.cash ?? 0) + cashDelta >= due) {
      cashDelta -= due;
    } else {
      // Cannot afford  -  pause it.
      channels = { ...channels, [ch.id]: { ...cs, active: false } };
    }
  }

  // Snapshot state with paused channels so rates reflect the pause this tick.
  const reactiveState: GameState = { ...state, marketing: { ...m, channels } };

  const reachRate = reachPerSec(reactiveState, now);
  const folRate = followersPerSec(reactiveState);
  const audRate = audiencePerSec(reactiveState);

  const reach = m.reach + reachRate * dt;
  const followers = m.followers + folRate * dt;

  // Audience grows toward a reach-driven target with email retention; small
  // churn when there is no active marketing.
  const target = Math.sqrt(reach) * 1.5 * retentionFactor(reactiveState);
  let audience = m.audience + audRate * dt;
  if (audience < target) {
    audience += (target - audience) * Math.min(1, 0.05 * dt);
  } else if (reachRate <= 0) {
    // No marketing pressure  -  gentle churn, dampened by email retention.
    const churn = 0.01 * dt / retentionFactor(reactiveState);
    audience -= audience * Math.min(0.5, churn);
  }
  audience = Math.max(0, audience);

  // Brand grows slowly with sustained reach.
  const brand = m.brand + Math.log10(1 + reachRate) * 0.02 * dt;

  return {
    marketing: { ...m, channels, reach, followers, audience, brand },
    cashDelta,
  };
}
