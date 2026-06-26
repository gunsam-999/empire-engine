// ============================================================================
// LiveEmpireView — a state-driven, animated SVG micro-world of the business
// growing in real time. Buildings rise per tier as facilities are bought,
// reach-waves ripple from HQ at a rate tied to reachPerSec, money particles
// float up at a rate tied to incomePerSec, workers/customers move along paths,
// social hearts drift up when the social channel is active, market mood tints
// the sky, and prestige adds a glow/aura.
//
// Performance contract:
//   • Everything animates via CSS keyframes (declared once in a <style> tag).
//   • Element COUNTS are derived from state and memoized, so React only
//     re-renders the SVG structure when those derived counts change — not every
//     game tick. No per-frame setState. Total animated elements are capped
//     (~40-60) regardless of empire size.
// ============================================================================

import { useMemo } from 'react';

import { useGame } from '../../game/GameContext';
import {
  getIndustry,
  incomePerSec,
  marketPrice,
  reachPerSec,
  tierUnlocked,
  getChannel,
} from '../../game/GameContext';
import type { GameState } from '../../game/types';

// ---- Tuning constants ------------------------------------------------------

const VB_W = 380;
const VB_H = 300;
const GROUND_Y = 232; // baseline buildings sit on
const MAX_BUILDINGS_PER_TIER = 7;
const MAX_WORKERS = 12;
const MAX_COINS = 10;
const MAX_WAVES = 4;
const MAX_HEARTS = 6;

// HQ anchor (where reach-waves emanate from).
const HQ_X = 40;
const HQ_Y = GROUND_Y;

// ---- Derived shape (memoized; only changes when these inputs change) --------

interface TierBlock {
  tier: number;
  count: number; // buildings drawn for this tier (0..MAX_BUILDINGS_PER_TIER)
  owned: number; // facilities owned in the tier
}

interface SceneModel {
  tiers: TierBlock[];
  totalBuildings: number;
  workerCount: number;
  coinCount: number;
  waveCount: number;
  heartCount: number;
  mood: 'boom' | 'crash' | 'normal';
  prestige: number;
  socialActive: boolean;
  hasEmpire: boolean;
}

/** Count facilities owned in a tier using the `${industry}-t${tier}-${slot}` id. */
function ownedInTier(state: GameState, industryId: string, tier: number): number {
  let sum = 0;
  const prefix = `${industryId}-t${tier}-`;
  for (const [id, n] of Object.entries(state.facilities)) {
    if (id.startsWith(prefix)) sum += n;
  }
  return sum;
}

/** Map a per-second magnitude onto a small discrete element count via log scale. */
function densityFromRate(rate: number, max: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  // log10(1+rate) grows slowly; scale so a healthy economy fills the cap.
  const d = Math.round(Math.log10(1 + rate) * 2.2);
  return Math.max(1, Math.min(max, d));
}

/** Buildings for a tier scale with sqrt(owned) so early buys feel impactful. */
function buildingsForOwned(owned: number): number {
  if (owned <= 0) return 0;
  const n = Math.round(Math.sqrt(owned) * 1.3);
  return Math.max(1, Math.min(MAX_BUILDINGS_PER_TIER, n));
}

// ---- Component -------------------------------------------------------------

