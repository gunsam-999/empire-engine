// NotificationDrawer — expandable notification history.
// Each notification is a tappable card that expands to show full context,
// why it happened, and a concrete next-step hint with a tab name.

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import type { GameNotification, NotificationPriority } from '../../game/types';

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  urgent:  '#f87171',
  info:    '#8a94a8',
  success: '#34d399',
};

const PRIORITY_LABEL: Record<NotificationPriority, string> = {
  urgent:  '⚠️ Urgent',
  info:    'ℹ️ Info',
  success: '✅ Success',
};

function timeAgo(at: number, now: number): string {
  const s = Math.round((now - at) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

interface NextStep {
  hint: string;
  where: string;
}

function inferNextStep(notif: GameNotification): NextStep {
  const t = (notif.title + ' ' + notif.body).toLowerCase();

  if (t.includes('rival') || t.includes('attack') || t.includes('hostile') || t.includes('war') || t.includes('telegraph'))
    return { hint: 'Open Intel → War Room to review threats and counter-moves.', where: 'Intel tab' };
  if (t.includes('newspaper') || t.includes('ledger') || t.includes('press') || t.includes('breaking'))
    return { hint: 'Open Intel → Ledger to read the full story and manage reputation.', where: 'Intel tab' };
  if (t.includes('pantheon') || t.includes('titan') || t.includes('ranking'))
    return { hint: 'Open Intel → Pantheon to track the industry giants.', where: 'Intel tab' };
  if (t.includes('research') || t.includes('breakthrough') || t.includes('unlock') || t.includes('tech'))
    return { hint: 'Head to Research to apply your new unlock and boost production.', where: 'Research tab' };
  if (t.includes('invest') || t.includes('portfolio') || t.includes('wiz') || t.includes('dividend'))
    return { hint: 'Check the Invest tab to act on your portfolio opportunity.', where: 'Invest tab' };
  if (t.includes('prestige') || t.includes('legacy') || t.includes('rebirth') || t.includes('lp'))
    return { hint: 'Open the Prestige tab when ready to rebirth for Legacy Points.', where: 'Prestige tab' };
  if (t.includes('market') || t.includes('reach') || t.includes('audience') || t.includes('campaign'))
    return { hint: 'Visit Marketing to capitalise on your audience momentum.', where: 'Marketing tab' };
  if (t.includes('advisor') || t.includes('aide') || t.includes('recruit'))
    return { hint: 'Open Advisors (📖 header button) to act on this opportunity.', where: 'Advisors panel' };
  if (t.includes('territory') || t.includes('region') || t.includes('expand'))
    return { hint: 'Open Territory (🗺️ header button) to claim the new region.', where: 'Territory panel' };
  if (notif.priority === 'urgent')
    return { hint: 'This needs attention — check Intel or Empire for active threats.', where: 'Intel tab' };
  if (notif.priority === 'success')
    return { hint: 'Well done! Keep building — check Empire for the next upgrade.', where: 'Empire tab' };
  return { hint: 'Stay informed — this event may shift your strategy.', where: 'Empire tab' };
}

interface NotifCardProps {
  notif: GameNotification;
  isUnread: boolean;
  now: number;
}

function NotifCard({ notif, isUnread, now }: NotifCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = PRIORITY_COLOR[notif.priority];
  const step = inferNextStep(notif);

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left rounded-xl border p-3 transition-all active:scale-[0.99]"
      style={{
        borderColor: isUnread ? `${color}45` : '#232c3e',
        background: isUnread ? `${color}0a` : 'rgba(14,20,32,0.5)',
      }}
    >
      {/* Row: icon · title · time · unread dot · chevron */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-lg leading-none shrink-0">{notif.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#e7ecf5] leading-snug">
              {notif.title}
            </span>
            <span className="shrink-0 text-[10px] text-[#8a94a8]">{timeAgo(notif.at, now)}</span>
          </div>
          {/* Body — always visible, clamped unless expanded */}
          <p
            className={`mt-0.5 text-[11px] leading-snug text-[#8a94a8] ${
              expanded ? '' : 'line-clamp-2'
            }`}
          >
            {notif.body}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          {isUnread && (
            <div className="h-2 w-2 rounded-full" style={{ background: color }} />
          )}
          <span className="text-[10px] text-[#3d4a62] leading-none mt-1">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Priority badge */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{ background: `${color}22`, color }}
        >
          {PRIORITY_LABEL[notif.priority]}
        </span>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div
          className="mt-2.5 rounded-lg border border-[#232c3e] p-2.5 text-left"
          style={{ background: 'rgba(7,11,18,0.6)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#3d4a62] mb-1.5">
            What to do
          </div>
          <p className="text-[11px] leading-snug text-[#c5cdd8]">{step.hint}</p>
          <div
            className="mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <span className="text-[10px] font-bold" style={{ color }}>
              → {step.where}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

export default function NotificationDrawer() {
  const { state, dispatch } = useGame();
  const notifications = state.notifications;
  const now = Date.now();

  if (!notifications) return null;

  const { items, lastSeenAt } = notifications;
  const unread = items.filter((n) => n.at > lastSeenAt).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#e7ecf5]">
            {items.length === 0 ? 'No alerts yet' : `${items.length} alert${items.length !== 1 ? 's' : ''}`}
          </p>
          {unread > 0 && (
            <p className="text-[11px] text-[#8a94a8]">
              {unread} unread · tap any card for context + next step
            </p>
          )}
          {unread === 0 && items.length > 0 && (
            <p className="text-[11px] text-[#8a94a8]">tap any card to expand context + next step</p>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'NOTIFICATION_READ_ALL' })}
            className="rounded-lg border border-[#232c3e] bg-[#151c2b] px-3 py-1.5
              text-[11px] font-semibold text-[#8a94a8] transition-transform active:scale-95
              hover:text-[#e7ecf5]"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#232c3e] bg-[#151c2b] p-8 text-center">
          <div className="text-2xl mb-2">🔔</div>
          <p className="text-[13px] font-medium text-[#e7ecf5]">Nothing here yet</p>
          <p className="mt-1 text-[11px] text-[#8a94a8]">
            Alerts from rivals, the press, market events, and milestones will appear here.
            Tap any alert to see what happened, why, and what to do next.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((notif) => (
            <NotifCard
              key={notif.id}
              notif={notif}
              isUnread={notif.at > lastSeenAt}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}
