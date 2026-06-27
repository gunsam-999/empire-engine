// ============================================================================
// CharacterPortrait  -  procedural SVG avatar rendered from an AvatarConfig.
// Pure SVG, no external images. Designed to read cleanly at 40px and 96px.
//   head + skin, hair (style + color), simple face with expression, shoulders /
//   outfit, optional accessory (glasses / headset / cap / shades / earrings),
//   subtle accent ring + accent background wash.
// All AvatarConfig indices are clamped with avatarIndex() so saves stay safe
// even if option tables grow.
// ============================================================================

import { useMemo } from 'react';

import type { AvatarConfig } from '../../game/types';
import { AVATAR_OPTIONS, avatarIndex } from '../../data/characters';

type SizePreset = 'sm' | 'md' | 'lg';

export interface CharacterPortraitProps {
  avatar: AvatarConfig;
  /** Pixel size, or a preset: sm=40, md=64, lg=96. Defaults to 'md'. */
  size?: number | SizePreset;
  /** Draw the accent ring + accent background wash. Defaults to true. */
  ring?: boolean;
  className?: string;
}

const SIZE_PRESETS: Record<SizePreset, number> = { sm: 40, md: 64, lg: 96 };

function resolveSize(size: CharacterPortraitProps['size']): number {
  if (typeof size === 'number') return size;
  if (size && size in SIZE_PRESETS) return SIZE_PRESETS[size];
  return SIZE_PRESETS.md;
}

