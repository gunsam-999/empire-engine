// ============================================================================
// MarketingScreen — the marketing command center (major new hub).
//
// Layout:
//   • Sticky header: big animated Reach (📣) headline, audience + followers,
//     reach/sec, and the live marketing income multiplier rendered as
//     "+X% sales from marketing" (getMarketingMult).
//   • Campaigns row: launchable temporary reach pushes (MARKETING_CAMPAIGNS).
//     Live countdown + reach×N badge while one is active.
//   • One ChannelCard per MARKETING_CHANNELS channel: emoji/name/tagline,
//     current step + the NEXT real-life step, its cost (affordable-aware),
//     an UPGRADE button (MARKETING_UPGRADE), a step-progress bar, live reach
//     contribution (channelReachRate), MUST-HAVE badge for social/content,
//     the Content↔Social synergy flag, and an active toggle for upkeep
//     (paid) channels (MARKETING_TOGGLE).
//
// Live numbers use AnimatedCounter; the screen re-renders on a light interval
// so per-second rates feel continuous between game ticks. Accent-themed,
// mobile-first (~380-480px). Reads everything via useGame() + re-exported
// selectors from GameContext. This file only.
// ============================================================================

import { useEffect, useState } from 'react';

import {
  useGame,
  MARKETING_CHANNELS,
  MARKETING_CAMPAIGNS,
  reachPerSec,
  followersPerSec,
  audiencePerSec,
  getMarketingMult,
  getChannel,
  channelStepCost,
  channelHasNext,
  channelReachRate,
  hasSocialContentSynergy,
  paidUpkeepPerSec,
  campaignActive,
} from '../../game/GameContext';
import type { GameState } from '../../game/types';
import type { MarketingChannel, MarketingCampaign } from '../../data/marketing';
import { formatMoney, formatNumber } from '../../utils/bigNumber';
import AnimatedCounter from '../shared/AnimatedCounter';

type Dispatch = ReturnType<typeof useGame>['dispatch'];

// ---- Per-kind accent tinting for the channel icon badge --------------------

const KIND_TONE: Record<MarketingChannel['kind'], string> = {
  social: '#60a5fa',
  content: '#34d399',
  paid: '#fbbf24',
  email: '#a78bfa',
  influencer: '#f472b6',
  community: '#22d3ee',
};

// ---- Currency formatting helper --------------------------------------------

function costLabel(cost: number, currency: 'cash' | 'influence'): string {
  if (!Number.isFinite(cost)) return '—';
  return currency === 'influence'
    ? `${formatNumber(cost)} 🤝`
    : formatMoney(cost, '$');
}

// ============================================================================
// Screen
// ============================================================================

