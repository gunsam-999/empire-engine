// ============================================================================
// GameContext — provider, reducer (all actions), selector re-exports,
// accent effect, offline progress, game loop + autosave wiring.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type {
  Action,
  CompanySetup,
  CofounderState,
  GameReward,
  GameState,
  OfflineSummary,
  StoryBeat,
} from './types';

import { INDUSTRIES } from '../data/industries';
import { STORY_BEATS } from '../data/story';
import { DEFAULT_COFOUNDER } from '../data/characters';
import { GUIDANCE_BEATS } from '../data/guidance';
import { getMarketingChannel, getMarketingCampaign } from '../data/marketing';

import {
  facilityCost,
  getIndustry,
  getMultipliers,
  getResearchNode,
  incomePerSec,
  insightPerSec,
  marketPrice,
  maxAffordable,
  potentialLP,
  prodPerSec,
  resourceProdPerSec,
  tierUnlocked,
  chainBonus,
} from '../systems/EconomyEngine';
import { getAdvisor } from '../data/advisors';

import { driftMarket, defaultMarket } from '../systems/MarketSystem';
import { newlyEligibleBeats, actComplete, getBeat } from '../systems/StoryEngine';
import { newlyUnlockedMilestones } from '../systems/AchievementSystem';
import { researchDurationMs } from '../systems/ResearchSystem';
import { applyReward, canAfford } from '../systems/EventSystem';
import { getRegion, expandDurationMs } from '../systems/TerritorySystem';
import { levelCost } from '../systems/AdvisorSystem';
import {
  defaultMarketing,
  defaultChannels,
  getChannel,
  channelStepCost,
  channelHasNext,
  tickMarketing,
} from '../systems/MarketingSystem';
import { newlyEligibleGuidance, IDLE_BEAT_ID } from '../systems/GuidanceSystem';

import { startGameLoop } from './GameLoop';
import { loadGame, saveGame, SAVE_VERSION } from './SaveSystem';
import { computeOffline } from './OfflineProgress';
import { MILESTONES } from '../data/milestones';

// ---- Initial state ----------------------------------------------------------

export function freshInitialState(now: number = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    setup: null,
    cash: 0,
    resource: 0,
    lifetimeEarnings: 0,
    insight: 0,
    influence: 0,
    legacyPoints: 0,
    prestigeCount: 0,
    masteryStars: 0,
    transcendShards: 0,
    facilities: {},
    research: { completed: [], active: null },
    advisors: { owned: {}, assigned: {}, cooldowns: {} },
    story: { seen: [], queue: [], ethics: 0, act: 1 },
    territory: { unlocked: ['home'], expanding: null },
    market: defaultMarket(now),
    events: { boost: null, lastMicroAt: 0, bubbleAt: 0 },
    milestones: { unlocked: [] },
    marketing: defaultMarketing(),
    cofounder: { ...DEFAULT_COFOUNDER, avatar: { ...DEFAULT_COFOUNDER.avatar } },
    guidance: { seen: [], queue: [], dismissed: [], lastShownAt: 0 },
    settings: { sound: true, buyQty: 1, liveView: false },
    stats: { clicks: 0, playSeconds: 0, prestiges: 0, created: 0 },
    lastTick: now,
    lastSaved: now,
  };
}

// ---- Save migration (v1 -> v2, deep-merge new defaults) ---------------------

/**
 * Deep-merge the new v2 fields into any loaded save that lacks them so existing
 * v1 games keep playing with full marketing/cofounder/guidance defaults.
 * ADDITIVE ONLY — never drops existing fields.
 */
