// ============================================================================
// Empire Engine — CHARACTER DATA
// Your "left hand" co-founder: default config, avatar option tables, presets.
// Pure data + light helpers. No React.
// ============================================================================

import type { AvatarConfig, CofounderState } from '../game/types';

// ---- Avatar option tables ---------------------------------------------------
// Indices stored in AvatarConfig are modulo'd against these lengths by the UI,
// so adding options later stays save-safe.

export const AVATAR_OPTIONS = {
  // Skin tones (hex). Warm-to-cool friendly range.
  skins: [
    '#f1c9a5',
    '#e0a878',
    '#c68642',
    '#a3623b',
    '#7a4a30',
    '#8d5524',
    '#ffdbac',
    '#5c3a21',
  ] as string[],
  // Hair colors (hex).
  hairColors: [
    '#1c1917',
    '#3b2417',
    '#6b4423',
    '#a8651b',
    '#d4a017',
    '#9ca3af',
    '#e5e7eb',
    '#7c3aed',
    '#ec4899',
    '#06b6d4',
  ] as string[],
  // Number of procedural hair styles (0..hairStyles-1). 0 = bald/short fade.
  hairStyles: 8,
  // Outfit / blazer colors (hex).
  outfits: [
    '#2563eb',
    '#0e7490',
    '#7c3aed',
    '#db2777',
    '#dc2626',
    '#ea580c',
    '#16a34a',
    '#475569',
    '#1e293b',
    '#0f766e',
  ] as string[],
  // Accessories. Index 0 MUST be "none".
  accessories: ['None', 'Glasses', 'Headset', 'Cap', 'Earrings', 'Shades'] as string[],
  // Expressions (procedural mouth/eye shapes).
  expressions: ['Smiling', 'Confident', 'Focused', 'Cheerful', 'Calm'] as string[],
};

// ---- Default co-founder -----------------------------------------------------

/** The player's default right-hand co-founder. accent gets overridden to the
 *  player's chosen accent in newGameForSetup. */
export const DEFAULT_COFOUNDER: CofounderState = {
  name: 'Mara',
  role: 'Co-Founder & COO',
  avatar: {
    skin: 1,
    hair: 4,
    hairColor: 2,
    outfit: 0,
    accessory: 1,
    expression: 0,
    accent: '#22d3ee',
  },
};

// ---- Presets ----------------------------------------------------------------

export interface CofounderPreset {
  id: string;
  name: string;
  role: string;
  avatar: AvatarConfig;
}

export const COFOUNDER_PRESETS: CofounderPreset[] = [
  {
    id: 'mara',
    name: 'Mara',
    role: 'Co-Founder & COO',
    avatar: {
      skin: 1,
      hair: 4,
      hairColor: 2,
      outfit: 0,
      accessory: 1,
      expression: 0,
      accent: '#22d3ee',
    },
  },
  {
    id: 'devin',
    name: 'Devin',
    role: 'Head of Growth',
    avatar: {
      skin: 3,
      hair: 1,
      hairColor: 0,
      outfit: 5,
      accessory: 2,
      expression: 1,
      accent: '#f59e0b',
    },
  },
  {
    id: 'priya',
    name: 'Priya',
    role: 'Ops Partner',
    avatar: {
      skin: 2,
      hair: 6,
      hairColor: 5,
      outfit: 2,
      accessory: 0,
      expression: 3,
      accent: '#a78bfa',
    },
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'Creative Director',
    avatar: {
      skin: 0,
      hair: 3,
      hairColor: 8,
      outfit: 3,
      accessory: 5,
      expression: 2,
      accent: '#ec4899',
    },
  },
];

/** Clamp an avatar index safely against an option table length. */
export function avatarIndex(value: number, length: number): number {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
}