export default function LiveEmpireView({ className = '' }: { className?: string }) {
  const { state } = useGame();
  const industry = getIndustry(state);

  const income = incomePerSec(state);
  const reach = reachPerSec(state);
  const price = marketPrice(state);
  const prestige = state.prestigeCount;
  const accent = state.setup?.accent ?? '#34d399';

  // Build the discrete scene model. Recomputes only when the *derived* inputs
  // change (counts, not the raw continuously-rising cash), so the SVG is stable
  // and CSS animations run uninterrupted between buys.
  const model = useMemo<SceneModel>(() => {
    const industryId = industry?.id ?? '';
    const tiers: TierBlock[] = [1, 2, 3, 4, 5].map((tier) => {
      const owned = industryId ? ownedInTier(state, industryId, tier) : 0;
      const unlocked = tierUnlocked(state, tier);
      const count = unlocked ? buildingsForOwned(owned) : 0;
      return { tier, count, owned };
    });
    const totalBuildings = tiers.reduce((s, t) => s + t.count, 0);

    const mood: SceneModel['mood'] =
      price >= 1.12 ? 'boom' : price <= 0.9 ? 'crash' : 'normal';

    const socialState = getChannel(state, 'social');
    const socialActive = socialState.level > 0;

    // Activity density scales with the live economy but is capped.
    const workerCount = Math.min(
      MAX_WORKERS,
      Math.max(totalBuildings > 0 ? 2 : 0, Math.round(totalBuildings * 0.9))
    );
    const coinCount = densityFromRate(income, MAX_COINS);
    const waveCount = Math.min(MAX_WAVES, densityFromRate(reach, MAX_WAVES));
    const heartCount = socialActive ? densityFromRate(reach + 5, MAX_HEARTS) : 0;

    return {
      tiers,
      totalBuildings,
      workerCount,
      coinCount,
      waveCount,
      heartCount,
      mood,
      prestige,
      socialActive,
      hasEmpire: totalBuildings > 0,
    };
    // Buckets to coarse integers so continuous cash/income jitter doesn't churn
    // the model. income/reach are bucketed via the density helpers already, but
    // include their *bucketed* forms in deps to avoid re-render storms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    industry?.id,
    // tier counts: stringify the cheap derived counts
    state.facilities,
    state.prestigeCount,
    price >= 1.12,
    price <= 0.9,
    getChannel(state, 'social').level,
    densityFromRate(income, MAX_COINS),
    Math.min(MAX_WAVES, densityFromRate(reach, MAX_WAVES)),
  ]);

  // Mood-driven sky + lighting.
  const sky = skyForMood(model.mood);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[#232c3e] bg-[#0e1420] ${className}`}
      style={{ ['--lev-accent' as string]: accent }}
    >
      <LiveStyles />

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        className="block"
        role="img"
        aria-label="Live view of your growing empire"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Sky gradient (mood) */}
          <linearGradient id="lev-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sky.top} />
            <stop offset="100%" stopColor={sky.bottom} />
          </linearGradient>
          {/* Accent glow for HQ + prestige aura */}
          <radialGradient id="lev-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lev-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={sky.sun} stopOpacity="0.9" />
            <stop offset="100%" stopColor={sky.sun} stopOpacity="0" />
          </radialGradient>
          <filter id="lev-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* ===== Sky ===== */}
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#lev-sky)" />

        {/* Sun/mood orb */}
        <circle cx={VB_W - 64} cy={56} r={64} fill="url(#lev-sun)" />

        {/* Stars (only in normal/crash, subtle) */}
        {model.mood !== 'boom' && <Stars />}

        {/* Prestige aura — a soft glow rising from the skyline when prestiged. */}
        {model.prestige > 0 && (
          <ellipse
            cx={VB_W / 2}
            cy={GROUND_Y}
            rx={VB_W * 0.62}
            ry={120}
            fill="url(#lev-glow)"
            opacity={Math.min(0.85, 0.28 + model.prestige * 0.12)}
            className="lev-aura"
          />
        )}

        {/* ===== Reach waves (from HQ) ===== */}
        {Array.from({ length: model.waveCount }).map((_, i) => (
          <circle
            key={`wave-${i}`}
            cx={HQ_X}
            cy={HQ_Y - 28}
            r={6}
            fill="none"
            stroke={accent}
            strokeWidth={1.5}
            className="lev-wave"
            style={{ animationDelay: `${(i / Math.max(1, model.waveCount)) * 2.4}s` }}
          />
        ))}

        {/* ===== Ground ===== */}
        <rect x="0" y={GROUND_Y} width={VB_W} height={VB_H - GROUND_Y} fill="#0b1018" />
        <rect x="0" y={GROUND_Y} width={VB_W} height="2" fill={accent} opacity="0.35" />

        {/* ===== Skyline (buildings per tier) ===== */}
        <Skyline model={model} accent={accent} />

        {/* ===== HQ tower (always present once there's an empire) ===== */}
        {model.hasEmpire && <HQ accent={accent} />}
        {model.hasEmpire && (
          <circle cx={HQ_X} cy={HQ_Y - 30} r={30} fill="url(#lev-glow)" className="lev-hqpulse" />
        )}

        {/* ===== Workers / customers moving along the street ===== */}
        {model.hasEmpire &&
          Array.from({ length: model.workerCount }).map((_, i) => (
            <Worker key={`w-${i}`} i={i} count={model.workerCount} accent={accent} />
          ))}

        {/* ===== Money particles (tied to incomePerSec) ===== */}
        {Array.from({ length: model.coinCount }).map((_, i) => (
          <Coin key={`c-${i}`} i={i} count={model.coinCount} />
        ))}

        {/* ===== Social hearts/likes (social channel active) ===== */}
        {Array.from({ length: model.heartCount }).map((_, i) => (
          <Heart key={`h-${i}`} i={i} count={model.heartCount} accent={accent} />
        ))}

        {/* Empty state */}
        {!model.hasEmpire && (
          <text
            x={VB_W / 2}
            y={GROUND_Y - 30}
            textAnchor="middle"
            fill="#8a94a8"
            fontSize="12"
            fontFamily="ui-monospace, monospace"
          >
            Build your first facility to bring the city to life
          </text>
        )}
      </svg>

      {/* Mood label chip */}
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#070b12]/70 px-2 py-0.5 text-[10px] font-mono text-muted backdrop-blur">
        <span>{moodIcon(model.mood)}</span>
        <span>{moodLabel(model.mood)}</span>
        {model.prestige > 0 && (
          <span className="text-[var(--accent)]">· ✦{model.prestige}</span>
        )}
      </div>
    </div>
  );
}