export function migrateSave(raw: GameState): GameState {
  const s = raw as Partial<GameState> & GameState;

  // marketing: ensure block + every known channel has a default entry.
  const existingMarketing = s.marketing;
  const channels = { ...defaultChannels(), ...(existingMarketing?.channels ?? {}) };
  const marketing = existingMarketing
    ? {
        reach: existingMarketing.reach ?? 0,
        audience: existingMarketing.audience ?? 0,
        followers: existingMarketing.followers ?? 0,
        brand: existingMarketing.brand ?? 1,
        channels,
        campaign: existingMarketing.campaign ?? null,
      }
    : { ...defaultMarketing(), channels };

  const cofounder: CofounderState = s.cofounder
    ? {
        name: s.cofounder.name ?? DEFAULT_COFOUNDER.name,
        role: s.cofounder.role ?? DEFAULT_COFOUNDER.role,
        avatar: { ...DEFAULT_COFOUNDER.avatar, ...(s.cofounder.avatar ?? {}) },
      }
    : { ...DEFAULT_COFOUNDER, avatar: { ...DEFAULT_COFOUNDER.avatar } };

  const guidance = s.guidance
    ? {
        seen: s.guidance.seen ?? [],
        queue: s.guidance.queue ?? [],
        dismissed: s.guidance.dismissed ?? [],
        lastShownAt: s.guidance.lastShownAt ?? 0,
      }
    : { seen: [], queue: [], dismissed: [], lastShownAt: 0 };

  const settings = {
    sound: s.settings?.sound ?? true,
    buyQty: s.settings?.buyQty ?? 1,
    liveView: s.settings?.liveView ?? false,
  };

  return {
    ...s,
    marketing,
    cofounder,
    guidance,
    settings,
    version: SAVE_VERSION,
  };
}

/** A brand-new game for a given setup. */
function newGameForSetup(setup: CompanySetup, now: number): GameState {
  const base = freshInitialState(now);
  // first start beat, if any
  const startBeat = STORY_BEATS.find((b: StoryBeat) => b.trigger.type === 'start');
  // first co-founder guidance beat (welcome), if any
  const firstGuidance = GUIDANCE_BEATS.find((b) => b.trigger.type === 'start');
  // Seed the empire so the loop is "running" from second one and the player can
  // immediately buy a few facilities — otherwise cash:0 + 0/s income soft-locks
  // the very first purchase. Genre-standard generous opening.
  const firstFacilityId = `${setup.industry}-t1-0`;
  return {
    ...base,
    setup: { ...setup, foundedAt: now },
    cash: 50,
    facilities: { [firstFacilityId]: 1 },
    market: { ...defaultMarket(now), priceMul: 1 },
    story: {
      ...base.story,
      queue: startBeat ? [startBeat.id] : [],
    },
    // Seed co-founder with the player's chosen accent + queue the welcome beat.
    cofounder: {
      ...DEFAULT_COFOUNDER,
      avatar: { ...DEFAULT_COFOUNDER.avatar, accent: setup.accent },
    },
    guidance: {
      ...base.guidance,
      queue: firstGuidance ? [firstGuidance.id] : [],
      lastShownAt: now,
    },
    stats: { ...base.stats, created: now },
    lastTick: now,
  };
}

// ---- Reducer ----------------------------------------------------------------

function applyRewardLocal(state: GameState, reward: GameReward | undefined, now: number): GameState {
  return applyReward(state, reward, now);
}

