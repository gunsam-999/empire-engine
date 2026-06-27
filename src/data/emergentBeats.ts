// ============================================================================
// Emergent beat templates — procedurally generated story beats that reference
// dynasty history. Each template has a condition (runs > 0, outcomes from last
// run) and a generator that produces a StoryBeat's content from dynasty data.
// ============================================================================

import type { DynastyState, GameState, StoryBeat } from '../game/types';
import { COMPANION_CONFIGS } from './companions';
import { RIVAL_CONFIGS } from './rivals';

interface EmergentTemplate {
  id: string;
  condition: (dynasty: DynastyState, state: GameState) => boolean;
  trigger: StoryBeat['trigger'];
  generate: (dynasty: DynastyState, state: GameState) => Pick<StoryBeat, 'title' | 'speaker' | 'lines'>;
}

const TEMPLATES: EmergentTemplate[] = [
  {
    id: 'em_dynasty_rebirth',
    condition: (d) => d.runs.length === 1,
    trigger: { type: 'earnings', value: 1000 },
    generate: (d) => {
      const ethics = d.runs[0].finalEthics;
      const tone =
        ethics > 30 ? 'with dignity'
        : ethics < -30 ? 'with ruthless efficiency'
        : 'with hard-won clarity';
      return {
        title: 'The Second Dawn',
        speaker: 'narrator',
        lines: [
          `The company has been reborn — its foundations laid ${tone} in the generation before.`,
          'Old workers who survived the first era speak of it quietly, in the margins of long meetings.',
          'The name carries weight now. Use it carefully.',
        ],
      };
    },
  },
  {
    id: 'em_dynasty_rival_echo',
    condition: (d) => d.runs.length >= 1 && d.runs[d.runs.length - 1].rivalsBested.length >= 1,
    trigger: { type: 'earnings', value: 50000 },
    generate: (d) => {
      const bestedId = d.runs[d.runs.length - 1].rivalsBested[0];
      const config = RIVAL_CONFIGS.find((r) => r.id === bestedId);
      const name = config?.name ?? 'your former rival';
      return {
        title: 'Echoes of War',
        speaker: 'rival',
        lines: [
          `Word reaches you: ${name} has reorganized. The old guard was broken — but something new carries their banner.`,
          'Rivals have long memories. So should you.',
        ],
      };
    },
  },
  {
    id: 'em_dynasty_companion_memory',
    condition: (d) => d.runs.length >= 1 && d.runs[d.runs.length - 1].companionsLegacy.length >= 1,
    trigger: { type: 'earnings', value: 10000 },
    generate: (d, s) => {
      const legacyId = d.runs[d.runs.length - 1].companionsLegacy[0];
      const config = COMPANION_CONFIGS.find((c) => c.id === legacyId);
      const name = config
        ? config.id === 'cofounder'
          ? (s.cofounder?.name ?? 'Your co-founder')
          : config.name
        : 'An old ally';
      return {
        title: 'A Remembered Name',
        speaker: 'mentor',
        lines: [
          `${name} shaped the first generation of this company alongside you.`,
          'People who never met them recognize the principles they left behind.',
          'That kind of legacy outlasts any prestige.',
        ],
      };
    },
  },
  {
    id: 'em_dynasty_titan_shadow',
    condition: (d) => d.runs.length >= 2,
    trigger: { type: 'earnings', value: 1e8 },
    generate: (d) => {
      const total = d.runs.length;
      const ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth'];
      const ordinal = ordinals[total + 1] ?? `${total + 1}th`;
      return {
        title: 'The Dynasty Name',
        speaker: 'consortium',
        lines: [
          `You are now in your ${ordinal} generation. The Quorum knows this company not by its products, but by its pattern.`,
          'Dynasties are not built in a single lifetime. They are recognized by the shape of their choices.',
          'You are becoming a shape others navigate around.',
        ],
      };
    },
  },
  {
    id: 'em_dynasty_covenant_echo',
    condition: (d) => d.runs.length >= 1 && d.runs[d.runs.length - 1].clausesFulfilled >= 2,
    trigger: { type: 'earnings', value: 5e5 },
    generate: () => ({
      title: 'The Will, Revisited',
      speaker: 'mentor',
      lines: [
        "The Old Master's Will was not written for a single inheritor.",
        'Generations that honor the clauses find the conditions... gentler. As if the document remembers.',
        'You are building a covenant that outlasts any one chapter.',
      ],
    }),
  },
];

/**
 * Return all emergent templates whose condition is met and haven't been seen.
 * Trigger checking (earnings threshold) is done in the caller (TICK).
 */
export function getEligibleEmergentTemplates(
  dynasty: DynastyState,
  state: GameState,
  seenIds: string[]
): EmergentTemplate[] {
  if (dynasty.runs.length === 0) return [];
  return TEMPLATES.filter((t) => !seenIds.includes(t.id) && t.condition(dynasty, state));
}

/** Materialise a template into a full StoryBeat object. */
export function generateEmergentBeat(
  template: EmergentTemplate,
  dynasty: DynastyState,
  state: GameState
): StoryBeat {
  const { title, speaker, lines } = template.generate(dynasty, state);
  return {
    id: template.id,
    act: 0,
    chapter: 0,
    title,
    trigger: template.trigger,
    speaker,
    lines,
  };
}

export { TEMPLATES as EMERGENT_TEMPLATES };