// ---- Skyline ---------------------------------------------------------------

function Skyline({ model, accent }: { model: SceneModel; accent: string }) {
  // Lay every building out left->right across the canvas (after the HQ zone),
  // grouped by tier. Taller/fancier buildings = higher tier.
  const buildings: {
    x: number;
    w: number;
    h: number;
    tier: number;
    key: string;
  }[] = [];

  const startX = 72; // leave room for HQ on the left
  const endX = VB_W - 14;
  const span = endX - startX;
  const total = model.totalBuildings;
  let drawn = 0;

  if (total > 0) {
    const slotW = span / total;
    for (const tb of model.tiers) {
      for (let b = 0; b < tb.count; b++) {
        const w = Math.min(34, 16 + tb.tier * 3.5);
        // Height grows with tier; a little per-building variance for life.
        const variance = (hashJitter(tb.tier * 13 + b * 7) - 0.5) * 12;
        const h = 26 + tb.tier * 22 + variance;
        const cx = startX + slotW * (drawn + 0.5);
        buildings.push({
          x: cx - w / 2,
          w,
          h: Math.max(20, h),
          tier: tb.tier,
          key: `b-${tb.tier}-${b}`,
        });
        drawn++;
      }
    }
  }

  return (
    <g>
      {buildings.map((bld) => {
        const tint = tierTint(bld.tier, accent);
        const y = GROUND_Y - bld.h;
        const litRows = Math.max(1, Math.floor(bld.h / 16));
        return (
          <g key={bld.key} className="lev-rise" style={{ transformOrigin: `${bld.x + bld.w / 2}px ${GROUND_Y}px` }}>
            {/* body */}
            <rect
              x={bld.x}
              y={y}
              width={bld.w}
              height={bld.h}
              rx={2}
              fill={tint.body}
              stroke={tint.edge}
              strokeWidth={1}
            />
            {/* accent roof cap on higher tiers */}
            {bld.tier >= 3 && (
              <rect x={bld.x} y={y} width={bld.w} height={4} fill={accent} opacity={0.8} />
            )}
            {/* antenna/spire on top tier */}
            {bld.tier >= 4 && (
              <line
                x1={bld.x + bld.w / 2}
                y1={y}
                x2={bld.x + bld.w / 2}
                y2={y - 10 - bld.tier}
                stroke={accent}
                strokeWidth={1.4}
              />
            )}
            {/* lit windows */}
            {Array.from({ length: litRows }).map((_, r) => {
              const wy = y + 6 + r * 12;
              if (wy > GROUND_Y - 6) return null;
              const on = hashJitter(bld.tier * 31 + r * 17 + bld.x) > 0.35;
              return (
                <rect
                  key={r}
                  x={bld.x + 3}
                  y={wy}
                  width={bld.w - 6}
                  height={3.5}
                  rx={1}
                  fill={on ? tint.window : '#0c1118'}
                  opacity={on ? 0.9 : 0.5}
                  className={on ? 'lev-window' : undefined}
                  style={on ? { animationDelay: `${(bld.x + r * 130) % 2600}ms` } : undefined}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

// ---- HQ tower --------------------------------------------------------------

function HQ({ accent }: { accent: string }) {
  const w = 26;
  const h = 92;
  const x = HQ_X - w / 2;
  const y = GROUND_Y - h;
  return (
    <g className="lev-rise">
      <rect x={x} y={y} width={w} height={h} rx={3} fill="#1a2336" stroke={accent} strokeWidth={1.4} />
      {/* roof beacon */}
      <rect x={x} y={y} width={w} height={5} fill={accent} />
      <circle cx={HQ_X} cy={y - 4} r={2.4} fill={accent} className="lev-beacon" />
      <line x1={HQ_X} y1={y} x2={HQ_X} y2={y - 12} stroke={accent} strokeWidth={1.4} />
      {/* big glowing logo window */}
      <rect x={x + 6} y={y + 14} width={w - 12} height={10} rx={2} fill={accent} opacity={0.85} className="lev-window" />
      {[0, 1, 2, 3].map((r) => (
        <rect
          key={r}
          x={x + 5}
          y={y + 32 + r * 13}
          width={w - 10}
          height={4}
          rx={1}
          fill={accent}
          opacity={0.55}
          className="lev-window"
          style={{ animationDelay: `${r * 420}ms` }}
        />
      ))}
    </g>
  );
}

// ---- Moving worker/customer dot --------------------------------------------

function Worker({ i, count, accent }: { i: number; count: number; accent: string }) {
  const y = GROUND_Y - 6 - (i % 3) * 4;
  const dur = 6 + (i % 5) * 1.6;
  const delay = (i / Math.max(1, count)) * dur;
  const isCustomer = i % 2 === 0;
  const fill = isCustomer ? accent : '#8a94a8';
  // alternate direction for variety
  const reverse = i % 3 === 0;
  return (
    <circle
      r={2.2}
      cy={y}
      fill={fill}
      className={reverse ? 'lev-walk-rev' : 'lev-walk'}
      style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}
    />
  );
}

// ---- Money particle --------------------------------------------------------

function Coin({ i, count }: { i: number; count: number }) {
  const x = 60 + ((i * 97) % (VB_W - 90));
  const dur = 2.6 + (i % 4) * 0.5;
  const delay = (i / Math.max(1, count)) * dur;
  return (
    <text
      x={x}
      y={GROUND_Y - 18}
      textAnchor="middle"
      fontSize="11"
      fontFamily="ui-monospace, monospace"
      fontWeight="700"
      fill="#34d399"
      className="lev-coin"
      style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}
    >
      +$
    </text>
  );
}

// ---- Social heart ----------------------------------------------------------

function Heart({ i, count, accent }: { i: number; count: number; accent: string }) {
  const x = 84 + ((i * 131) % (VB_W - 120));
  const dur = 3.4 + (i % 3) * 0.7;
  const delay = (i / Math.max(1, count)) * dur;
  const glyph = i % 2 === 0 ? '♥' : '✦';
  return (
    <text
      x={x}
      y={GROUND_Y - 40}
      textAnchor="middle"
      fontSize="12"
      fill={i % 2 === 0 ? '#f87171' : accent}
      className="lev-heart"
      style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}
    >
      {glyph}
    </text>
  );
}

// ---- Decorative stars ------------------------------------------------------

function Stars() {
  const pts = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        x: (i * 53 + 11) % VB_W,
        y: 12 + ((i * 37) % 90),
        r: 0.6 + (i % 3) * 0.4,
        d: (i % 5) * 0.6,
      })),
    []
  );
  return (
    <g>
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill="#e7ecf5"
          className="lev-star"
          style={{ animationDelay: `${p.d}s` }}
        />
      ))}
    </g>
  );
}

