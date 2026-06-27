// ============================================================================
// AmbientBackdrop — the living atmosphere behind the whole app.
//
// Four-layer aurora system driven by the industry's 3-layer color identity:
//   Layer 0: Industry deep-base radial — bleeds the industry's very dark tint
//             into the page background so the whole world feels distinctly theirs.
//   Layer 1: Top spotlight — accent under the TopBar, mood-reactive.
//   Layer 2+3: Drifting aurora blobs — accent + secondary, era-intensity scaled.
//   Layer 4: Deep anchor blob — grounds the composition.
//
// Performance contract: only CSS keyframe animations, zero per-tick re-renders.
// Reads coarse, bucketed inputs so React bails out between meaningful changes.
// Honors reduce-motion by freezing drift to a static (still beautiful) gradient.
// ============================================================================

import { useGame } from '../../game/GameContext';
import { getPalette, getIndustryLayers, withAlpha, mixHex } from '../../utils/palette';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { DirectorPhase } from '../../game/types';

const ERA_INTENSITY: Record<DirectorPhase, number> = {
  BOOTSTRAPPING: 0.4,
  GROWING:       0.55,
  SCALING:       0.7,
  ESTABLISHED:   0.85,
  TITAN:         1,
};
const ERA_WARMTH: Record<DirectorPhase, number> = {
  BOOTSTRAPPING: 0,
  GROWING:       0.08,
  SCALING:       0.16,
  ESTABLISHED:   0.26,
  TITAN:         0.4,
};

const GOLD  = '#fbbf24';
const BOOM  = '#34d399';
const CRASH = '#f87171';

export default function AmbientBackdrop() {
  const { state } = useGame();
  const reduce = useReducedMotion();

  const accent = state.setup?.accent ?? '#6366f1';
  const phase: DirectorPhase = state.director?.currentPhase ?? 'BOOTSTRAPPING';
  const price = state.market?.priceMul ?? 1;

  const pal    = getPalette(accent);
  const layers = getIndustryLayers(accent);

  const intensity = ERA_INTENSITY[phase];
  const warmth    = ERA_WARMTH[phase];

  const warm = (hex: string) => (warmth > 0 ? mixHex(hex, GOLD, warmth) : hex);
  const aAccent    = warm(pal.accent);
  const aSecondary = warm(pal.secondary);

  const mood: 'boom' | 'crash' | 'steady' =
    price >= 1.12 ? 'boom' : price <= 0.9 ? 'crash' : 'steady';
  const spotlight =
    mood === 'boom'  ? mixHex(aAccent, BOOM,  0.45)
    : mood === 'crash' ? mixHex(aAccent, CRASH, 0.40)
    : aAccent;

  const baseOpacity = (lo: number, hi: number) => lo + (hi - lo) * intensity;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 mx-auto max-w-[480px] overflow-hidden"
      aria-hidden
    >
      {!reduce && <BackdropStyles />}

      {/* Page base */}
      <div className="absolute inset-0 bg-[#070b12]" />

      {/* Layer 0: Industry deep-base radial — entire world is tinted by the
          player's chosen industry. Very subtle; makes each empire feel owned. */}
      <div
        className={reduce ? '' : 'ab-blob ab-blob-d'}
        style={{
          position:     'absolute',
          left:         '-10%',
          top:          '20%',
          height:       480,
          width:        520,
          borderRadius: '50%',
          filter:       'blur(80px)',
          background: `radial-gradient(closest-side, ${withAlpha(
            layers.deepBase,
            baseOpacity(0.18, 0.42)
          )}, transparent 72%)`,
        }}
      />

      {/* Top spotlight */}
      <div
        className="absolute -top-24 left-1/2 h-[340px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, ${withAlpha(
            spotlight,
            baseOpacity(0.10, 0.26)
          )}, transparent 72%)`,
        }}
      />

      {/* Drifting aurora — accent, lower-left */}
      <div
        className={reduce ? '' : 'ab-blob ab-blob-a'}
        style={{
          position:     'absolute',
          left:         '-18%',
          top:          '46%',
          height:       360,
          width:        360,
          borderRadius: '50%',
          filter:       'blur(64px)',
          background: `radial-gradient(closest-side, ${withAlpha(
            aAccent,
            baseOpacity(0.12, 0.30)
          )}, transparent 70%)`,
        }}
      />

      {/* Drifting aurora — secondary, upper-right */}
      <div
        className={reduce ? '' : 'ab-blob ab-blob-b'}
        style={{
          position:     'absolute',
          right:        '-22%',
          top:          '8%',
          height:       320,
          width:        320,
          borderRadius: '50%',
          filter:       'blur(64px)',
          background: `radial-gradient(closest-side, ${withAlpha(
            aSecondary,
            baseOpacity(0.10, 0.26)
          )}, transparent 70%)`,
        }}
      />

      {/* Deep anchor blob — bottom */}
      <div
        className={reduce ? '' : 'ab-blob ab-blob-c'}
        style={{
          position:     'absolute',
          left:         '30%',
          bottom:       '-26%',
          height:       360,
          width:        420,
          borderRadius: '50%',
          filter:       'blur(72px)',
          background: `radial-gradient(closest-side, ${withAlpha(
            pal.deep,
            baseOpacity(0.16, 0.34)
          )}, transparent 72%)`,
        }}
      />

      {/* Vignette to focus the column and keep text crisp */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 30%, transparent 50%, rgba(4,7,13,0.60) 100%)',
        }}
      />
    </div>
  );
}

function BackdropStyles() {
  return (
    <style>{`
      @keyframes ab-drift-a {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50%      { transform: translate3d(28px, -34px, 0) scale(1.12); }
      }
      @keyframes ab-drift-b {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1.05); }
        50%      { transform: translate3d(-30px, 26px, 0) scale(0.92); }
      }
      @keyframes ab-drift-c {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
        50%      { transform: translate3d(-24px, -20px, 0) scale(1.1); opacity: 1; }
      }
      @keyframes ab-drift-d {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50%      { transform: translate3d(16px, 12px, 0) scale(1.06); }
      }
      .ab-blob   { will-change: transform; }
      .ab-blob-a { animation: ab-drift-a 26s ease-in-out infinite; }
      .ab-blob-b { animation: ab-drift-b 32s ease-in-out infinite; }
      .ab-blob-c { animation: ab-drift-c 38s ease-in-out infinite; }
      .ab-blob-d { animation: ab-drift-d 44s ease-in-out infinite; }
    `}</style>
  );
}
