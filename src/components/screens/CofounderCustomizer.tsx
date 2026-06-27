// ============================================================================
// CofounderCustomizer  -  edit your "left hand" co-founder.
//   · name (text input)
//   · avatar features cycled with ◀ ▶ steppers (skin / hair style / hair color /
//     outfit / accessory / expression) with a LIVE CharacterPortrait preview
//   · quick-pick presets (name + role + whole avatar)
// Reads cofounder from useGame(); every change dispatches CHARACTER_CUSTOMIZE so
// the live state (and portrait everywhere) updates immediately.
// Reusable: compact mode for onboarding, full mode in Settings.
// ============================================================================

import { useGame } from '../../game/GameContext';
import { AVATAR_OPTIONS, COFOUNDER_PRESETS, avatarIndex } from '../../data/characters';
import type { AvatarConfig } from '../../game/types';
import CharacterPortrait from '../shared/CharacterPortrait';

export interface CofounderCustomizerProps {
  /** Called when the player confirms (renders a Done button when provided). */
  onDone?: () => void;
  /** Tighter layout for onboarding. Defaults to false. */
  compact?: boolean;
}

type AvatarFeature = Exclude<keyof AvatarConfig, 'accent'>;

interface FeatureDef {
  key: AvatarFeature;
  label: string;
  /** Number of options for this feature. */
  count: number;
  /** Human label for the current value. */
  valueLabel: (i: number) => string;
  /** Optional swatch color for the current value. */
  swatch?: (i: number) => string | undefined;
}

const FEATURES: FeatureDef[] = [
  {
    key: 'skin',
    label: 'Skin',
    count: AVATAR_OPTIONS.skins.length,
    valueLabel: (i) => `Tone ${i + 1}`,
    swatch: (i) => AVATAR_OPTIONS.skins[avatarIndex(i, AVATAR_OPTIONS.skins.length)],
  },
  {
    key: 'hair',
    label: 'Hair Style',
    count: AVATAR_OPTIONS.hairStyles,
    valueLabel: (i) => HAIR_NAMES[avatarIndex(i, HAIR_NAMES.length)],
  },
  {
    key: 'hairColor',
    label: 'Hair Color',
    count: AVATAR_OPTIONS.hairColors.length,
    valueLabel: (i) => `Shade ${i + 1}`,
    swatch: (i) => AVATAR_OPTIONS.hairColors[avatarIndex(i, AVATAR_OPTIONS.hairColors.length)],
  },
  {
    key: 'outfit',
    label: 'Outfit',
    count: AVATAR_OPTIONS.outfits.length,
    valueLabel: (i) => `Look ${i + 1}`,
    swatch: (i) => AVATAR_OPTIONS.outfits[avatarIndex(i, AVATAR_OPTIONS.outfits.length)],
  },
  {
    key: 'accessory',
    label: 'Accessory',
    count: AVATAR_OPTIONS.accessories.length,
    valueLabel: (i) => AVATAR_OPTIONS.accessories[avatarIndex(i, AVATAR_OPTIONS.accessories.length)],
  },
  {
    key: 'expression',
    label: 'Expression',
    count: AVATAR_OPTIONS.expressions.length,
    valueLabel: (i) => AVATAR_OPTIONS.expressions[avatarIndex(i, AVATAR_OPTIONS.expressions.length)],
  },
];

const HAIR_NAMES = [
  'Short Fade',
  'Side Part',
  'Swept Up',
  'Curly',
  'Long Flow',
  'Ponytail',
  'Long Straight',
  'Buzz Cut',
];