/** Darken a hex color by mixing toward black  -  used for hair shadow / shading. */
function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function CharacterPortrait({
  avatar,
  size = 'md',
  ring = true,
  className = '',
}: CharacterPortraitProps) {
  const px = resolveSize(size);

  const palette = useMemo(() => {
    const skin = AVATAR_OPTIONS.skins[avatarIndex(avatar.skin, AVATAR_OPTIONS.skins.length)];
    const hairColor =
      AVATAR_OPTIONS.hairColors[avatarIndex(avatar.hairColor, AVATAR_OPTIONS.hairColors.length)];
    const outfit = AVATAR_OPTIONS.outfits[avatarIndex(avatar.outfit, AVATAR_OPTIONS.outfits.length)];
    const hairStyle = avatarIndex(avatar.hair, AVATAR_OPTIONS.hairStyles);
    const accessory = avatarIndex(avatar.accessory, AVATAR_OPTIONS.accessories.length);
    const expression = avatarIndex(avatar.expression, AVATAR_OPTIONS.expressions.length);
    return { skin, hairColor, outfit, hairStyle, accessory, expression };
  }, [avatar]);

  const accent = avatar.accent || '#22d3ee';
  const skinShadow = shade(palette.skin, 0.12);
  const hairShade = shade(palette.hairColor, 0.3);
  const outfitShade = shade(palette.outfit, 0.22);

  // Stable per-portrait id suffix so multiple portraits don't collide on defs.
  const uid = useMemo(
    () =>
      `cp${Math.abs(
        (avatar.skin * 31 + avatar.hair * 17 + avatar.outfit * 7 + avatar.accessory * 3 +
          avatar.expression) ^
          Math.floor(px)
      )}`,
    [avatar, px]
  );

  // ---- Expression geometry (mouth + eyes) -----------------------------------
  // Coordinate space is a 100x100 viewBox. Face centered ~ (50, 44).
  const eyeY = 41;
  const mouth = (() => {
    switch (palette.expression) {
      case 1: // Confident  -  subtle smirk
        return 'M42 56 Q50 60 59 55';
      case 2: // Focused  -  flat, determined
        return 'M43 57 L57 57';
      case 3: // Cheerful  -  big open smile
        return 'M41 54 Q50 64 59 54';
      case 4: // Calm  -  gentle closed curve
        return 'M43 56 Q50 59 57 56';
      default: // 0 Smiling  -  friendly curve
        return 'M42 55 Q50 61 58 55';
    }
  })();
  const browTilt = palette.expression === 2 ? 2 : palette.expression === 1 ? -1 : 0;

  return (
    <div
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Co-founder avatar"
        style={{ display: 'block' }}
      >
        <defs>
          <clipPath id={`${uid}-clip`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
          <radialGradient id={`${uid}-bg`} cx="50%" cy="32%" r="75%">
            <stop offset="0%" stopColor={`color-mix(in srgb, ${accent} 34%, #151c2b)`} />
            <stop offset="100%" stopColor="#0e1420" />
          </radialGradient>
          <linearGradient id={`${uid}-outfit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.outfit} />
            <stop offset="100%" stopColor={outfitShade} />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${uid}-clip)`}>
          {/* Background wash */}
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-bg)`} />

          {/* Shoulders / outfit (collar + blazer) */}
          <g>
            <path
              d="M16 100 Q18 74 34 68 L66 68 Q82 74 84 100 Z"
              fill={`url(#${uid}-outfit)`}
            />
            {/* collar V */}
            <path
              d="M42 69 L50 82 L58 69 L52 67 L50 70 L48 67 Z"
              fill={shade(palette.outfit, 0.4)}
            />
            {/* lapels */}
            <path d="M34 69 L50 82 L40 70 Z" fill={shade(palette.outfit, 0.12)} opacity="0.7" />
            <path d="M66 69 L50 82 L60 70 Z" fill={shade(palette.outfit, 0.12)} opacity="0.7" />
          </g>

          {/* Neck */}
          <path d="M43 60 Q50 70 57 60 L57 70 Q50 74 43 70 Z" fill={skinShadow} />

          {/* Hair back layer (behind head) for longer styles */}
          {(palette.hairStyle === 5 || palette.hairStyle === 6) && (
            <path
              d="M24 40 Q22 70 32 80 L36 80 Q30 60 32 44 Z M76 40 Q78 70 68 80 L64 80 Q70 60 68 44 Z"
              fill={hairShade}
            />
          )}

          {/* Head */}
          <ellipse cx="50" cy="44" rx="22" ry="24" fill={palette.skin} />
          {/* ear */}
          <ellipse cx="28.5" cy="46" rx="3.5" ry="5" fill={palette.skin} />
          <ellipse cx="71.5" cy="46" rx="3.5" ry="5" fill={palette.skin} />
          {/* soft cheek shading */}
          <ellipse cx="50" cy="50" rx="22" ry="24" fill={skinShadow} opacity="0.18" />

          {/* Hair front (style-dependent) */}
          {renderHair(palette.hairStyle, palette.hairColor, hairShade)}

          {/* Eyebrows */}
          <g
            stroke={hairShade}
            strokeWidth="2.2"
            strokeLinecap="round"
            transform={`rotate(${browTilt} 50 36)`}
          >
            <line x1="38" y1="35.5" x2="46" y2="34.5" />
            <line x1="54" y1="34.5" x2="62" y2="35.5" />
          </g>

          {/* Eyes */}
          <g fill="#1f2430">
            {palette.expression === 4 ? (
              // Calm  -  closed / content eyes
              <>
                <path d="M40 41 Q43.5 44 47 41" stroke="#1f2430" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M53 41 Q56.5 44 60 41" stroke="#1f2430" strokeWidth="2" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="43.5" cy={eyeY} r="2.6" />
                <circle cx="56.5" cy={eyeY} r="2.6" />
                {/* catchlights */}
                <circle cx="44.4" cy={eyeY - 0.9} r="0.8" fill="#ffffff" />
                <circle cx="57.4" cy={eyeY - 0.9} r="0.8" fill="#ffffff" />
              </>
            )}
          </g>

          {/* Nose hint */}
          <path
            d="M50 44 Q51.5 49 49 50"
            stroke={skinShadow}
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Mouth */}
          <path
            d={mouth}
            stroke="#9a3d3d"
            strokeWidth="2.2"
            fill={palette.expression === 3 ? '#b65b5b' : 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Accessories */}
          {renderAccessory(palette.accessory, accent, eyeY)}
        </g>

        {/* Accent ring (outside clip) */}
        {ring && (
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            opacity="0.9"
          />
        )}
      </svg>
    </div>
  );
}

