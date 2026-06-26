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
  GameReward,
  GameState,
  OfflineSummary,
  StoryBeat,
} from './types';

import { INDUSTRIES } from '../data/industries';
import { STORY_BEATS } from '../data/story';

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
    settings: { sound: true, buyQty: 1 },
    stats: { clicks: 0, playSeconds: 0, prestiges: 0, created: 0 },
    lastTick: now,
    lastSaved: now,
  };
}

/** A brand-new game for a given setup. */
function newGameForSetup(setup: CompanySetup, now: number): GameState {
  const base = freshInitialState(now);
  // first start beat, if any
  const startBeat = STORY_BEATS.find((b: StoryBeat) => b.trigger.type === 'start');
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

    // ----- LOAD / IMPORT -----
    case 'LOAD':
    case 'IMPORT':
      return { ...action.state };

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
      const { summary, state: advanced } = computeOffline(saved, Date.now());
      dispatch({ type: 'LOAD', state: advanced });
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