export default function CofounderCustomizer({
  onDone,
  compact = false,
}: CofounderCustomizerProps) {
  const { state, dispatch } = useGame();
  const { cofounder } = state;
  const { avatar } = cofounder;

  function setName(name: string) {
    dispatch({ type: 'CHARACTER_CUSTOMIZE', payload: { name } });
  }

  function cycleFeature(feature: FeatureDef, dir: 1 | -1) {
    const current = avatar[feature.key];
    const next = avatarIndex(current + dir, feature.count);
    dispatch({
      type: 'CHARACTER_CUSTOMIZE',
      payload: { avatar: { ...avatar, [feature.key]: next } },
    });
  }

  function applyPreset(presetId: string) {
    const preset = COFOUNDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    dispatch({
      type: 'CHARACTER_CUSTOMIZE',
      payload: {
        name: preset.name,
        role: preset.role,
        // Keep the player's empire accent on the portrait ring/background.
        avatar: { ...preset.avatar, accent: avatar.accent },
      },
    });
  }

  const portraitSize = compact ? 84 : 96;

  return (
    <div className="animate-fade-in">
      {/* ---- Live preview + identity ---- */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#232c3e] bg-[#151c2b] p-4">
        <div
          className="relative shrink-0"
          style={{
            filter: `drop-shadow(0 6px 16px color-mix(in srgb, ${avatar.accent} 45%, transparent))`,
          }}
        >
          <CharacterPortrait avatar={avatar} size={portraitSize} ring />
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8a94a8]">
            Co-founder name
          </label>
          <input
            value={cofounder.name}
            onChange={(e) => setName(e.target.value.slice(0, 18))}
            maxLength={18}
            placeholder="Name your partner"
            className="w-full rounded-xl border border-[#232c3e] bg-[#0e1420] px-3 py-2 text-[15px]
                       font-semibold text-[#e7ecf5] placeholder:text-[#54607a] outline-none
                       transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            aria-label="Co-founder name"
          />
          <div className="mt-1.5 truncate text-[12px] text-[var(--accent)]">{cofounder.role}</div>
        </div>
      </div>

      {/* ---- Feature steppers ---- */}
      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {FEATURES.map((f) => {
          const idx = avatarIndex(avatar[f.key], f.count);
          const swatch = f.swatch?.(idx);
          return (
            <div
              key={f.key}
              className="flex items-center gap-2 rounded-xl border border-[#232c3e] bg-[#0e1420] px-2 py-2"
            >
              <button
                type="button"
                aria-label={`Previous ${f.label}`}
                onClick={() => cycleFeature(f, -1)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#232c3e]
                           bg-[#151c2b] text-[#e7ecf5] transition-transform active:scale-95 hover:border-[var(--accent)]"
              >
                ◀
              </button>
              <div className="min-w-0 flex-1 text-center">
                <div className="text-[9px] uppercase tracking-wider text-[#8a94a8]">{f.label}</div>
                <div className="flex items-center justify-center gap-1.5">
                  {swatch && (
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full border border-[#070b12]/50"
                      style={{ background: swatch }}
                    />
                  )}
                  <span className="truncate text-[12px] font-medium text-[#e7ecf5]">
                    {f.valueLabel(idx)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Next ${f.label}`}
                onClick={() => cycleFeature(f, 1)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#232c3e]
                           bg-[#151c2b] text-[#e7ecf5] transition-transform active:scale-95 hover:border-[var(--accent)]"
              >
                ▶
              </button>
            </div>
          );
        })}
      </div>

      {/* ---- Presets ---- */}
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-[#8a94a8]">
          Quick presets
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {COFOUNDER_PRESETS.map((p) => {
            const isCurrent = cofounder.name === p.name && cofounder.role === p.role;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={[
                  'flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-transform active:scale-95',
                  isCurrent
                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,#151c2b)]'
                    : 'border-[#232c3e] bg-[#151c2b] hover:border-[var(--accent)]',
                ].join(' ')}
              >
                <CharacterPortrait
                  avatar={{ ...p.avatar, accent: avatar.accent }}
                  size={40}
                  ring={false}
                />
                <span className="text-[11px] font-semibold text-[#e7ecf5]">{p.name}</span>
                <span className="text-[9px] text-[#8a94a8]">{p.role}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Done ---- */}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-[14px] font-bold text-[#070b12]
                     transition-transform active:scale-95"
        >
          {compact ? `Let's build, ${cofounder.name || 'partner'} 🚀` : 'Done'}
        </button>
      )}
    </div>
  );
}