// ---- Mood + tint helpers ---------------------------------------------------

function skyForMood(mood: SceneModel['mood']) {
  switch (mood) {
    case 'boom':
      return { top: '#241c08', bottom: '#0e1420', sun: '#fbbf24' };
    case 'crash':
      return { top: '#1c0d10', bottom: '#0b0e16', sun: '#f87171' };
    default:
      return { top: '#0c1426', bottom: '#0a0f18', sun: '#3a4a6a' };
  }
}

function moodIcon(mood: SceneModel['mood']): string {
  return mood === 'boom' ? '🌅' : mood === 'crash' ? '🌑' : '🌆';
}
function moodLabel(mood: SceneModel['mood']): string {
  return mood === 'boom' ? 'Boom' : mood === 'crash' ? 'Downturn' : 'Steady';
}

/** Per-tier building palette: higher tiers are taller, fancier, accent-tinted. */
function tierTint(tier: number, accent: string) {
  const mix = Math.min(70, 8 + tier * 14);
  return {
    body: `color-mix(in srgb, ${accent} ${mix}%, #161d2c)`,
    edge: `color-mix(in srgb, ${accent} ${Math.min(85, mix + 15)}%, #232c3e)`,
    window: tier >= 3 ? accent : '#9fb4d8',
  };
}

