// ============================================================================
// Empire Engine  -  CHARACTER DATA
// NPC co-founders (recruitable) and shared avatar rendering tables.
// Pure data + helpers. No React.
// ============================================================================

import type { AvatarConfig, CofounderState } from '../game/types';

// ---- Avatar option tables ---------------------------------------------------
// Kept for CharacterPortrait rendering. Indices in AvatarConfig are modulo'd
// against these lengths so adding options stays save-safe.

export const AVATAR_OPTIONS = {
  skins: [
    '#f1c9a5', '#e0a878', '#c68642', '#a3623b',
    '#7a4a30', '#8d5524', '#ffdbac', '#5c3a21',
  ] as string[],
  hairColors: [
    '#1c1917', '#3b2417', '#6b4423', '#a8651b', '#d4a017',
    '#9ca3af', '#e5e7eb', '#7c3aed', '#ec4899', '#06b6d4',
  ] as string[],
  hairStyles: 8,
  outfits: [
    '#2563eb', '#0e7490', '#7c3aed', '#db2777', '#dc2626',
    '#ea580c', '#16a34a', '#475569', '#1e293b', '#0f766e',
  ] as string[],
  accessories: ['None', 'Glasses', 'Headset', 'Cap', 'Earrings', 'Shades'] as string[],
  expressions: ['Smiling', 'Confident', 'Focused', 'Cheerful', 'Calm'] as string[],
};

/** Clamp an avatar index safely against an option table length. */
export function avatarIndex(value: number, length: number): number {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
}

// ---- Recruitable NPC Co-founders --------------------------------------------

export interface NpcCofounder {
  id: string;
  name: string;
  role: string;
  tagline: string;
  backstory: string;
  bonusLabel: string;
  bonusDesc: string;
  bonusMult: number;
  avatar: AvatarConfig;
}

export const NPC_COFOUNDERS: NpcCofounder[] = [
  {
    id: 'mara',
    name: 'Mara Kim',
    role: 'Chief Operating Officer',
    tagline: "Ships at midnight. Doesn't ask permission.",
    backstory:
      'Ran logistics for a $4B supply chain before she was 30. The Old Master brought her in to scale what others called unscalable. She doubled throughput in eight months and asked for equity on day one.',
    bonusLabel: 'Ops Engine',
    bonusDesc: 'Passive +8% to all production. Her systems run quietly and compound without prompting.',
    bonusMult: 1.08,
    avatar: {
      skin: 1, hair: 4, hairColor: 2,
      outfit: 0, accessory: 1, expression: 0,
      accent: '#22d3ee',
    },
  },
  {
    id: 'devin',
    name: 'Devin Obi',
    role: 'Head of Growth',
    tagline: 'Growth is a system, not a strategy.',
    backstory:
      'Built three companies\' growth engines from scratch - each cleared $50M ARR. He doesn\'t take equity for the journey. He takes it for the destination.',
    bonusLabel: 'Revenue Surge',
    bonusDesc: '+12% to all income. Compounds with your market multipliers to accelerate scaling.',
    bonusMult: 1.12,
    avatar: {
      skin: 3, hair: 1, hairColor: 0,
      outfit: 5, accessory: 2, expression: 1,
      accent: '#f59e0b',
    },
  },
  {
    id: 'priya',
    name: 'Priya Sharma',
    role: 'Chief Strategy Officer',
    tagline: "Five moves ahead. She's already there.",
    backstory:
      'Strategy consultant to three Fortune 500 boards. Walked away from a $2M retainer because she wanted to build something, not just advise on it. She\'s been waiting for this.',
    bonusLabel: 'Research Velocity',
    bonusDesc: 'All research nodes complete 15% faster. Unlocks hidden branch paths in the tree.',
    bonusMult: 1.15,
    avatar: {
      skin: 2, hair: 6, hairColor: 5,
      outfit: 2, accessory: 0, expression: 3,
      accent: '#a78bfa',
    },
  },
  {
    id: 'leo',
    name: 'Leo Park',
    role: 'Chief Brand Officer',
    tagline: "People don't buy products. They buy stories.",
    backstory:
      'Built a $200M brand from a single social post and a $0 budget. Believes every empire has a story worth telling - and that most are too afraid to tell it.',
    bonusLabel: 'Brand Reach',
    bonusDesc: '+20% Marketing reach and audience growth. Rival morale hits land 10% harder.',
    bonusMult: 1.20,
    avatar: {
      skin: 0, hair: 3, hairColor: 8,
      outfit: 3, accessory: 5, expression: 2,
      accent: '#ec4899',
    },
  },
];

/** Return the avatar config for a recruited co-founder, or null if not yet recruited. */
export function getCofounderAvatar(cofounder: CofounderState): AvatarConfig | null {
  if (!cofounder.recruited || !cofounder.presetId) return null;
  return NPC_COFOUNDERS.find(c => c.id === cofounder.presetId)?.avatar ?? null;
}

export function getNpcCofounder(id: string): NpcCofounder | undefined {
  return NPC_COFOUNDERS.find(c => c.id === id);
}