export function reducer(state: GameState, action: Action): GameState {
  const now = Date.now();

  switch (action.type) {
    // ----- SETUP -----
    case 'SETUP':
      return newGameForSetup(action.payload, now);

    // ----- TICK -----
    case 'TICK': {
      if (!state.setup) return state;
      const dt = Math.min(5, Math.max(0, action.dt));
      let next: GameState = { ...state };

      // Production -> cash or stockpile.
      if (state.market.stockpiling) {
        next.resource = state.resource + resourceProdPerSec(state) * dt;
      } else {
        const income = incomePerSec(state) * dt;
        next.cash = state.cash + income;
        next.lifetimeEarnings = state.lifetimeEarnings + income;
      }

      // Insight + influence trickle.
      next.insight = next.insight + insightPerSec(state) * dt;
      next.influence = next.influence + incomePerSec(state) * dt * 1e-4;

      // Marketing: advance reach/audience/followers/brand, pay paid upkeep,
      // auto-pause unaffordable paid channels, expire campaign.
      const mkt = tickMarketing(next, dt, now);
      next.marketing = mkt.marketing;
      if (mkt.cashDelta !== 0) next.cash = next.cash + mkt.cashDelta;
      if (next.marketing.campaign && next.marketing.campaign.endsAt <= now) {
        next.marketing = { ...next.marketing, campaign: null };
      }

      // Research completion.
      if (state.research.active && now >= state.research.active.endsAt) {
        next.research = {
          completed: [...state.research.completed, state.research.active.id],
          active: null,
        };
      }

      // Territory expansion completion.
      if (state.territory.expanding && now >= state.territory.expanding.endsAt) {
        const finishedId = state.territory.expanding.id;
        const unlocked = state.territory.unlocked.includes(finishedId)
          ? state.territory.unlocked
          : [...state.territory.unlocked, finishedId];
        next.territory = { unlocked, expanding: null };
      }

      // Clear expired boost.
      if (next.events.boost && next.events.boost.endsAt <= now) {
        next.events = { ...next.events, boost: null };
      }

      // Market drift.
      next.market = driftMarket(next.market, dt, now);

      // Story triggers.
      const eligible = newlyEligibleBeats(next);
      if (eligible.length > 0) {
        next.story = { ...next.story, queue: [...next.story.queue, ...eligible] };
      }

      // Guidance (co-founder coaching) triggers — min-interval gated, one at a
      // time so it is never spammy.
      const eligibleGuidance = newlyEligibleGuidance(next, now);
      if (eligibleGuidance.length > 0) {
        next.guidance = {
          ...next.guidance,
          queue: [...next.guidance.queue, ...eligibleGuidance],
          lastShownAt: now,
        };
      }

      // Milestone triggers (apply rewards once).
      const newMilestones = newlyUnlockedMilestones(next);
      if (newMilestones.length > 0) {
        next.milestones = {
          unlocked: [...next.milestones.unlocked, ...newMilestones.map((m) => m.id)],
        };
        for (const m of newMilestones) {
          next = applyRewardLocal(next, m.reward, now);
        }
      }

      next.stats = { ...next.stats, playSeconds: next.stats.playSeconds + dt };
      next.lastTick = now;
      return next;
    }

    // ----- BUY_FACILITY -----
    case 'BUY_FACILITY': {
      const { cost, count } = facilityCost(state, action.id, action.qty);
      if (count <= 0 || !Number.isFinite(cost) || state.cash < cost) return state;
      return {
        ...state,
        cash: state.cash - cost,
        facilities: {
          ...state.facilities,
          [action.id]: (state.facilities[action.id] || 0) + count,
        },
        stats: { ...state.stats, clicks: state.stats.clicks + 1 },
      };
    }

    // ----- PRESTIGE -----
    case 'PRESTIGE': {
      const lp = potentialLP(state);
      const ownsTier3 = getIndustry(state)?.facilities.some(
        (f) => f.tier >= 3 && (state.facilities[f.id] || 0) > 0
      );
      if (lp <= 0 && !ownsTier3) return state;

      const prestigeBeat = STORY_BEATS.find((b: StoryBeat) => b.trigger.type === 'prestige');
      const queue =
        prestigeBeat && !state.story.seen.includes(prestigeBeat.id) &&
        !state.story.queue.includes(prestigeBeat.id)
          ? [...state.story.queue, prestigeBeat.id]
          : state.story.queue;

      return {
        ...state,
        cash: 0,
        resource: 0,
        facilities: {},
        insight: 0,
        legacyPoints: state.legacyPoints + lp,
        prestigeCount: state.prestigeCount + 1,
        research: { ...state.research, active: null },
        market: defaultMarket(now),
        events: { ...state.events, boost: null },
        story: { ...state.story, queue },
        stats: { ...state.stats, prestiges: state.stats.prestiges + 1 },
        lastTick: now,
      };
    }

    // ----- START_RESEARCH -----
    case 'START_RESEARCH': {
      if (state.research.active) return state;
      const node = getResearchNode(action.id);
      if (!node) return state;
      if (state.research.completed.includes(action.id)) return state;
      const prereqsMet = node.requires.every((r) => state.research.completed.includes(r));
      if (!prereqsMet) return state;
      if (state.insight < node.cost) return state;
      return {
        ...state,
        insight: state.insight - node.cost,
        research: {
          ...state.research,
          active: {
            id: node.id,
            startedAt: now,
            endsAt: now + researchDurationMs(state, node),
          },
        },
      };
    }

    // ----- ADVISOR_RECRUIT -----
    case 'ADVISOR_RECRUIT': {
      return {
        ...state,
        advisors: {
          ...state.advisors,
          owned: {
            ...state.advisors.owned,
            [action.id]: state.advisors.owned[action.id] || 1,
          },
        },
      };
    }

    // ----- ADVISOR_LEVEL -----
    case 'ADVISOR_LEVEL': {
      const advisor = getAdvisor(action.id);
      if (!advisor) return state;
      const level = state.advisors.owned[action.id] || 0;
      if (level <= 0 || level >= advisor.maxLevel) return state;
      const cost = levelCost(level);
      if (state.influence < cost) return state;
      return {
        ...state,
        influence: state.influence - cost,
        advisors: {
          ...state.advisors,
          owned: { ...state.advisors.owned, [action.id]: level + 1 },
        },
      };
    }

    // ----- ADVISOR_ASSIGN -----
    case 'ADVISOR_ASSIGN': {
      const assigned = { ...state.advisors.assigned };
      if (assigned[action.facilityId] === action.advisorId) {
        delete assigned[action.facilityId];
      } else {
        assigned[action.facilityId] = action.advisorId;
      }
      return { ...state, advisors: { ...state.advisors, assigned } };
    }

    // ----- ADVISOR_ACTIVATE -----
    case 'ADVISOR_ACTIVATE': {
      const advisor = getAdvisor(action.id);
      if (!advisor || !advisor.activeAbility) return state;
      const cd = state.advisors.cooldowns[action.id] || 0;
      if (cd > now) return state;
      const ability = advisor.activeAbility;
      return {
        ...state,
        events: {
          ...state.events,
          boost: {
            mult: ability.mult,
            endsAt: now + ability.durationSec * 1000,
            source: advisor.name,
          },
        },
        advisors: {
          ...state.advisors,
          cooldowns: {
            ...state.advisors.cooldowns,
            [action.id]: now + ability.cooldownSeconds * 1000,
          },
        },
      };
    }

    // ----- STORY_SEEN -----
    case 'STORY_SEEN': {
      const queue = state.story.queue.filter((id) => id !== action.id);
      const seen = state.story.seen.includes(action.id)
        ? state.story.seen
        : [...state.story.seen, action.id];
      let next: GameState = { ...state, story: { ...state.story, queue, seen } };
      // advance act if all beats of current act are seen
      if (actComplete(next, next.story.act)) {
        next = { ...next, story: { ...next.story, act: next.story.act + 1 } };
      }
      return next;
    }

    // ----- STORY_CHOICE -----
    case 'STORY_CHOICE': {
      const beat = getBeat(action.beatId);
      if (!beat || !beat.choice) return state;
      const option = beat.choice.options[action.optionIndex];
      if (!option) return state;
      let next: GameState = {
        ...state,
        story: { ...state.story, ethics: state.story.ethics + option.ethicsShift },
      };
      next = applyRewardLocal(next, option.reward, now);
      // mark seen
      const queue = next.story.queue.filter((id) => id !== action.beatId);
      const seen = next.story.seen.includes(action.beatId)
        ? next.story.seen
        : [...next.story.seen, action.beatId];
      next = { ...next, story: { ...next.story, queue, seen } };
      if (actComplete(next, next.story.act)) {
        next = { ...next, story: { ...next.story, act: next.story.act + 1 } };
      }
      return next;
    }

    // ----- SET_BOOST -----
    case 'SET_BOOST': {
      return {
        ...state,
        events: {
          ...state.events,
          boost: {
            mult: action.mult,
            endsAt: now + action.seconds * 1000,
            source: action.source,
          },
        },
      };
    }

    // ----- EVENT_RESOLVE -----
    case 'EVENT_RESOLVE': {
      if (action.cost && !canAfford(state, action.cost)) return state;
      let next: GameState = { ...state };
      if (action.cost) {
        if (action.cost.cash) next.cash = next.cash - action.cost.cash;
        if (action.cost.influence) next.influence = next.influence - action.cost.influence;
        if (action.cost.lp) next.legacyPoints = next.legacyPoints - action.cost.lp;
      }
      next = applyRewardLocal(next, action.reward, now);
      return next;
    }

    // ----- SELL_RESOURCE -----
    case 'SELL_RESOURCE': {
      const value = state.resource * marketPrice(state);
      if (value <= 0) return state;
      return {
        ...state,
        cash: state.cash + value,
        lifetimeEarnings: state.lifetimeEarnings + value,
        resource: 0,
      };
    }

    // ----- TOGGLE_STOCKPILE -----
    case 'TOGGLE_STOCKPILE':
      return {
        ...state,
        market: { ...state.market, stockpiling: !state.market.stockpiling },
      };

    // ----- SET_BUYQTY -----
    case 'SET_BUYQTY':
      return { ...state, settings: { ...state.settings, buyQty: action.qty } };

    // ----- SET_SETTINGS -----
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    // ----- EXPAND_TERRITORY -----
    case 'EXPAND_TERRITORY': {
      if (state.territory.expanding) return state;
      if (state.territory.unlocked.includes(action.id)) return state;
      const region = getRegion(action.id);
      if (!region) return state;
      if (state.cash < region.unlockCost) return state;
      return {
        ...state,
        cash: state.cash - region.unlockCost,
        territory: {
          ...state.territory,
          expanding: { id: action.id, endsAt: now + expandDurationMs(state, region) },
        },
      };
    }

    // ----- MARKETING_UPGRADE -----
    case 'MARKETING_UPGRADE': {
      const ch = getMarketingChannel(action.channelId);
      if (!ch) return state;
      if (!channelHasNext(state, action.channelId)) return state;
      const cost = channelStepCost(state, action.channelId);
      if (!Number.isFinite(cost)) return state;
      const currency = ch.costCurrency;
      const have = currency === 'cash' ? state.cash : state.influence;
      if (have < cost) return state;
      const cs = getChannel(state, action.channelId);
      const nextChannel = {
        ...cs,
        level: cs.level + 1,
        invested: cs.invested + cost,
        active: true,
      };
      return {
        ...state,
        cash: currency === 'cash' ? state.cash - cost : state.cash,
        influence: currency === 'influence' ? state.influence - cost : state.influence,
        marketing: {
          ...state.marketing,
          channels: { ...state.marketing.channels, [action.channelId]: nextChannel },
        },
      };
    }

    // ----- MARKETING_TOGGLE -----
    case 'MARKETING_TOGGLE': {
      const cs = getChannel(state, action.channelId);
      if (cs.level <= 0) return state;
      return {
        ...state,
        marketing: {
          ...state.marketing,
          channels: {
            ...state.marketing.channels,
            [action.channelId]: { ...cs, active: !cs.active },
          },
        },
      };
    }

    // ----- MARKETING_CAMPAIGN -----
    case 'MARKETING_CAMPAIGN': {
      if (state.marketing.campaign && state.marketing.campaign.endsAt > now) return state;
      const camp = getMarketingCampaign(action.id);
      if (!camp) return state;
      const have = camp.costCurrency === 'cash' ? state.cash : state.influence;
      if (have < camp.cost) return state;
      const liveBeat = GUIDANCE_BEATS.find((b) => b.trigger.type === 'campaign');
      const queueCampaign =
        liveBeat &&
        !state.guidance.seen.includes(liveBeat.id) &&
        !state.guidance.queue.includes(liveBeat.id) &&
        !state.guidance.dismissed.includes(liveBeat.id)
          ? [...state.guidance.queue, liveBeat.id]
          : state.guidance.queue;
      return {
        ...state,
        cash: camp.costCurrency === 'cash' ? state.cash - camp.cost : state.cash,
        influence:
          camp.costCurrency === 'influence' ? state.influence - camp.cost : state.influence,
        marketing: {
          ...state.marketing,
          campaign: {
            id: camp.id,
            name: camp.name,
            endsAt: now + camp.durationSec * 1000,
            reachMult: camp.reachMult,
          },
        },
        guidance: { ...state.guidance, queue: queueCampaign },
      };
    }

    // ----- CHARACTER_CUSTOMIZE -----
    case 'CHARACTER_CUSTOMIZE': {
      const p = action.payload;
      return {
        ...state,
        cofounder: {
          name: p.name ?? state.cofounder.name,
          role: p.role ?? state.cofounder.role,
          avatar: p.avatar
            ? { ...state.cofounder.avatar, ...p.avatar }
            : state.cofounder.avatar,
        },
      };
    }

    // ----- GUIDANCE_SEEN -----
    case 'GUIDANCE_SEEN': {
      const queue = state.guidance.queue.filter((id) => id !== action.id);
      const seen = state.guidance.seen.includes(action.id)
        ? state.guidance.seen
        : [...state.guidance.seen, action.id];
      return {
        ...state,
        guidance: { ...state.guidance, queue, seen, lastShownAt: now },
      };
    }

    // ----- GUIDANCE_DISMISS -----
    case 'GUIDANCE_DISMISS': {
      const queue = state.guidance.queue.filter((id) => id !== action.id);
      const dismissed = state.guidance.dismissed.includes(action.id)
        ? state.guidance.dismissed
        : [...state.guidance.dismissed, action.id];
      return {
        ...state,
        guidance: { ...state.guidance, queue, dismissed, lastShownAt: now },
      };
    }

    // ----- TOGGLE_LIVE_VIEW -----
    case 'TOGGLE_LIVE_VIEW':
      return {
        ...state,
        settings: { ...state.settings, liveView: !state.settings.liveView },
      };

    // ----- LOAD / IMPORT -----
    case 'LOAD':
    case 'IMPORT':
      return migrateSave(action.state);

    // ----- HARD_RESET -----
    case 'HARD_RESET':
      return freshInitialState(now);

    default:
      return state;
  }
}

