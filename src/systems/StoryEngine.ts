// StoryEngine — evaluate which story beats are now eligible. Pure.

import { STORY_BEATS } from '../data/story';
import type { GameState, StoryBeat } from '../game/types';

/** Has this beat already been seen or queued? */
function isActiveOrSeen(state: GameState, id: string): boolean {
  return (state.story?.seen ?? []).includes(id) || (state.story?.queue ?? []).includes(id);
}

export function beatTriggered(state: GameState, beat: StoryBeat): boolean {
  const t = beat.trigger;
  switch (t.type) {
    case 'start':
      return true;
    case 'earnings':
      return (state.lifetimeEarnings || 0) >= (t.value ?? 0);
    case 'tier': {
      // value = tier number; eligible once lifetime earnings cross that tier unlock
      const unlocks = [0, 1e4, 1e7, 1e10, 1e13];
      const idx = (t.value ?? 1) - 1;
      return (state.lifetimeEarnings || 0) >= (unlocks[idx] ?? Infinity);
    }
    case 'prestige':
      return (state.prestigeCount || 0) >= (t.value ?? 1);
    case 'territory':
      return (state.territory?.unlocked?.length ?? 0) >= (t.value ?? 1);
    case 'research':
      return (state.research?.completed?.length ?? 0) >= (t.value ?? 1);
    case 'advisor':
      return Object.keys(state.advisors?.owned ?? {}).length >= (t.value ?? 1);
    default:
      return false;
  }
}

/** Newly-eligible beat ids (not yet seen/queued) to push onto the story queue. */
export function newlyEligibleBeats(state: GameState): string[] {
  const out: string[] = [];
  for (const beat of STORY_BEATS) {
    if (isActiveOrSeen(state, beat.id)) continue;
    if (beatTriggered(state, beat)) out.push(beat.id);
  }
  return out;
}

export function getBeat(id: string): StoryBeat | undefined {
  return STORY_BEATS.find((b: StoryBeat) => b.id === id);
}

/** True when every beat of `act` has been seen (used to advance the act counter). */
export function actComplete(state: GameState, act: number): boolean {
  const beats: StoryBeat[] = STORY_BEATS.filter((b: StoryBeat) => b.act === act);
  if (beats.length === 0) return false;
  const seen = state.story?.seen ?? [];
  return beats.every((b: StoryBeat) => seen.includes(b.id));
}