export default function MarketingScreen() {
  const { state, dispatch } = useGame();

  // Light re-render tick so per-second rates + countdowns feel alive between
  // the game loop's own re-renders. Cheap; no setState storm (250ms).
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => (n + 1) & 0xffff), 250);
    return () => clearInterval(t);
  }, []);

  const m = state.marketing;
  const rps = reachPerSec(state);
  const fps = followersPerSec(state);
  const aps = audiencePerSec(state);
  const mult = getMarketingMult(state);
  const upkeep = paidUpkeepPerSec(state);
  const synergy = hasSocialContentSynergy(state);

  // "+X% sales from marketing" — mult is 1.0 at zero audience. Pass a FRACTION;
  // the AnimatedCounter's percent mode multiplies by 100 for display.
  const salesPct = Math.max(0, mult - 1);

  // Must-have nudge: any must-have channel still at level 0.
  const missingMustHave = MARKETING_CHANNELS.some(
    (ch) => ch.mustHave && getChannel(state, ch.id).level <= 0
  );

  return (
    <div className="max-w-[480px] mx-auto min-h-screen relative">
      {/* ===================== Sticky header ===================== */}
      <header className="sticky top-0 z-20 px-4 pt-3 pb-3 bg-[#070b12]/85 backdrop-blur-md border-b border-[#232c3e]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span>📣</span>
              <span className="uppercase tracking-wider">Total Reach</span>
            </div>
            <div className="text-3xl font-bold leading-tight">
              <AnimatedCounter value={m.reach} className="text-[#e7ecf5]" />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted">Reach</div>
            <div className="text-[15px] font-mono font-semibold text-[var(--accent)] tabular-nums">
              +<AnimatedCounter value={rps} />
              <span className="text-muted font-normal">/s</span>
            </div>
          </div>
        </div>

        {/* Secondary metric strip */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Metric label="Audience" icon="👥" value={formatNumber(m.audience)} sub={`+${formatNumber(aps)}/s`} tone="accent" />
          <Metric label="Followers" icon="❤️" value={formatNumber(m.followers)} sub={`+${formatNumber(fps)}/s`} />
          <Metric label="Brand" icon="⭐" value={`×${(state.marketing.brand ?? 1).toFixed(2)}`} />
        </div>

        {/* Marketing income multiplier — the payoff line. */}
        <div
          className="mt-2 flex items-center justify-between rounded-xl border px-3 py-1.5"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent) 45%, #232c3e)',
            background: 'color-mix(in srgb, var(--accent) 10%, #0e1420)',
          }}
        >
          <span className="text-[11px] text-muted flex items-center gap-1.5">
            <span>💰</span> Sales boost from marketing
          </span>
          <span className="text-[14px] font-mono font-bold tabular-nums text-good">
            +
            <AnimatedCounter value={salesPct} decimals={1} mode="percent" suffix="" />
          </span>
        </div>
      </header>

      {/* Scroll content (pb so the bottom nav never covers it) */}
      <div className="px-4 pt-3 pb-28 space-y-4">
        {/* ===================== Coaching nudge ===================== */}
        {missingMustHave && (
          <div
            className="rounded-2xl border p-3 flex items-start gap-2"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent) 50%, transparent)',
              background: 'color-mix(in srgb, var(--accent) 9%, #151c2b)',
            }}
          >
            <span className="text-lg leading-none mt-0.5">🚀</span>
            <div className="text-[12px] leading-snug">
              <span className="font-semibold text-[var(--accent)]">Start here.</span>{' '}
              <span className="text-muted">
                Get <span className="text-[#e7ecf5] font-medium">Social</span> and{' '}
                <span className="text-[#e7ecf5] font-medium">Content</span> off the ground — they
                snowball and unlock a powerful synergy together.
              </span>
            </div>
          </div>
        )}

        {/* ===================== Campaigns ===================== */}
        <section>
          <SectionHeader
            title="Campaigns"
            hint="Temporary reach blitzes — spend to multiply every channel."
          />
          <CampaignBar state={state} dispatch={dispatch} />
        </section>

        {/* ===================== Channels ===================== */}
        <section>
          <SectionHeader
            title="Growth Channels"
            hint="Each step is a real marketing move. Level up the ladder."
            right={
              upkeep > 0 ? (
                <span className="text-[10px] font-mono text-warn">
                  −{formatMoney(upkeep, '$')}/s ad spend
                </span>
              ) : undefined
            }
          />
          <div className="space-y-2.5">
            {MARKETING_CHANNELS.map((ch) => (
              <ChannelCard
                key={ch.id}
                ch={ch}
                state={state}
                dispatch={dispatch}
                synergy={synergy}
              />
            ))}
          </div>
        </section>

        <p className="text-center text-[10px] text-muted mt-6 leading-snug">
          📣 Reach → 👥 Audience → 💰 Sales. Audience compounds your income —
          keep the flywheel spinning.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Campaign bar
// ============================================================================

function CampaignBar({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const now = Date.now();
  const active = campaignActive(state, now);
  const camp = state.marketing.campaign;
  const remainingMs = camp ? Math.max(0, camp.endsAt - now) : 0;

  return (
    <div>
      {/* Active campaign banner with live countdown */}
      {active && camp && (
        <div
          className="mb-2 rounded-2xl border p-3 flex items-center gap-3 overflow-hidden relative"
          style={{
            borderColor: 'var(--accent)',
            background: 'color-mix(in srgb, var(--accent) 14%, #151c2b)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              background:
                'radial-gradient(70% 120% at 100% 0%, color-mix(in srgb, var(--accent) 70%, transparent), transparent 70%)',
            }}
          />
          <span className="text-2xl relative">{campaignEmoji(camp.id)}</span>
          <div className="relative min-w-0 flex-1">
            <div className="text-[13px] font-bold text-[#e7ecf5] truncate">{camp.name}</div>
            <div className="text-[11px] text-[var(--accent)] font-mono font-semibold">
              reach ×{camp.reachMult.toFixed(1)} · all channels boosted
            </div>
          </div>
          <div className="relative text-right shrink-0">
            <div className="text-[9px] uppercase tracking-wider text-muted">Ends in</div>
            <div className="text-[16px] font-mono font-bold tabular-nums text-[var(--accent)]">
              {formatCountdown(remainingMs)}
            </div>
          </div>
        </div>
      )}

      {/* Launch buttons */}
      <div className="grid grid-cols-2 gap-2">
        {MARKETING_CAMPAIGNS.map((c) => (
          <CampaignButton
            key={c.id}
            camp={c}
            state={state}
            dispatch={dispatch}
            blocked={active}
          />
        ))}
      </div>
    </div>
  );
}

function CampaignButton({
  camp,
  state,
  dispatch,
  blocked,
}: {
  camp: MarketingCampaign;
  state: GameState;
  dispatch: Dispatch;
  blocked: boolean;
}) {
  const have = camp.costCurrency === 'cash' ? state.cash : state.influence;
  const affordable = have >= camp.cost;
  const disabled = blocked || !affordable;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => dispatch({ type: 'MARKETING_CAMPAIGN', id: camp.id })}
      className="text-left rounded-2xl border p-2.5 transition-all active:scale-95 disabled:active:scale-100"
      style={{
        borderColor: !disabled
          ? 'color-mix(in srgb, var(--accent) 45%, #232c3e)'
          : '#232c3e',
        background: !disabled
          ? 'color-mix(in srgb, var(--accent) 8%, #151c2b)'
          : '#0e1420',
        opacity: blocked ? 0.45 : affordable ? 1 : 0.6,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-base">{camp.emoji}</span>
        <span className="text-[12px] font-semibold text-[#e7ecf5] leading-tight truncate">
          {camp.name}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)]">
          reach ×{camp.reachMult.toFixed(1)}
        </span>
        <span className="text-[10px] font-mono text-muted">{camp.durationSec}s</span>
      </div>
      <div
        className="mt-1 text-[11px] font-mono font-semibold tabular-nums"
        style={{ color: affordable ? '#34d399' : '#8a94a8' }}
      >
        {costLabel(camp.cost, camp.costCurrency)}
      </div>
    </button>
  );
}

