// ============================================================================
// GameContext  -  provider, reducer (all actions), selector re-exports,
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
  AmbientEntry,
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
import { tickRivals, shiftRivalAggression, counterRivalMove, applyPlayerOffense } from '../systems/RivalEngine';
import {
  tickInvestments,
  buyPortfolio,
  sellPortfolio,
  defaultInvestmentState,
} from '../systems/InvestmentEngine';
import { tickCompanions, shiftCompanionTrust } from '../systems/CompanionEngine';
import { runDirector, directorBeatSeen, defaultDirectorState } from '../systems/DirectorEngine';
import { tickWorkforce, shiftWorkerMorale } from '../systems/WorkforceEngine';
import {
  tickAides, briefAide, markDeployed, canDeploy,
  consumeDefenseCharge, getResilienceBufferIncome,
} from '../systems/AideEngine';
import { shouldRevealPremise, defaultPremiseState, tickPremise } from '../systems/PremiseEngine';
import { getClausesForIndustry } from '../data/premises';
import { recordRun, applyPrestigeDynasty } from '../systems/DynastyEngine';
import { defaultDynastyState } from '../data/dynasty';
import { getEligibleEmergentTemplates, generateEmergentBeat } from '../data/emergentBeats';
import { getAideConfig } from '../data/aides';
import { getRivalConfig } from '../data/rivals';
import { getCompanionConfig } from '../data/companions';
import { ALL_CLAUSE_CONFIGS as CLAUSE_CONFIGS } from '../data/premises';
import { moodFromMorale } from '../systems/WorkforceEngine';
import { tickEchelon, defaultEchelonState } from '../systems/EchelonEngine';
import {
  tickIntel, defaultIntelState, commissionReport, canGatherIntel, INTEL_COMMISSION_COST,
  upgradeWarRoom, canUpgradeWarRoom, warRoomUpgradeCost, recordRivalAttack,
} from '../systems/IntelEngine';
import {
  tickNewspaper, defaultNewspaperState, respondToNews, canRespondToNews, NEWS_RESPOND_COST,
  publishPantheonItem, publishTitanSurpassed, publishTitanNoticed,
} from '../systems/NewspaperEngine';
import { tickPantheon, defaultPantheonState, getRankedTitans } from '../systems/PantheonEngine';
import { getPantheonConfig } from '../data/pantheon';
import { detectNotifications, defaultNotificationState, markAllRead } from '../systems/NotificationEngine';
import {
  tickPublicAffairs,
  defaultPublicAffairsState,
  issueStatement,
  canIssueStatement,
  STATEMENT_COST,
} from '../systems/PublicAffairsEngine';
import { applyIndustryTheme } from '../utils/palette';

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
    settings: { sound: true, music: true, buyQty: 1, liveView: true, reduceMotion: false, haptics: true },
    stats: { clicks: 0, playSeconds: 0, prestiges: 0, created: 0 },
    reputationHeldSec: 0,
    director: defaultDirectorState(now),
    companions: [],
    companionBoosts: [],
    rivals: [],
    rivalPressures: [],
    coalitionActive: false,
    workforce: [],
    aides: [],
    premise: null,
    oldMaster: null,
    ambientFeed: [],
    dynasty: defaultDynastyState(),
    generatedBeats: [],
    echelon: defaultEchelonState(),
    intel: defaultIntelState(),
    newspaper: defaultNewspaperState(),
    notifications: defaultNotificationState(),
    publicAffairs: defaultPublicAffairsState(),
    investments: defaultInvestmentState(),
    pantheon: defaultPantheonState(),
    lastTick: now,
    lastSaved: now,
  };
}

// ---- Save migration (v1 -> v2, deep-merge new defaults) ---------------------