// ---- Context ----------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  offlineSummary: OfflineSummary | null;
  dismissOffline: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function init(): GameState {
  return freshInitialState();
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const bootstrapped = useRef(false);

  // Load save + compute offline progress on mount.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const saved = loadGame();
    if (saved && saved.setup) {
      // Migrate v1 -> v2 (deep-merge marketing/cofounder/guidance defaults)
      // BEFORE offline so offline can safely read the new fields.
      const migrated = migrateSave(saved);
      const { summary, state: advanced } = computeOffline(migrated, Date.now());
      // Welcome-back coaching beat on return from a meaningful absence.
      let withGuidance = advanced;
      if (
        summary &&
        !advanced.guidance.seen.includes(IDLE_BEAT_ID) &&
        !advanced.guidance.queue.includes(IDLE_BEAT_ID) &&
        !advanced.guidance.dismissed.includes(IDLE_BEAT_ID)
      ) {
        withGuidance = {
          ...advanced,
          guidance: {
            ...advanced.guidance,
            queue: [...advanced.guidance.queue, IDLE_BEAT_ID],
          },
        };
      }
      dispatch({ type: 'LOAD', state: withGuidance });
      if (summary) setOfflineSummary(summary);
    }
  }, []);

  // Accent CSS var follows the setup.
  useEffect(() => {
    const accent = state.setup?.accent;
    if (accent) {
      document.documentElement.style.setProperty('--accent', accent);
    }
  }, [state.setup?.accent]);

  // Game loop.
  useEffect(() => {
    if (!state.setup) return;
    const handle = startGameLoop(dispatch);
    return () => handle.stop();
  }, [state.setup !== null]);

  // Autosave: every 30s and on visibility -> hidden.
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (!state.setup) return;
    const interval = setInterval(() => {
      if (stateRef.current.setup) saveGame(stateRef.current);
    }, 30_000);
    const onHide = () => {
      if (document.hidden && stateRef.current.setup) saveGame(stateRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [state.setup !== null]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      offlineSummary,
      dismissOffline: () => setOfflineSummary(null),
    }),
    [state, offlineSummary]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}

