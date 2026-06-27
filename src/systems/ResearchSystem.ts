// ResearchSystem  -  prerequisite checks + research timing helpers. Pure.

import { getResearchNode } from './EconomyEngine';
import { RESEARCH_NODES } from '../data/research';
import type { GameState, ResearchNode } from '../game/types';

export function isCompleted(state: GameState, id: string): boolean {
  return (state.research?.completed ?? []).includes(id);
}

export function prereqsMet(state: GameState, node: ResearchNode): boolean {
  const completed = state.research?.completed ?? [];
  return node.requires.every((r) => completed.includes(r));
}

export function canStartResearch(state: GameState, id: string): boolean {
  if (state.research?.active) return false;
  const node = getResearchNode(id);
  if (!node) return false;
  if (isCompleted(state, id)) return false;
  if (!prereqsMet(state, node)) return false;
  return (state.insight || 0) >= node.cost;
}

/** Effective research duration in ms, factoring the innovator speed bonus. */
export function researchDurationMs(state: GameState, node: ResearchNode): number {
  const innovatorSpeed = state.setup?.philosophy === 'innovator' ? 1.15 : 1;
  return (node.timeSec * 1000) / innovatorSpeed;
}

/** Is the active research finished as of `now`? */
export function researchFinished(state: GameState, now: number = Date.now()): boolean {
  const active = state.research?.active;
  return !!active && now >= active.endsAt;
}

export function availableResearch(state: GameState): ResearchNode[] {
  return RESEARCH_NODES.filter(
    (n: ResearchNode) => !isCompleted(state, n.id) && prereqsMet(state, n)
  );
}