/** Deterministic 0..1 jitter so the skyline is stable across renders. */
function hashJitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// ---- One-time CSS keyframes (declared inside the component subtree) ---------

function LiveStyles() {
  return (
    <style>{`
      @keyframes lev-rise-kf { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
      .lev-rise { animation: lev-rise-kf 600ms cubic-bezier(.16,1,.3,1) both; transform-box: fill-box; }

      @keyframes lev-wave-kf {
        0%   { r: 6; opacity: .55; }
        100% { r: 120; opacity: 0; }
      }
      .lev-wave { animation: lev-wave-kf 2.4s ease-out infinite; }

      @keyframes lev-coin-kf {
        0%   { transform: translateY(0); opacity: 0; }
        15%  { opacity: 1; }
        100% { transform: translateY(-46px); opacity: 0; }
      }
      .lev-coin { animation: lev-coin-kf linear infinite; }

      @keyframes lev-heart-kf {
        0%   { transform: translateY(0) scale(.7); opacity: 0; }
        20%  { opacity: 1; }
        100% { transform: translateY(-58px) scale(1.1); opacity: 0; }
      }
      .lev-heart { animation: lev-heart-kf ease-out infinite; }

      @keyframes lev-walk-kf {
        from { transform: translateX(70px); }
        to   { transform: translateX(${VB_W - 12}px); }
      }
      .lev-walk { animation: lev-walk-kf linear infinite; }
      @keyframes lev-walk-rev-kf {
        from { transform: translateX(${VB_W - 12}px); }
        to   { transform: translateX(70px); }
      }
      .lev-walk-rev { animation: lev-walk-rev-kf linear infinite; }

      @keyframes lev-window-kf { 0%,100% { opacity: .35; } 50% { opacity: .95; } }
      .lev-window { animation: lev-window-kf 2.6s ease-in-out infinite; }

      @keyframes lev-beacon-kf { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
      .lev-beacon { animation: lev-beacon-kf 1.4s ease-in-out infinite; }

      @keyframes lev-hqpulse-kf { 0%,100% { opacity: .35; } 50% { opacity: .7; } }
      .lev-hqpulse { animation: lev-hqpulse-kf 3s ease-in-out infinite; }

      @keyframes lev-aura-kf { 0%,100% { opacity: .25; } 50% { opacity: .55; } }
      .lev-aura { animation: lev-aura-kf 4.5s ease-in-out infinite; }

      @keyframes lev-star-kf { 0%,100% { opacity: .25; } 50% { opacity: .9; } }
      .lev-star { animation: lev-star-kf 3.2s ease-in-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .lev-rise, .lev-wave, .lev-coin, .lev-heart, .lev-walk, .lev-walk-rev,
        .lev-window, .lev-beacon, .lev-hqpulse, .lev-aura, .lev-star {
          animation: none !important;
        }
        .lev-rise { transform: none; opacity: 1; }
      }
    `}</style>
  );
}