/**
 * Deep-merge the new v2 fields into any loaded save that lacks them so existing
 * v1 games keep playing with full marketing/cofounder/guidance defaults.
 * ADDITIVE ONLY  -  never drops existing fields.
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
    music: s.settings?.music ?? true,
    buyQty: s.settings?.buyQty ?? 1,
    liveView: s.settings?.liveView ?? true,
    reduceMotion: s.settings?.reduceMotion ?? false,
    haptics: s.settings?.haptics ?? true,
  };

  return {
    ...s,
    marketing,
    cofounder,
    guidance,
    settings,
    reputationHeldSec: s.reputationHeldSec ?? 0,
    director: s.director ?? defaultDirectorState(Date.now()),
    companions: (s.companions ?? []).map((c) => ({
      ...c,
      loyaltyHeldSec: c.loyaltyHeldSec ?? 0,
      pendingTrustDelta: c.pendingTrustDelta ?? 0,
    })),
    companionBoosts: s.companionBoosts ?? [],
    rivals: (s.rivals ?? []).map((r) => ({
      ...r,
      defenseHistory: r.defenseHistory ?? [],
      telegraphIsFeint: r.telegraphIsFeint ?? false,
      timesAttacked: r.timesAttacked ?? 0,
    })),
    rivalPressures: s.rivalPressures ?? [],
    coalitionActive: s.coalitionActive ?? false,
    workforce: (s.workforce ?? []).map((w) => ({
      ...w,
      lastEventAt: w.lastEventAt ?? w.hiredAt ?? 0,
    })),
    aides: (s.aides ?? []).map((a) => {
      const cfg = getAideConfig(a.id);
      const kind = cfg?.mechanicKind;
      return {
        ...a,
        deployCooldownUntil: a.deployCooldownUntil ?? 0,
        arcStage: (a as any).arcStage ?? 0,
        defenseCharges: (a as any).defenseCharges ?? (kind === 'legal_fortress' ? 0 : undefined),
        compoundBuffer: (a as any).compoundBuffer ?? (kind === 'compound_engine' ? 0 : undefined),
        resilienceBuffer: (a as any).resilienceBuffer ?? (kind === 'resilience_buffer' ? 0 : undefined),
        resilienceBufferDecayUntil: (a as any).resilienceBufferDecayUntil,
        lastLESnapshot: (a as any).lastLESnapshot,
      };
    }),
    premise: s.premise
      ? {
          revealedAt: s.premise.revealedAt ?? 0,
          clauses: (s.premise.clauses ?? []).map((c) => ({
            id: c.id,
            status: c.status ?? 'locked',
            holdSec: c.holdSec ?? 0,
            fulfilledAt: c.fulfilledAt ?? 0,
            breachSec: c.breachSec ?? 0,
          })),
        }
      : null,
    ambientFeed: s.ambientFeed ?? [],
    dynasty: s.dynasty ?? defaultDynastyState(),
    generatedBeats: s.generatedBeats ?? [],
    echelon: s.echelon ?? defaultEchelonState(),
    intel: s.intel
      ? {
          level: s.intel.level ?? 0,
          reports: (s.intel.reports ?? []).map((r) => ({
            ...r,
            wasFeint: r.wasFeint ?? null,
          })),
          lastBriefAt: s.intel.lastBriefAt ?? 0,
          warRoomLevel: (s.intel as any).warRoomLevel ?? 0,
          dossiers: (s.intel as any).dossiers ?? [],
          vendettas: (s.intel as any).vendettas ?? [],
          pendingCounterIntel: (s.intel as any).pendingCounterIntel ?? null,
          lastUpgradeAt: (s.intel as any).lastUpgradeAt ?? 0,
        }
      : defaultIntelState(),
    newspaper: s.newspaper
      ? {
          items: (s.newspaper.items ?? []).map((n) => ({
            ...n,
            read: n.read ?? false,
            responded: n.responded ?? false,
          })),
          lastPublishedAt: s.newspaper.lastPublishedAt ?? 0,
          heatScore: s.newspaper.heatScore ?? 0,
          arcs: (s.newspaper as any).arcs ?? [],
          frontPageItemId: (s.newspaper as any).frontPageItemId ?? null,
          issueNumber: (s.newspaper as any).issueNumber ?? 1,
        }
      : defaultNewspaperState(),
    notifications: s.notifications
      ? {
          items: (s.notifications.items ?? []).map((n) => ({ ...n, read: n.read ?? false })),
          lastSeenAt: s.notifications.lastSeenAt ?? 0,
        }
      : defaultNotificationState(),
    publicAffairs: s.publicAffairs
      ? {
          confidence: s.publicAffairs.confidence ?? 50,
          lastStatementAt: s.publicAffairs.lastStatementAt ?? 0,
        }
      : defaultPublicAffairsState(),
    investments: s.investments ?? defaultInvestmentState(),
    pantheon: s.pantheon
      ? {
          titans: (s.pantheon.titans ?? []).map((t) => ({
            id: t.id,
            estimatedValuation: t.estimatedValuation ?? 0,
            hasNoticedPlayer: t.hasNoticedPlayer ?? false,
            enteredAsRival: t.enteredAsRival ?? false,
            lastActivityAt: t.lastActivityAt ?? 0,
            recentActivity: t.recentActivity ?? [],
          })),
          playerRank: s.pantheon.playerRank ?? 7,
          lastActivityAt: s.pantheon.lastActivityAt ?? 0,
        }
      : defaultPantheonState(),
    // Old Master state: default for saves that predate this system.
    oldMaster: (s as any).oldMaster ?? null,
    // Backfill gameMode + chosenAideId for pre-existing CompanySetup saves.
    setup: s.setup
      ? {
          ...s.setup,
          gameMode: (s.setup as any).gameMode ?? 'inheritance',
          chosenAideId: (s.setup as any).chosenAideId ?? 'marcus',
        }
      : null,
    version: SAVE_VERSION,
  };
}

/** A brand-new game for a given setup. */
function newGameForSetup(setup: CompanySetup, now: number): GameState {
  const base = freshInitialState(now);
  // Empire Run mode suppresses the story modal queue; narrative runs through
  // companions, rivals, and the Ledger instead.
  const isStoryMode = setup.gameMode !== 'empire_run';
  const startBeat = isStoryMode
    ? STORY_BEATS.find((b: StoryBeat) => b.trigger.type === 'start')
    : undefined;
  const firstGuidance = GUIDANCE_BEATS.find((b) => b.trigger.type === 'start');
  const firstFacilityId = `${setup.industry}-t1-0`;

  // Pre-build the industry-specific premise clauses so they're correct from day one.
  const clauseConfigs = getClausesForIndustry(setup.industry);
  const premiseState = {
    revealedAt: 0, // not yet revealed; PremiseEngine reveals at PREMISE_REVEAL_THRESHOLD
    clauses: clauseConfigs.map((cfg) => ({
      id: cfg.id,
      status: 'locked' as const,
      holdSec: 0,
      fulfilledAt: 0,
      breachSec: 0,
    })),
  };

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
    cofounder: {
      ...DEFAULT_COFOUNDER,
      avatar: { ...DEFAULT_COFOUNDER.avatar, accent: setup.accent },
    },
    guidance: {
      ...base.guidance,
      queue: firstGuidance ? [firstGuidance.id] : [],
      lastShownAt: now,
    },
    // Wire the industry-specific premise from the start (revealed later by PremiseEngine).
    premise: premiseState,
    oldMaster: { contactsSeen: [] },
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
        // Sofia's resilience buffer drips a portion of its value back into earnings
        const resilienceIncome = getResilienceBufferIncome(state.aides ?? [], dt);
        next.cash = state.cash + income + resilienceIncome;
        next.lifetimeEarnings = state.lifetimeEarnings + income + resilienceIncome;
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

      // Guidance (co-founder coaching) triggers  -  min-interval gated, one at a
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

      // Reputation axis: accumulate visionary time, decay when not visionary.
      const ethics = next.story.ethics;
      const held = next.reputationHeldSec ?? 0;
      if (ethics > 20) {
        next.reputationHeldSec = Math.min(held + dt, 300);
      } else {
        next.reputationHeldSec = Math.max(0, held - dt / 3);
      }

      // Director: read signals, classify phase, produce decisions.
      const dir = runDirector(next, now);
      next.director = dir.nextDirectorState;

      // Story pacing: limit how many new beats get enqueued this tick.
      const eligible = newlyEligibleBeats(next);
      const allowedBeats = eligible.slice(0, dir.maxNewBeats);
      if (allowedBeats.length > 0) {
        next.story = { ...next.story, queue: [...next.story.queue, ...allowedBeats] };
      }

      // Emergent dynasty beats  -  procedurally generated from dynasty run history.
      {
        const dynasty = next.dynasty ?? defaultDynastyState();
        const emergentSlots = dir.maxNewBeats - allowedBeats.length;
        if (emergentSlots > 0 && dynasty.runs.length > 0) {
          const templates = getEligibleEmergentTemplates(dynasty, next, next.story.seen);
          const triggered = templates.filter((t) => {
            if (t.trigger.type === 'earnings') return next.lifetimeEarnings >= (t.trigger.value ?? 0);
            return false;
          });
          if (triggered.length > 0) {
            const toAdd = triggered.slice(0, emergentSlots);
            const generated = toAdd.map((t) => generateEmergentBeat(t, dynasty, next));
            next.generatedBeats = [...(next.generatedBeats ?? []), ...generated];
            next.story = {
              ...next.story,
              queue: [...next.story.queue, ...generated.map((b) => b.id)],
            };
          }
        }
      }

      // Golden bubble nudge: director may schedule a micro-event.
      if (dir.nudgeGoldenBubble && next.events.bubbleAt <= now) {
        next.events = { ...next.events, bubbleAt: now + 5_000, lastMicroAt: now };
      }

      // Rival engine: sync roster, evaluate, execute telegraphs, expire pressures, coalition.
      // Apply the director's rival modifier by temporarily boosting passive agg on rivals
      // that are below the escalation threshold.
      const rivalResult = tickRivals(next, now);
      // Post-process: apply the agg modifier to non-terminal rivals.
      const modifiedRivals = rivalResult.rivals.map((r) => {
        if (r.posture === 'DEFEATED' || r.posture === 'ALLIED') return r;
        if (dir.rivalAggModifier === 1) return r;
        // Scale pending aggression delta relative to modifier.
        const mod = dir.rivalAggModifier - 1; // how much extra to add (can be negative)
        const newAgg = Math.max(0, Math.min(100, r.aggression + mod * 3 * dt));
        return { ...r, aggression: newAgg };
      });
      next.rivals = modifiedRivals;

      // Marcus (Legal Fortress): absorb any newly-landed rival pressure with a charge
      const newPressuresThisTick = rivalResult.rivalPressures.filter(
        (p) => !(state.rivalPressures ?? []).some((op) => op.rivalId === p.rivalId && op.endsAt === p.endsAt)
      );
      let pressuresToApply = rivalResult.rivalPressures;
      if (newPressuresThisTick.length > 0) {
        let currentAides = next.aides ?? [];
        for (const _newP of newPressuresThisTick) {
          const [updatedAides, absorbed] = consumeDefenseCharge(currentAides, now);
          currentAides = updatedAides;
          if (absorbed) {
            // Remove the absorbed pressure from the list
            pressuresToApply = pressuresToApply.filter((p) => p !== _newP);
          }
        }
        next.aides = currentAides;
      }
      next.rivalPressures = pressuresToApply;
      next.coalitionActive = rivalResult.coalitionActive;

      // Companion engine: sync roster, evaluate trust, fire supportive moves.
      // Apply director companion nudge first so the tick can act on it.
      if (dir.companionTrustNudge) {
        next.companions = shiftCompanionTrust(
          next.companions ?? [],
          dir.companionTrustNudge.companionId,
          dir.companionTrustNudge.delta
        );
      }
      const companionResult = tickCompanions(next, now);
      next.companions = companionResult.companions;
      next.companionBoosts = companionResult.companionBoosts;

      // Workforce engine: sync roster size, drift morale from ethics/rivals/companions.
      next.workforce = tickWorkforce(next, dt, now);

      // Aide engine: sync roster, drift loyalty.
      next.aides = tickAides(next, dt, now);

      // Premise engine: reveal the Old Master's will once LE threshold is met,
      // then evaluate clause conditions each tick.
      if (shouldRevealPremise(next)) {
        // Premise was pre-seeded with industry clauses in newGameForSetup;
        // here we just stamp the reveal time so the UI shows the will.
        if (next.premise && next.premise.revealedAt === 0) {
          next.premise = { ...next.premise, revealedAt: now };
        } else if (!next.premise) {
          // Fallback for saves that predate clause pre-seeding.
          next.premise = defaultPremiseState(now, next.setup?.industry);
        }
      }
      if (next.premise) {
        next.premise = tickPremise(next.premise, next, dt, now);
      }

      // Ambient feed: detect notable transitions and post short dispatch entries.
      {
        const newAmbients: AmbientEntry[] = [];

        // Rival: new telegraph fired (or replaced with a different move).
        for (const r of next.rivals) {
          const prev = (state.rivals ?? []).find((p) => p.id === r.id);
          if (r.telegraph && (!prev?.telegraph || prev.telegraph.moveId !== r.telegraph.moveId)) {
            const cfg = getRivalConfig(r.id);
            newAmbients.push({
              id: `${now}-rival-${r.id}`,
              at: now,
              icon: '⚔️',
              source: 'Rival',
              text: `${cfg?.name ?? r.id} is on the move  -  ${r.telegraph.message}`,
            });
          }
        }

        // Companion: trust rung changed (including ESTRANGED departure).
        for (const c of next.companions) {
          const prev = (state.companions ?? []).find((p) => p.id === c.id);
          if (prev && c.rung !== prev.rung) {
            const cfg = getCompanionConfig(c.id);
            if (c.rung === 'ESTRANGED') {
              newAmbients.push({
                id: `${now}-companion-${c.id}-estranged`,
                at: now,
                icon: '💔',
                source: 'Inner Circle',
                text: `${cfg?.name ?? c.id} has left the company. Your choices drove them away.`,
              });
            } else {
              const RUNG_LABELS: Record<string, string> = {
                ACQUAINTANCE: 'joined as an acquaintance',
                COLLEAGUE: 'become a trusted colleague',
                CONFIDANT: 'reached confidant status',
                INNER_CIRCLE: 'entered your inner circle',
                LEGACY: 'formed a legacy bond',
              };
              newAmbients.push({
                id: `${now}-companion-${c.id}`,
                at: now,
                icon: '🤝',
                source: 'Inner Circle',
                text: `${cfg?.name ?? c.id} has ${RUNG_LABELS[c.rung] ?? c.rung}.`,
              });
            }
          }
        }

        // Companion: fired a supportive move (Mara reaches out).
        for (const move of companionResult.firedMoves) {
          const cfg = getCompanionConfig(move.companionId);
          newAmbients.push({
            id: `${now}-companion-move-${move.companionId}`,
            at: now,
            icon: '💬',
            source: cfg?.name ?? move.companionId,
            text: move.message,
          });
        }

        // Workforce: collective mood tier shifted.
        const prevWf = state.workforce ?? [];
        const nextWf = next.workforce;
        if (prevWf.length > 0 && nextWf.length > 0) {
          const prevAvg = prevWf.reduce((s, w) => s + w.morale, 0) / prevWf.length;
          const nextAvg = nextWf.reduce((s, w) => s + w.morale, 0) / nextWf.length;
          const prevMood = moodFromMorale(prevAvg);
          const nextMood = moodFromMorale(nextAvg);
          if (prevMood !== nextMood) {
            const MOOD_TEXT: Record<string, string> = {
              BURNT_OUT: 'Team morale has collapsed  -  your people are burning out.',
              DISENGAGED: 'Your workforce is disengaging. A rally is overdue.',
              NEUTRAL: 'Team morale has stabilised. Things are holding together.',
              ENGAGED: 'Your team is engaged  -  productivity is on the rise.',
              INSPIRED: 'The workforce is inspired. Energy is at its peak.',
            };
            newAmbients.push({
              id: `${now}-workforce`,
              at: now,
              icon: '👥',
              source: 'Workforce',
              text: MOOD_TEXT[nextMood] ?? `Team mood shifted to ${nextMood}.`,
            });
          }
        }

        // Aide: loyalty crossed 75  -  passive bonus unlocked.
        for (const a of next.aides) {
          const prev = (state.aides ?? []).find((p) => p.id === a.id);
          if (prev && prev.loyalty < 75 && a.loyalty >= 75) {
            const cfg = getAideConfig(a.id);
            newAmbients.push({
              id: `${now}-aide-${a.id}`,
              at: now,
              icon: '💼',
              source: 'Cabinet',
              text: `${cfg?.name ?? a.id} is fully committed  -  their passive bonus is now active.`,
            });
          }
        }

        // Premise: clause fulfilled or breached.
        if (next.premise && state.premise) {
          for (const cl of next.premise.clauses) {
            const prevCl = state.premise.clauses.find((p) => p.id === cl.id);
            if (!prevCl || prevCl.status === cl.status) continue;
            const clauseCfg = CLAUSE_CONFIGS.find((c) => c.id === cl.id);
            const label = clauseCfg?.label ?? cl.id;
            if (cl.status === 'fulfilled') {
              newAmbients.push({
                id: `${now}-premise-${cl.id}`,
                at: now,
                icon: '📜',
                source: 'Inheritance',
                text: `Old Master's clause fulfilled: "${label}"  -  your reward is active.`,
              });
            } else if (cl.status === 'breached' && prevCl.status === 'fulfilled') {
              newAmbients.push({
                id: `${now}-premise-breach-${cl.id}`,
                at: now,
                icon: '⚠️',
                source: 'Inheritance',
                text: `Clause breached: "${label}"  -  reward suspended until the condition is re-met.`,
              });
            }
          }
        }

        // Director: era phase transition.
        if (next.director.currentPhase !== state.director.currentPhase) {
          const PHASE_LABELS: Record<string, string> = {
            BOOTSTRAPPING: 'Bootstrapping',
            GROWING: 'Growing',
            SCALING: 'Scaling',
            ESTABLISHED: 'Established',
            TITAN: 'Titan',
          };
          newAmbients.push({
            id: `${now}-phase`,
            at: now,
            icon: '🌐',
            source: 'World',
            text: `You've entered the ${PHASE_LABELS[next.director.currentPhase] ?? next.director.currentPhase} era  -  the landscape is shifting.`,
          });
        }

        if (newAmbients.length > 0) {
          const combined = [...(next.ambientFeed ?? []), ...newAmbients];
          next.ambientFeed = combined.slice(-30);
        }
      }

      // Echelon engine (5.1): advance tier as lifetime earnings grow.
      {
        const prevEchelon = next.echelon ?? defaultEchelonState();
        next.echelon = tickEchelon(prevEchelon, next.lifetimeEarnings, now);
        // Ambient dispatch on tier advance.
        if (next.echelon.tier !== prevEchelon.tier) {
          const TIER_LABELS: Record<string, string> = {
            CONTENDER: 'Contender', PLAYER: 'Market Player',
            LEADER: 'Industry Leader', MOGUL: 'Mogul', TITAN: 'Titan',
          };
          const label = TIER_LABELS[next.echelon.tier] ?? next.echelon.tier;
          const ambientEntry = {
            id: `${now}-echelon`,
            at: now,
            icon: '🏆',
            source: 'Echelon',
            text: `Your enterprise has risen to the ${label} echelon. New doors are opening.`,
          };
          next.ambientFeed = [...(next.ambientFeed ?? []), ambientEntry].slice(-30);
        }
      }

      // Intel Desk engine (5.2): resolve pending reports, decay network level.
      next.intel = tickIntel(next.intel ?? defaultIntelState(), next.rivals ?? [], dt, now);

      // Newspaper engine (5.3): detect transitions, publish headline if warranted.
      {
        const newsTick = tickNewspaper(
          next.newspaper ?? defaultNewspaperState(),
          next,
          dt,
          now,
          state
        );
        next.newspaper = newsTick.newspaper;
      }

      // Notification Engine (5.4): detect all notable transitions, push to log + toasts.
      next.notifications = detectNotifications(
        state,
        next,
        next.notifications ?? defaultNotificationState(),
        now
      );

      // Public Affairs (5.5): drift confidence from aggregate world signals.
      next.publicAffairs = tickPublicAffairs(
        next.publicAffairs ?? defaultPublicAffairsState(),
        next,
        dt
      );

      // Investment system (Part 8): tick portfolio prices, recalculate wealth, gen Wiz offers.
      next.investments = {
        ...(next.investments ?? defaultInvestmentState()),
        ...tickInvestments(next, dt, now),
      };

      // Pantheon system (Part 10): grow titan valuations, generate Ledger articles, track rank.
      {
        const pantheonTick = tickPantheon(
          next.pantheon ?? defaultPantheonState(),
          next,
          dt,
          now,
          state
        );
        next.pantheon = pantheonTick.pantheon;

        // Titan generated a Ledger activity article.
        if (pantheonTick.newLedgerItem) {
          next.newspaper = publishPantheonItem(
            next.newspaper ?? defaultNewspaperState(),
            pantheonTick.newLedgerItem,
            now
          );
        }

        // Titan surpassed — front-page breaking story.
        if (pantheonTick.surpassedTitanId) {
          const titanCfg = getPantheonConfig(pantheonTick.surpassedTitanId);
          const titanState = (next.pantheon.titans ?? []).find((t) => t.id === pantheonTick.surpassedTitanId);
          if (titanCfg && titanState) {
            next.newspaper = publishTitanSurpassed(
              next.newspaper ?? defaultNewspaperState(),
              titanCfg.name,
              titanCfg.title,
              `$${(titanState.estimatedValuation / 1e12).toFixed(1)}T`,
              next.setup?.name ?? 'The Company',
              now
            );
          }
        }

        // Titan just noticed the player — ambient article.
        if (pantheonTick.noticedTitanId) {
          const titanCfg = getPantheonConfig(pantheonTick.noticedTitanId);
          if (titanCfg) {
            next.newspaper = publishTitanNoticed(
              next.newspaper ?? defaultNewspaperState(),
              titanCfg.name,
              titanCfg.title,
              next.setup?.name ?? 'The Company',
              now
            );
            // Also an ambient feed entry.
            const ambientEntry: AmbientEntry = {
              id: `${now}-titan-noticed-${titanCfg.id}`,
              at: now,
              icon: titanCfg.emoji,
              source: 'World',
              text: `${titanCfg.name} (${titanCfg.title}) has taken notice of your empire. The Ledger reports it.`,
            };
            next.ambientFeed = [...(next.ambientFeed ?? []), ambientEntry].slice(-30);
          }
        }

        // Rival attack recording: when a rival's telegraph executes (pressure was applied this tick),
        // record it in the dossier and check vendettas.
        for (const r of next.rivals ?? []) {
          const prevR = (state.rivals ?? []).find((p) => p.id === r.id);
          // A pressure was created this tick if rivalPressures grew for this rival.
          const hadNewPressure =
            (next.rivalPressures ?? []).some(
              (p) => p.rivalId === r.id && p.endsAt > now - 500
            ) &&
            !(state.rivalPressures ?? []).some(
              (p) => p.rivalId === r.id && p.endsAt > now - 500
            );
          if (hadNewPressure && prevR?.telegraph?.moveId) {
            next.intel = recordRivalAttack(
              next.intel ?? defaultIntelState(),
              r.id,
              prevR.telegraph.moveId,
              now
            );
          }
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

      // Dynasty: snapshot this run, earn a trait, unlock heirloom.
      const dynastyRun = recordRun(state);
      const newPrestigeCount = state.prestigeCount + 1;
      const newDynasty = applyPrestigeDynasty(
        state.dynasty ?? defaultDynastyState(),
        dynastyRun,
        newPrestigeCount
      );

      return {
        ...state,
        cash: 0,
        resource: 0,
        facilities: {},
        insight: 0,
        legacyPoints: state.legacyPoints + lp,
        prestigeCount: newPrestigeCount,
        research: { ...state.research, active: null },
        market: defaultMarket(now),
        events: { ...state.events, boost: null },
        story: { ...state.story, queue },
        stats: { ...state.stats, prestiges: state.stats.prestiges + 1 },
        dynasty: newDynasty,
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
      let next: GameState = {
        ...state,
        story: { ...state.story, queue, seen },
        director: directorBeatSeen(state.director, now),
      };
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

    // ----- GUIDANCE_QUEUE -----
    case 'GUIDANCE_QUEUE': {
      const g = state.guidance;
      if (
        g.seen.includes(action.id) ||
        g.queue.includes(action.id) ||
        g.dismissed.includes(action.id)
      ) return state;
      return { ...state, guidance: { ...g, queue: [...g.queue, action.id] } };
    }

    // ----- TOGGLE_LIVE_VIEW -----
    case 'TOGGLE_LIVE_VIEW':
      return {
        ...state,
        settings: { ...state.settings, liveView: !state.settings.liveView },
      };

    // ----- COMPANION_TRUST -----
    case 'COMPANION_TRUST':
      return {
        ...state,
        companions: shiftCompanionTrust(state.companions ?? [], action.companionId, action.delta),
      };

    // ----- COMPANION_ACTIVATE -----
    case 'COMPANION_ACTIVATE': {
      const companion = (state.companions ?? []).find((c) => c.id === action.companionId);
      if (!companion || companion.cooldownUntil > now) return state;
      if (
        companion.rung !== 'INNER_CIRCLE' &&
        companion.rung !== 'LEGACY' &&
        companion.rung !== 'CONFIDANT'
      ) return state;
      // Queue a trust gain for initiating the activation.
      return {
        ...state,
        companions: shiftCompanionTrust(state.companions ?? [], action.companionId, 5),
      };
    }

    // ----- RIVAL_AGGRESSION -----
    case 'RIVAL_AGGRESSION':
      return {
        ...state,
        rivals: shiftRivalAggression(state.rivals ?? [], action.rivalId, action.delta),
      };

    // ----- RIVAL_COUNTER -----
    case 'RIVAL_COUNTER': {
      const rival = (state.rivals ?? []).find((r) => r.id === action.rivalId);
      if (!rival?.telegraph) return state;
      return {
        ...state,
        rivals: counterRivalMove(state.rivals ?? [], action.rivalId),
      };
    }

    // ----- RIVAL_OFFENSE -----
    case 'RIVAL_OFFENSE': {
      const costs: Record<string, { cash: number; influence: number }> = {
        leak_story: { cash: 0, influence: 500 },
        fund_competitor: { cash: 10_000, influence: 0 },
        undercut: { cash: 5_000, influence: 0 },
      };
      const cost = costs[action.offenseKind];
      if (!cost) return state;
      if (state.cash < cost.cash || state.influence < cost.influence) return state;
      return {
        ...state,
        cash: state.cash - cost.cash,
        influence: state.influence - cost.influence,
        rivals: applyPlayerOffense(state.rivals ?? [], action.rivalId, action.offenseKind),
      };
    }

    // ----- WORKER_MORALE -----
    case 'WORKER_MORALE':
      return {
        ...state,
        workforce: shiftWorkerMorale(state.workforce ?? [], action.workerId, action.delta, now),
      };

    // ----- INTEL_COMMISSION -----
    case 'INTEL_COMMISSION': {
      const intel = state.intel ?? defaultIntelState();
      if (!canGatherIntel(intel, now)) return state;
      if (state.influence < INTEL_COMMISSION_COST) return state;
      // Auto-select target: prefer rival with active telegraph, else most aggressive.
      let targetId = action.rivalId;
      if (!targetId) {
        const withTelegraph = (state.rivals ?? []).find((r) => r.telegraph);
        const mostAggressive = (state.rivals ?? []).reduce<typeof state.rivals[0] | null>(
          (best, r) => (!best || r.aggression > best.aggression ? r : best),
          null
        );
        targetId = withTelegraph?.id ?? mostAggressive?.id;
      }
      if (!targetId) return state;
      return {
        ...state,
        influence: state.influence - INTEL_COMMISSION_COST,
        intel: commissionReport(intel, targetId, now),
      };
    }

    // ----- NEWS_RESPOND -----
    case 'NEWS_RESPOND': {
      const newspaper = state.newspaper ?? defaultNewspaperState();
      const item = newspaper.items.find((n) => n.id === action.itemId);
      if (!item || !canRespondToNews(item)) return state;
      if (state.influence < NEWS_RESPOND_COST) return state;
      return {
        ...state,
        influence: state.influence - NEWS_RESPOND_COST,
        newspaper: respondToNews(newspaper, action.itemId),
      };
    }

    // ----- NOTIFICATION_READ_ALL -----
    case 'NOTIFICATION_READ_ALL':
      return {
        ...state,
        notifications: markAllRead(state.notifications ?? defaultNotificationState(), now),
      };

    // ----- PUBLIC_STATEMENT -----
    case 'PUBLIC_STATEMENT': {
      const pa = state.publicAffairs ?? defaultPublicAffairsState();
      if (!canIssueStatement(pa, now)) return state;
      if (state.influence < STATEMENT_COST) return state;
      return {
        ...state,
        influence: state.influence - STATEMENT_COST,
        publicAffairs: issueStatement(pa, now),
      };
    }

    // ----- AIDE_BRIEF -----
    case 'AIDE_BRIEF':
      return {
        ...state,
        aides: briefAide(state.aides ?? [], action.aideId, now),
      };

    // ----- AIDE_DEPLOY -----
    case 'AIDE_DEPLOY': {
      const aide = (state.aides ?? []).find((a) => a.id === action.aideId);
      if (!aide || !canDeploy(aide, now)) return state;
      const cfg = getAideConfig(action.aideId);
      if (!cfg) return state;

      const updatedAides = markDeployed(state.aides ?? [], action.aideId, now);
      let cashBonus = 0;
      let clearedPressures = state.rivalPressures;
      let ethicsBonus = 0;

      // Mechanic-specific deploy effects
      if (cfg.mechanicKind === 'compound_engine') {
        // Yuki: release the full compound buffer as a cash injection
        cashBonus = aide.compoundBuffer ?? 0;
      }
      if (cfg.mechanicKind === 'legal_fortress' || cfg.mechanicKind === 'resilience_buffer') {
        // Marcus / Sofia: clear all active rival pressures on deploy
        clearedPressures = [];
      }
      if (cfg.mechanicKind === 'truth_cycle') {
        // Layla: ethics boost on deploy
        ethicsBonus = 8;
      }

      const nextEthics =
        ethicsBonus > 0
          ? Math.min(100, (state.story?.ethics ?? 0) + ethicsBonus)
          : state.story?.ethics ?? 0;

      return {
        ...state,
        cash: state.cash + cashBonus,
        aides: updatedAides,
        rivalPressures: clearedPressures,
        story: ethicsBonus > 0 ? { ...state.story, ethics: nextEthics } : state.story,
        events: cfg.deployMult > 1 || cfg.deployDurationSec > 1
          ? {
              ...state.events,
              boost: {
                mult: cfg.deployMult,
                endsAt: now + cfg.deployDurationSec * 1000,
                source: `${cfg.name} — ${cfg.deployLabel}`,
              },
            }
          : state.events,
      };
    }

    // ----- INVESTMENT -----
    case 'INV_BUY': {
      const inv = state.investments ?? defaultInvestmentState();
      const result = buyPortfolio(inv, action.portfolioId, action.amount, action.priceBonus, now);
      if (result.error || result.cashSpent > state.cash) return state;
      return {
        ...state,
        cash: state.cash - result.cashSpent,
        investments: result.newState,
      };
    }
    case 'INV_SELL': {
      const inv = state.investments ?? defaultInvestmentState();
      const result = sellPortfolio(inv, action.portfolioId, action.fraction, now);
      if (result.error) return state;
      return {
        ...state,
        cash: state.cash + result.cashGained,
        investments: result.newState,
      };
    }
    case 'INV_DISMISS_OFFER': {
      const inv = state.investments ?? defaultInvestmentState();
      return { ...state, investments: { ...inv, pendingOffer: null } };
    }

    // ----- WAR_ROOM_UPGRADE -----
    case 'WAR_ROOM_UPGRADE': {
      const intel = state.intel ?? defaultIntelState();
      if (!canUpgradeWarRoom(intel, state.influence)) return state;
      const cost = warRoomUpgradeCost(intel);
      return {
        ...state,
        influence: state.influence - cost,
        intel: upgradeWarRoom(intel, now),
      };
    }

    // ----- RIVAL_STRIKE (proactive player attack — extends RIVAL_OFFENSE) -----
    case 'RIVAL_STRIKE': {
      const strikeCosts: Record<string, { cash: number; influence: number }> = {
        talent_poach:    { cash: 20_000, influence: 0 },
        patent_claim:    { cash: 0, influence: 800 },
        hostile_bid:     { cash: 50_000, influence: 0 },
        leak_story:      { cash: 0, influence: 500 },
        fund_competitor: { cash: 10_000, influence: 0 },
        undercut:        { cash: 5_000, influence: 0 },
      };
      const cost = strikeCosts[action.strikeKind];
      if (!cost) return state;
      if (state.cash < cost.cash || state.influence < cost.influence) return state;
      // Map all strike kinds to existing offense function (which handles agg/rel penalties).
      const offenseKind: 'leak_story' | 'fund_competitor' | 'undercut' =
        action.strikeKind === 'talent_poach' ? 'fund_competitor'
        : action.strikeKind === 'patent_claim' ? 'undercut'
        : action.strikeKind === 'hostile_bid' ? 'leak_story'
        : action.strikeKind as 'leak_story' | 'fund_competitor' | 'undercut';
      return {
        ...state,
        cash: state.cash - cost.cash,
        influence: state.influence - cost.influence,
        rivals: applyPlayerOffense(state.rivals ?? [], action.rivalId, offenseKind),
      };
    }

    // ----- VENDETTA_RESPOND (player actively responds to a vendetta) -----
    case 'VENDETTA_RESPOND': {
      const intel = state.intel ?? defaultIntelState();
      const vendetta = intel.vendettas.find((v) => v.rivalId === action.rivalId);
      if (!vendetta) return state;
      if (state.influence < 300) return state;
      // Cost 300 influence; reduces the vendetta rival's aggression by 25.
      return {
        ...state,
        influence: state.influence - 300,
        rivals: shiftRivalAggression(state.rivals ?? [], action.rivalId, -25),
      };
    }

    // ----- LEDGER_READ_ALL -----
    case 'LEDGER_READ_ALL': {
      const newspaper = state.newspaper ?? defaultNewspaperState();
      return {
        ...state,
        newspaper: {
          ...newspaper,
          items: newspaper.items.map((n) => ({ ...n, read: true })),
        },
      };
    }

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

  // Apply full 3-layer industry theme (--accent, --accent-deep, --accent-elec, --accent-glow)
  // whenever the player's accent color changes.
  useEffect(() => {
    const accent = state.setup?.accent;
    if (accent) applyIndustryTheme(accent);
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
