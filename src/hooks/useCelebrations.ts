// useCelebrations  -  watches the game state for "big moment" transitions and
// fires the CelebrationHost (confetti + title card) plus a matching synthesized
// fanfare. Fully decoupled from the reducer: it diffs the current state against
// the previous render via refs, so no game-logic file needs to know the
// celebration layer exists.
//
// Moments:
//   • A milestone newly unlocked            → 'milestone' + milestone fanfare
//   • Echelon tier climbed                  → 'echelon'   + level-up arpeggio
//   • Director era advanced                 → 'era'       + horn swell
//   • A prestige (rebirth) completed        → 'prestige'  + rebirth swell
//
// On first mount it snapshots the baseline (so loading a deep save doesn't dump
// a backlog of celebrations) and only reacts to changes from there.

import { useEffect, useRef } from 'react';
import { useGame } from '../game/GameContext';
import { celebrate } from '../components/shared/CelebrationHost';
import { sfx } from '../systems/AudioEngine';
import { music } from '../systems/MusicEngine';
import { MILESTONES } from '../data/milestones';
import { ECHELON_LABELS } from '../systems/EchelonEngine';
import type { EchelonTier } from '../game/types';

const TIER_ORDER: EchelonTier[] = [
  'STARTUP',
  'CONTENDER',
  'PLAYER',
  'LEADER',
  'MOGUL',
  'TITAN',
];

const ERA_LABEL: Record<string, string> = {
  BOOTSTRAPPING: 'Bootstrapping',
  GROWING: 'Growing',
  SCALING: 'Scaling',
  ESTABLISHED: 'Established',
  TITAN: 'Titan',
};
const ERA_SUB: Record<string, string> = {
  GROWING: 'The grind is paying off. Momentum is yours.',
  SCALING: 'You are a real player now. Build the machine.',
  ESTABLISHED: 'An institution. The market moves around you.',
  TITAN: 'You bend the industry to your will.',
};

const TIER_ICON: Record<EchelonTier, string> = {
  STARTUP: '🌱',
  CONTENDER: '📈',
  PLAYER: '🏢',
  LEADER: '👑',
  MOGUL: '💎',
  TITAN: '🌐',
};

export function useCelebrations(): void {
  const { state } = useGame();

  const seenMilestones = useRef<Set<string> | null>(null);
  const lastTier = useRef<EchelonTier | null>(null);
  const lastEra = useRef<string | null>(null);
  const lastPrestige = useRef<number | null>(null);

  useEffect(() => {
    if (!state.setup) return;

    // ---- Baseline snapshot on first run (no celebrations for existing state).
    if (seenMilestones.current === null) {
      seenMilestones.current = new Set(state.milestones.unlocked);
      lastTier.current = state.echelon?.tier ?? 'STARTUP';
      lastEra.current = state.director?.currentPhase ?? 'BOOTSTRAPPING';
      lastPrestige.current = state.prestigeCount;
      return;
    }

    // ---- Milestones newly unlocked.
    for (const id of state.milestones.unlocked) {
      if (seenMilestones.current.has(id)) continue;
      seenMilestones.current.add(id);
      const m = MILESTONES.find((x) => x.id === id);
      if (m) {
        celebrate({ kind: 'milestone', icon: m.icon, title: m.name, subtitle: m.desc });
        sfx.play('milestone');
        music.sting('milestone');
      }
    }

    // ---- Echelon tier climbed (only on an upward move).
    const tier = state.echelon?.tier ?? 'STARTUP';
    if (lastTier.current && tier !== lastTier.current) {
      const climbed =
        TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(lastTier.current);
      if (climbed) {
        celebrate({
          kind: 'echelon',
          icon: TIER_ICON[tier],
          title: ECHELON_LABELS[tier],
          subtitle: `You've reached the ${ECHELON_LABELS[tier]} echelon.`,
        });
        sfx.play('levelup');
      }
      lastTier.current = tier;
    }

    // ---- Director era advanced.
    const era = state.director?.currentPhase ?? 'BOOTSTRAPPING';
    if (lastEra.current && era !== lastEra.current) {
      const order = ['BOOTSTRAPPING', 'GROWING', 'SCALING', 'ESTABLISHED', 'TITAN'];
      if (order.indexOf(era) > order.indexOf(lastEra.current)) {
        celebrate({
          kind: 'era',
          icon: '🌅',
          title: `The ${ERA_LABEL[era] ?? era} Era`,
          subtitle: ERA_SUB[era],
        });
        sfx.play('era');
        music.sting('era');
      }
      lastEra.current = era;
    }

    // ---- Prestige (rebirth) completed.
    if (lastPrestige.current !== null && state.prestigeCount > lastPrestige.current) {
      celebrate({
        kind: 'prestige',
        icon: '♾️',
        title: 'Restructured',
        subtitle: 'A new cycle begins  -  stronger, wiser, compounding.',
      });
      sfx.play('prestige');
      music.sting('prestige');
      lastPrestige.current = state.prestigeCount;
    }
  }, [
    state.setup,
    state.milestones.unlocked,
    state.echelon?.tier,
    state.director?.currentPhase,
    state.prestigeCount,
  ]);
}
