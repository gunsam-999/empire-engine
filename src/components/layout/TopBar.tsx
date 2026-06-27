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
export type OverlayId = 'story' | 'territory' | 'settings' | 'advisors' | 'notifications';

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
      className="flex items-center gap-1 rounded-lg bg-[#151c2b] px-2 py-1 border border-[#232c3e]"
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
      className="flex items-center gap-1.5 rounded-lg bg-[#151c2b] px-2 py-1 border border-[var(--accent)]/35"
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
  onClick: () => void;
  pulse?: boolean;
  badge?: number;
}

function IconButton({ icon, label, onClick, pulse = false, badge }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative grid h-9 w-9 place-items-center rounded-xl border border-[#232c3e]
        bg-[#151c2b] text-base transition-transform active:scale-90 hover:bg-[#1b2334]"
    >
      {pulse && (
        <span
          className="absolute inset-0 rounded-xl animate-pulse-accent pointer-events-none"
          aria-hidden
        />
      )}
      <span aria-hidden>{icon}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -right-1 -top-1 min-w-[16px] h-4 px-1 rounded-full text-[10px]
            font-bold leading-4 text-center text-[#070b12]"
          style={{ background: 'var(--accent)' }}
          aria-hidden
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
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
      className="fixed inset-x-0 top-0 z-30 mx-auto max-w-[480px] border-b border-[#232c3e]
        bg-[#0e1420]/95 backdrop-blur-md pt-[env(safe-area-inset-top)]"
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
              {state.legacyPoints > 0 && (
                <span className="text-[var(--accent)]">
                  · {formatNumber(state.legacyPoints)} LP
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            icon="📖"
            label="Story"
            onClick={() => onOpenOverlay('story')}
            pulse={storyQueued > 0}
            badge={storyQueued}
          />
          <IconButton icon="🃏" label="Advisors" onClick={() => onOpenOverlay('advisors')} />
          <IconButton icon="🗺️" label="Territory" onClick={() => onOpenOverlay('territory')} />
          <IconButton icon="🔔" label="Notifications" onClick={() => onOpenOverlay('notifications')} badge={notifUnread} />
          <IconButton icon="⚙️" label="Settings" onClick={() => onOpenOverlay('settings')} />
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
