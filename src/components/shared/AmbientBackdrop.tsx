// ============================================================================
// AmbientBackdrop — the living atmosphere behind the whole app.
//
// A fixed, pointer-transparent layer of slow-drifting aurora blobs tinted from
// the empire's accent palette. It is not decoration for its own sake: it reads
// the game's *mood* and *era* and breathes with them —
//   • Era (director phase) raises the ambient intensity and pulls a warmer,
//     more golden cast as you climb BOOTSTRAPPING → TITAN.
//   • Market mood tints the top glow: green-gold on a boom, cold red on a crash.
//   • A soft top-down "spotlight" anchors the composition under the TopBar.
//
// Performance contract (mirrors LiveEmpireView): only 4 blurred elements, all
// animated purely via CSS transform/opacity keyframes declared once. Nothing
// re-renders per game tick — the component reads coarse, bucketed inputs so React
// bails out between meaningful state changes. Honors reduce-motion by freezing
// the drift to a static (still gorgeous) gradient.
// ============================================================================

import { useGame } from '../../game/GameContext';
import { getPalette, withAlpha, mixHex } from '../../utils/palette';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { DirectorPhase } from '../../game/types';

// Era → ambient intensity (0..1) and a "warmth" pull toward gold as you ascend.
const ERA_INTENSITY: Record<DirectorPhase, number> = {
  BOOTSTRAPPING: 0.4,
  GROWING: 0.55,
  SCALING: 0.7,
  ESTABLISHED: 0.85,
  TITAN: 1,
};
const ERA_WARMTH: Record<DirectorPhase, number> = {
  BOOTSTRAPPING: 0,
  GROWING: 0.08,
  SCALING: 0.16,
  ESTABLISHED: 0.26,
  TITAN: 0.4,
};

const GOLD = '#fbbf24';
const BOOM = '#34d399';
const CRASH = '#f87171';

export default function AmbientBackdrop() {
  const { state } = useGame();
  const reduce = useReducedMotion();

  const accent = state.setup?.accent ?? '#6366f1';
  const phase: DirectorPhase = state.director?.currentPhase ?? 'BOOTSTRAPPING';
  const price = state.market?.priceMul ?? 1;

  const pal = getPalette(accent);
  const intensity = ERA_INTENSITY[phase];
  const warmth = ERA_WARMTH[phase];

  // Warm the palette toward gold as the empire matures.
  const warm = (hex: string) => (warmth > 0 ? mixHex(hex, GOLD, warmth) : hex);
  const aAccent = warm(pal.accent);
  const aSecondary = warm(pal.secondary);

  // Market mood tints the top spotlight.
  const mood: 'boom' | 'crash' | 'steady' =
    price >= 1.12 ? 'boom' : price <= 0.9 ? 'crash' : 'steady';
  const spotlight =
    mood === 'boom'
      ? mixHex(aAccent, BOOM, 0.45)
      : mood === 'crash'
        ? mixHex(aAccent, CRASH, 0.4)
        : aAccent;

  // Opacity scales with era so the early game feels lean and the late game lush.
  const baseOpacity = (lo: number, hi: number) => lo + (hi - lo) * intensity;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 mx-auto max-w-[480px] overflow-hidden"
      aria-hidden
    >
      {!reduce && <BackdropStyles />}

      {/* Base wash so blobs have something to sit over (matches page). */}
      <div className="absolute inset-0 bg-[#070b12]" />

      {/* Top spotlight under the TopBar — the anchor of the composition. */}
      <div
        className="absolute -top-24 left-1/2 h-[340px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, ${withAlpha(
            spotlight,
            baseOpacity(0.1, 0.26)
          )}, transparent 72%)`,
        }}
      />

      {/* Drifting aurora blob — accent, lower-left. */}
      <div
        className={reduce ? '' : 'ab-blob ab-blob-a'}
        style={{
          position: 'absolute',
          left: '-18%',
          top: '46%',
          height: 360,
          width: 360,
          borderRadius: '50%',
          filter: 'blur(64px)',
          background: `radial-gradient(closest-side, ${withAlpha(
            aAccent,
            baseOpacity(0.12, 0.3)
          )}, transparent 70%)`,
        }}
      />

      {/* Drifting aurora blob — secondary, upper-right. */}
      <div
        className={reduce ? '' : 'ab-blob ab-blob-b'}
        style={{
          position: 'absolute',
          right: '-22%',
          top: '8%',
          height: 320,
          width: 320,
          borderRadius: '50%',
          filter: 'blur(64px)',
          background: `radial-gradient(closest-side, ${withAlpha(
            aSecondary,
            baseOpacity(0.1, 0.26)
          )}, transparent 70%)`,
        }}
      />

      {/* Deep anchor blob — bottom, grounds the scene. */}
      <div
        className={reduce ? '' : 'ab-blob ab-blob-c'}
        style={{
          position: 'absolute',
          left: '30%',
          bottom: '-26%',
          height: 360,
          width: 420,
          borderRadius: '50%',
          filter: 'blur(72px)',
          background: `radial-gradient(closest-side, ${withAlpha(
            pal.deep,
            baseOpacity(0.16, 0.34)
          )}, transparent 72%)`,
        }}
      />

      {/* Vignette to focus the column and keep text crisp. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 30%, transparent 50%, rgba(4,7,13,0.55) 100%)',
        }}
      />
    </div>
  );
}

// ---- One-time CSS keyframes (scoped class names, declared once) -------------

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
      .ab-blob { will-change: transform; }
      .ab-blob-a { animation: ab-drift-a 26s ease-in-out infinite; }
      .ab-blob-b { animation: ab-drift-b 32s ease-in-out infinite; }
      .ab-blob-c { animation: ab-drift-c 38s ease-in-out infinite; }
    `}</style>
  );
}