// ---- Hair styles ------------------------------------------------------------
// 0 short fade · 1 side part · 2 swept · 3 curly/afro · 4 long flow ·
// 5 ponytail · 6 long straight · 7 buzz/short crop
function renderHair(style: number, color: string, dark: string) {
  switch (style) {
    case 0: // Short fade
      return (
        <path
          d="M28 42 Q30 20 50 20 Q70 20 72 42 Q70 32 50 30 Q30 32 28 42 Z"
          fill={color}
        />
      );
    case 1: // Side part
      return (
        <g fill={color}>
          <path d="M27 44 Q28 18 52 19 Q72 20 73 40 Q66 26 48 27 Q34 28 31 40 Q29 42 27 44 Z" />
          <path d="M48 24 Q40 28 33 40 L31 40 Q35 26 48 24 Z" fill={dark} opacity="0.6" />
        </g>
      );
    case 2: // Swept up / quiff
      return (
        <path
          d="M28 42 Q26 22 44 18 Q48 24 50 22 Q54 16 64 22 Q74 28 72 42 Q68 30 50 29 Q34 30 28 42 Z"
          fill={color}
        />
      );
    case 3: // Curly / afro
      return (
        <g fill={color}>
          <circle cx="34" cy="30" r="9" />
          <circle cx="46" cy="24" r="10" />
          <circle cx="58" cy="25" r="9.5" />
          <circle cx="68" cy="32" r="8.5" />
          <circle cx="28" cy="40" r="7" />
          <circle cx="73" cy="40" r="7" />
        </g>
      );
    case 4: // Long flow
      return (
        <g fill={color}>
          <path d="M26 46 Q24 20 50 19 Q76 20 74 46 Q70 30 50 30 Q30 30 26 46 Z" />
          <path d="M26 46 Q24 60 30 70 L34 68 Q29 56 30 46 Z" />
          <path d="M74 46 Q76 60 70 70 L66 68 Q71 56 70 46 Z" />
        </g>
      );
    case 5: // Ponytail
      return (
        <g fill={color}>
          <path d="M28 42 Q30 19 50 19 Q70 19 72 42 Q68 30 50 30 Q32 30 28 42 Z" />
          <path d="M70 32 Q84 36 82 54 Q80 66 74 70 L70 64 Q76 56 74 44 Q72 38 67 38 Z" fill={dark} />
        </g>
      );
    case 6: // Long straight
      return (
        <g fill={color}>
          <path d="M25 48 Q23 19 50 18 Q77 19 75 48 Q70 30 50 30 Q30 30 25 48 Z" />
          <rect x="24" y="40" width="6" height="38" rx="3" />
          <rect x="70" y="40" width="6" height="38" rx="3" />
        </g>
      );
    default: // 7 Buzz / short crop
      return (
        <path
          d="M30 40 Q32 24 50 24 Q68 24 70 40 Q64 32 50 32 Q36 32 30 40 Z"
          fill={color}
          opacity="0.92"
        />
      );
  }
}

// ---- Accessories ------------------------------------------------------------
// 0 None · 1 Glasses · 2 Headset · 3 Cap · 4 Earrings · 5 Shades
function renderAccessory(kind: number, accent: string, eyeY: number) {
  switch (kind) {
    case 1: // Glasses
      return (
        <g stroke="#2a3142" strokeWidth="2" fill="none">
          <rect x="37" y={eyeY - 4} width="11" height="9" rx="3.5" fill="#9fc6ff" fillOpacity="0.18" />
          <rect x="52" y={eyeY - 4} width="11" height="9" rx="3.5" fill="#9fc6ff" fillOpacity="0.18" />
          <line x1="48" y1={eyeY} x2="52" y2={eyeY} />
          <line x1="37" y1={eyeY - 1} x2="30" y2={eyeY - 2} />
          <line x1="63" y1={eyeY - 1} x2="70" y2={eyeY - 2} />
        </g>
      );
    case 2: // Headset
      return (
        <g>
          <path
            d="M27 44 Q27 20 50 20 Q73 20 73 44"
            stroke="#2a3142"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="23.5" y="42" width="7" height="11" rx="3" fill={accent} />
          <rect x="69.5" y="42" width="7" height="11" rx="3" fill="#2a3142" />
          {/* mic boom */}
          <path d="M30 50 Q24 56 38 58" stroke="#2a3142" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="38" cy="58" r="2" fill={accent} />
        </g>
      );
    case 3: // Cap
      return (
        <g>
          <path d="M27 36 Q30 18 50 18 Q70 18 73 36 Q60 30 50 30 Q40 30 27 36 Z" fill={accent} />
          <path d="M27 36 Q20 37 17 41 Q28 40 40 38 Q33 36 27 36 Z" fill={shade(accent, 0.25)} />
          <circle cx="50" cy="22" r="2" fill={shade(accent, 0.35)} />
        </g>
      );
    case 4: // Earrings
      return (
        <g fill={accent}>
          <circle cx="28.5" cy="52" r="2.2" />
          <circle cx="71.5" cy="52" r="2.2" />
        </g>
      );
    case 5: // Shades
      return (
        <g>
          <rect x="36" y={eyeY - 4} width="13" height="9" rx="3" fill="#11151f" />
          <rect x="51" y={eyeY - 4} width="13" height="9" rx="3" fill="#11151f" />
          <line x1="49" y1={eyeY} x2="51" y2={eyeY} stroke="#11151f" strokeWidth="2.5" />
          <line x1="36" y1={eyeY - 2} x2="30" y2={eyeY - 3} stroke="#11151f" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="64" y1={eyeY - 2} x2="70" y2={eyeY - 3} stroke="#11151f" strokeWidth="2.5" strokeLinecap="round" />
          {/* accent glare */}
          <line
            x1="38"
            y1={eyeY - 2}
            x2="44"
            y2={eyeY + 2}
            stroke={accent}
            strokeWidth="1.4"
            opacity="0.5"
          />
        </g>
      );
    default:
      return null;
  }
}
