// ============================================================================
// TopBar  -  fixed header of the app frame. Shows who you are and what you have:
//   • Company name + industry emoji, with a level / prestige-tier badge.
//   • Primary cash with an AnimatedCounter and live per-second income.
//   • Reach 📣  -  the headline marketing metric (reach + audience subtitle).
//   • Secondary currencies: Insight 🔬, Influence 🤝, Legacy Points ♾️.
//   • Small icon buttons that open overlays:
//       Story 📖 (pulses when story.queue.length > 0)
//       Advisors 🃏
//       Territory 🗺️
//       Settings ⚙️
//
// The TopBar is presentational + reads from the game context. It does not own
// overlay state  -  it calls `onOpenOverlay(id)` so App can render the overlay.
// ============================================================================

import type { CSSProperties } from 'react';
import { useRef, useState } from 'react';
import {
  useGame,
  getIndustry,
  incomePerSec,
  insightPerSec,
  reachPerSec,
} from '../../game/GameContext';
import AnimatedCounter from '../shared/AnimatedCounter';
import { formatMoney, formatNumber } from '../../utils/bigNumber';
import { unreadCount } from '../../systems/NotificationEngine';

/** Header overlay buttons. App maps these to its overlay surfaces. */
export type OverlayId = 'story' | 'dispatch' | 'will' | 'rivals' | 'territory' | 'settings';

export interface TopBarProps {
  onOpenOverlay: (id: OverlayId) => void;
}

/** Prestige-tier label from how many shards/stars/rebirths the player holds. */
function prestigeBadge(state: ReturnType<typeof useGame>['state']): {
  label: string;
  emoji: string;
} {
  if (state.transcendShards > 0) return { label: 'Conglomerate', emoji: '💠' };
  if (state.masteryStars > 0) return { label: 'Public', emoji: '⭐' };
  if (state.prestigeCount > 0) return { label: `Rebirth ${state.prestigeCount}`, emoji: '♻️' };
  return { label: 'Founder', emoji: '🌱' };
}

interface CurrencyChipProps {
  icon: string;
  value: number;
  title: string;
  tone?: string;
}

function CurrencyChip({ icon, value, title, tone }: CurrencyChipProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-lg glass px-2 py-1"
      title={title}
    >
      <span className="text-xs leading-none" aria-hidden>
        {icon}
      </span>
      <AnimatedCounter
        value={value}
        mode="number"
        className={`text-xs ${tone ?? 'text-ink'}`}
      />
    </div>
  );
}

interface ReachChipProps {
  reach: number;
  audience: number;
  rate: number;
}

/**
 * Headline marketing metric. Reach (📣) is the big number; audience rides as a
 * subtitle so the player sees "people reached" and "loyal audience" at a glance.
 */
function ReachChip({ reach, audience, rate }: ReachChipProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg glass-active px-2 py-1"
      title={`Reach  -  total people reached · +${formatNumber(rate)}/s\nAudience: ${formatNumber(
        audience
      )} loyal followers`}
    >
      <span className="text-xs leading-none" aria-hidden>
        📣
      </span>
      <div className="flex flex-col leading-none">
        <AnimatedCounter
          value={reach}
          mode="number"
          className="text-xs font-semibold text-[var(--accent)]"
        />
        <span className="text-[9px] font-mono tabular-nums text-muted mt-0.5">
          👥 {formatNumber(audience)}
        </span>
      </div>
    </div>
  );
}

interface IconButtonProps {
  icon: string;
  label: string;
  desc?: string;
  onClick: () => void;
  pulse?: boolean;
  badge?: number;
  accentColor?: string;
}