// ---- Selector re-exports (UI imports from GameContext) ----------------------

export {
  getIndustry,
  getMultipliers,
  incomePerSec,
  insightPerSec,
  resourceProdPerSec,
  marketPrice,
  facilityCost,
  maxAffordable,
  prodPerSec,
  tierUnlocked,
  chainBonus,
  potentialLP,
  getResearchNode,
};
export { getAdvisor };
export { INDUSTRIES, INDUSTRY_LIST } from '../data/industries';
export { MILESTONES };

// ---- Marketing selectors (UI imports from GameContext) ----------------------
export {
  reachPerSec,
  followersPerSec,
  audiencePerSec,
  getMarketingMult,
  getChannel,
  getChannelConfig,
  channelStepCost,
  channelHasNext,
  channelReachRate,
  hasSocialContentSynergy,
  paidUpkeepPerSec,
  campaignActive,
  campaignReachMult,
  brandMult,
} from '../systems/MarketingSystem';
export { MARKETING_CHANNELS, MARKETING_CAMPAIGNS, getMarketingChannel, getMarketingCampaign } from '../data/marketing';
export { GUIDANCE_BEATS, getGuidanceBeat } from '../data/guidance';
export {
  DEFAULT_COFOUNDER,
  AVATAR_OPTIONS,
  COFOUNDER_PRESETS,
  avatarIndex,
} from '../data/characters';