// ============================================================================
// Channel card
// ============================================================================

function ChannelCard({
  ch,
  state,
  dispatch,
  synergy,
}: {
  ch: MarketingChannel;
  state: GameState;
  dispatch: Dispatch;
  synergy: boolean;
}) {
  const cs = getChannel(state, ch.id);
  const level = cs.level;
  const totalSteps = ch.steps.length;
  const maxed = level >= totalSteps;
  const hasNext = channelHasNext(state, ch.id);

  const nextStep = ch.steps[level]; // undefined when maxed
  const currentStep = level > 0 ? ch.steps[level - 1] : undefined;

  const cost = channelStepCost(state, ch.id);
  const currency = ch.costCurrency;
  const have = currency === 'cash' ? state.cash : state.influence;
  const affordable = hasNext && Number.isFinite(cost) && have >= cost;

  const reachContribution = channelReachRate(state, ch.id);

  // Paid / upkeep channels can be toggled active/paused.
  const isUpkeep = !!ch.upkeepPerSec;
  const paused = isUpkeep && level > 0 && !cs.active;

  // Synergy applies to BOTH social and content when both have a level.
  const showSynergy = synergy && (ch.kind === 'social' || ch.kind === 'content');

  const tone = KIND_TONE[ch.kind];
  const isOwned = level > 0;

  const [flashing, setFlashing] = useState(false);
  function upgrade() {
    if (!affordable) return;
    dispatch({ type: 'MARKETING_UPGRADE', channelId: ch.id });
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 200);
  }

  return (
    <div
      className="rounded-2xl border bg-[#151c2b] p-3 transition-all duration-150"
      style={{
        borderColor: isOwned ? '#232c3e' : '#1a2130',
        ...(flashing
          ? {
              boxShadow:
                '0 0 0 1px var(--accent), 0 0 22px -4px color-mix(in srgb, var(--accent) 70%, transparent)',
            }
          : {}),
      }}
    >
      {/* Header row: icon + name + reach contribution */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl border"
          style={{
            borderColor: isOwned ? tone : '#232c3e',
            background: isOwned
              ? `color-mix(in srgb, ${tone} 16%, #0e1420)`
              : '#0e1420',
          }}
        >
          {ch.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-[14px] leading-tight">{ch.name}</span>
            {ch.mustHave && (
              <span
                className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                style={{
                  color: '#fbbf24',
                  background: 'color-mix(in srgb, #fbbf24 16%, transparent)',
                }}
              >
                Must-have
              </span>
            )}
            {paused && (
              <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-bad bg-[color:color-mix(in_srgb,#f87171_16%,transparent)]">
                Paused
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted leading-snug mt-0.5">{ch.tagline}</div>
        </div>

        {/* Live reach contribution */}
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase tracking-wider text-muted">Reach</div>
          <div
            className="text-[13px] font-mono font-bold tabular-nums"
            style={{ color: reachContribution > 0 ? '#34d399' : '#8a94a8' }}
          >
            {reachContribution > 0 ? '+' : ''}
            <AnimatedCounter value={reachContribution} suffix="/s" />
          </div>
        </div>
      </div>

      {/* Synergy badge */}
      {showSynergy && (
        <div
          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold"
          style={{
            color: 'var(--accent)',
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          }}
        >
          ⚡ Content × Social synergy active · +25% social reach
        </div>
      )}

      {/* Step progress */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-muted font-mono">
            Step {level}/{totalSteps}
          </span>
          {currentStep && (
            <span className="text-[#e7ecf5] font-medium truncate ml-2">
              ✓ {currentStep.name}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {ch.steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background:
                  i < level
                    ? 'var(--accent)'
                    : i === level
                      ? 'color-mix(in srgb, var(--accent) 30%, #232c3e)'
                      : '#232c3e',
              }}
            />
          ))}
        </div>
      </div>

      {/* Next step + upgrade / toggle row */}
      <div className="mt-3 flex items-stretch gap-2">
        {maxed ? (
          <div className="flex-1 rounded-xl border border-[#232c3e] bg-[#0e1420] px-3 py-2 flex items-center justify-center">
            <span className="text-[11px] font-semibold text-good">✓ Fully scaled</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={upgrade}
            disabled={!affordable}
            className="flex-1 text-left rounded-xl px-3 py-2 transition-transform active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed"
            style={{
              background: affordable
                ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, white 8%), var(--accent))'
                : '#0e1420',
              border: affordable ? 'none' : '1px solid #232c3e',
              color: affordable ? '#070b12' : '#8a94a8',
              boxShadow: affordable
                ? '0 4px 14px -6px color-mix(in srgb, var(--accent) 70%, transparent)'
                : 'none',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wide opacity-80">
                  {level === 0 ? 'Unlock' : 'Next step'}
                </div>
                <div className="text-[12px] font-semibold leading-tight truncate">
                  {nextStep?.name}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[12px] font-mono font-bold tabular-nums">
                  {costLabel(cost, currency)}
                </div>
              </div>
            </div>
            {nextStep?.desc && (
              <div
                className="text-[10px] leading-snug mt-0.5 truncate"
                style={{ color: affordable ? 'rgba(7,11,18,0.7)' : '#8a94a8' }}
              >
                {nextStep.desc}
              </div>
            )}
          </button>
        )}

        {/* Active toggle for upkeep (paid) channels */}
        {isUpkeep && level > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'MARKETING_TOGGLE', channelId: ch.id })}
            aria-pressed={cs.active}
            aria-label={`Toggle ${ch.name}`}
            className="shrink-0 w-[58px] rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
            style={{
              borderColor: cs.active ? 'var(--accent)' : '#232c3e',
              background: cs.active
                ? 'color-mix(in srgb, var(--accent) 16%, #0e1420)'
                : '#0e1420',
            }}
          >
            <span className="text-[9px] uppercase tracking-wider text-muted">
              {cs.active ? 'On' : 'Off'}
            </span>
            <div
              className="relative h-5 w-9 rounded-full transition-colors"
              style={{ background: cs.active ? 'var(--accent)' : '#232c3e' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                style={{ left: cs.active ? '18px' : '2px' }}
              />
            </div>
          </button>
        )}
      </div>

      {/* Upkeep cost note for paid channels */}
      {isUpkeep && ch.upkeepPerSec && (
        <div className="mt-2 text-[10px] text-muted leading-snug">
          💸 Costs{' '}
          <span className="font-mono text-warn">{formatMoney(ch.upkeepPerSec, '$')}/s</span> while
          running — reach stops the moment you pause or run out of cash.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Small shared bits
// ============================================================================

function Metric({
  label,
  icon,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  icon: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'accent';
}) {
  const valueCls = tone === 'accent' ? 'text-[var(--accent)]' : 'text-[#e7ecf5]';
  return (
    <div className="rounded-xl bg-[#0e1420] border border-[#232c3e] py-1.5 px-1">
      <div className="text-[9px] uppercase tracking-wider text-muted flex items-center justify-center gap-1">
        <span>{icon}</span>
        {label}
      </div>
      <div className={`text-[13px] font-mono font-semibold tabular-nums ${valueCls}`}>{value}</div>
      {sub && <div className="text-[9px] font-mono text-muted">{sub}</div>}
    </div>
  );
}

function SectionHeader({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-2">
      <div className="min-w-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--accent)]">
          {title}
        </h2>
        {hint && <p className="text-[11px] text-muted leading-snug mt-0.5">{hint}</p>}
      </div>
      {right && <div className="shrink-0 ml-2">{right}</div>}
    </div>
  );
}

// ---- countdown / emoji helpers ---------------------------------------------

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return mm > 0 ? `${mm}:${ss.toString().padStart(2, '0')}` : `${ss}s`;
}

function campaignEmoji(id: string): string {
  return MARKETING_CAMPAIGNS.find((c) => c.id === id)?.emoji ?? '🚀';
}