function IconButton({ icon, label, desc, onClick, pulse = false, badge, accentColor }: IconButtonProps) {
  const [showTip, setShowTip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const color = accentColor ?? 'var(--accent)';

  function startPress() {
    timerRef.current = setTimeout(() => setShowTip(true), 500);
  }
  function endPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => setShowTip(false), 1400);
  }

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {showTip && desc && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50
            pointer-events-none whitespace-nowrap rounded-xl border px-3 py-2 text-center animate-fade-in"
          style={{
            background: 'rgba(8,12,22,0.98)',
            backdropFilter: 'blur(24px)',
            borderColor: `${color}30`,
          }}
        >
          <div className="text-[10px] font-bold mb-0.5" style={{ color }}>{label}</div>
          <div className="text-[9px] text-[#8a94a8] max-w-[180px] leading-snug whitespace-normal">
            {desc}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => { endPress(); onClick(); }}
        aria-label={label}
        title={desc ?? label}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onTouchMove={endPress}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className="relative flex flex-col items-center justify-center rounded-2xl transition-all active:scale-90"
        style={{
          width: '46px',
          height: '46px',
          background: pulse
            ? `linear-gradient(145deg, ${color}22, ${color}0a)`
            : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${pulse ? `${color}55` : 'rgba(255,255,255,0.07)'}`,
          boxShadow: pulse ? `0 0 16px -4px ${color}60` : 'none',
        }}
      >
        {pulse && (
          <span
            className="absolute inset-0 rounded-2xl animate-pulse-accent pointer-events-none"
            aria-hidden
            style={{ '--accent': color } as CSSProperties}
          />
        )}
        <span className="text-xl leading-none" aria-hidden>{icon}</span>
        <span className="text-[8px] font-semibold leading-none mt-0.5" style={{ color: pulse ? color : '#6b7899' }}>
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -right-1 -top-1 min-w-[17px] h-[17px] px-1 rounded-full text-[9px]
              font-bold leading-none flex items-center justify-center text-[#070b12]"
            style={{ background: color }}
            aria-hidden
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    </div>
  );
}

export default function TopBar({ onOpenOverlay }: TopBarProps) {
  const { state } = useGame();
  const industry = getIndustry(state);
  const setup = state.setup;

  const symbol = industry?.currency ?? '$';
  const income = incomePerSec(state);
  const insightRate = insightPerSec(state);
  const badge = prestigeBadge(state);
  const storyQueued = state.story.queue.length;
  const notifUnread = state.notifications ? unreadCount(state.notifications) : 0;

  // Marketing headline metric.
  const reach = state.marketing?.reach ?? 0;
  const audience = state.marketing?.audience ?? 0;
  const reachRate = reachPerSec(state);

  return (
    <header
      className="fixed inset-x-0 top-0 z-30 mx-auto max-w-[480px] glass-panel
        pt-[env(safe-area-inset-top)]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Row 1: identity + overlay buttons */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl leading-none" aria-hidden>
            {industry?.emoji ?? '🏭'}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight text-ink">
              {setup?.name ?? 'Empire Engine'}
            </div>
            <div
              className="flex items-center gap-1 text-[10px] font-medium leading-tight text-muted"
              title={`Prestige tier · ${badge.label}`}
            >
              <span aria-hidden>{badge.emoji}</span>
              <span>{badge.label}</span>
              {setup?.playerName && (
                <span className="opacity-60">· {setup.playerName}</span>
              )}
              {state.legacyPoints > 0 && (
                <span className="text-[var(--accent)]">
                  · {formatNumber(state.legacyPoints)} LP
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            icon="📡"
            label="Dispatch"
            desc="Story beats, alerts and live empire feed"
            onClick={() => onOpenOverlay(storyQueued > 0 ? 'story' : 'dispatch')}
            pulse={storyQueued > 0}
            badge={storyQueued > 0 ? storyQueued : notifUnread}
            accentColor={storyQueued > 0 ? '#F5C842' : undefined}
          />
          <IconButton
            icon="📜"
            label="The Will"
            desc="Old Master's will — wealth tranches, clauses, legacy"
            onClick={() => onOpenOverlay('will')}
          />
          <IconButton
            icon="⚔️"
            label="Rivals"
            desc="Rival movements, posture and threats"
            onClick={() => onOpenOverlay('rivals')}
          />
          <IconButton
            icon="⚙️"
            label="Settings"
            desc="Preferences, save data, co-founder customisation"
            onClick={() => onOpenOverlay('settings')}
          />
        </div>
      </div>

      {/* Row 2: cash + per-second */}
      <div className="flex items-baseline justify-between gap-2 px-3 pt-1">
        <AnimatedCounter
          value={state.cash}
          mode="money"
          symbol={symbol}
          flash
          className="text-2xl font-bold text-ink"
        />
        <div className="text-xs font-mono tabular-nums text-good" title="Income per second">
          {income > 0 ? '+' : ''}
          {formatMoney(income, symbol)}/s
        </div>
      </div>

      {/* Row 3: secondary currencies (Reach leads  -  it's the headline metric) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2">
        <ReachChip reach={reach} audience={audience} rate={reachRate} />
        <CurrencyChip
          icon="🔬"
          value={state.insight}
          title={`Insight · +${formatNumber(insightRate)}/s`}
          tone="text-[#7dd3fc]"
        />
        <CurrencyChip
          icon="🤝"
          value={state.influence}
          title="Influence  -  levels up advisors"
          tone="text-[#c4b5fd]"
        />
        {state.legacyPoints > 0 && (
          <CurrencyChip
            icon="♾️"
            value={state.legacyPoints}
            title="Legacy Points  -  permanent production multiplier"
            tone="text-[var(--accent)]"
          />
        )}
        {state.masteryStars > 0 && (
          <CurrencyChip
            icon="⭐"
            value={state.masteryStars}
            title="Mastery Stars"
            tone="text-warn"
          />
        )}
        {state.transcendShards > 0 && (
          <CurrencyChip
            icon="💠"
            value={state.transcendShards}
            title="Transcend Shards"
            tone="text-[var(--accent)]"
          />
        )}
        {(state.investments?.wealthPortfolio ?? 0) > 0 && (
          <CurrencyChip
            icon="💎"
            value={state.investments?.wealthPortfolio ?? 0}
            title="Wealth Portfolio  - total investment value"
            tone="text-emerald-400"
          />
        )}
      </div>
    </header>
  );
}
