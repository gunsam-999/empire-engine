// NotificationDrawer  -  persistent alert history (Session 5.4).
// Shown as an overlay sheet from the TopBar bell icon. Lists all notifications
// newest-first with priority-coded colours and a "Mark all read" button.

import { useGame } from '../../game/GameContext';
import type { GameNotification, NotificationPriority } from '../../game/types';

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  urgent:  '#f87171',
  info:    '#8a94a8',
  success: '#34d399',
};

const PRIORITY_LABEL: Record<NotificationPriority, string> = {
  urgent:  'Urgent',
  info:    'Info',
  success: 'Success',
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

interface NotifRowProps {
  notif: GameNotification;
  isUnread: boolean;
  now: number;
}

function NotifRow({ notif, isUnread, now }: NotifRowProps) {
  const color = PRIORITY_COLOR[notif.priority];
  const label = PRIORITY_LABEL[notif.priority];

  return (
    <div
      className="rounded-xl border p-3 transition-colors"
      style={{
        borderColor: isUnread ? `${color}40` : '#232c3e',
        background: isUnread ? `${color}08` : 'transparent',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-base leading-none">{notif.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#e7ecf5]">{notif.title}</span>
            <span className="shrink-0 text-[#8a94a8]">{timeAgo(notif.at, now)}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-[#8a94a8]">{notif.body}</p>
        </div>
        {isUnread && (
          <div
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ background: color }}
          />
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{ background: `${color}20`, color }}
        >
          {label}
        </span>
      </div>
    </div>
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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#8a94a8]">
          {items.length === 0
            ? 'No notifications yet.'
            : `${items.length} alert${items.length !== 1 ? 's' : ''}${unread > 0 ? ` · ${unread} unread` : ''}`}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'NOTIFICATION_READ_ALL' })}
            className="rounded-lg border border-[#232c3e] bg-[#151c2b] px-3 py-1.5 text-[11px] font-semibold text-[#8a94a8] transition-transform active:scale-95 hover:text-[#e7ecf5]"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#232c3e] bg-[#151c2b] p-6 text-center text-[13px] text-[#8a94a8]">
          Alerts from rivals, press, and world events will appear here.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((notif) => (
            <NotifRow
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
