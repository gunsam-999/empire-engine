// PullDownFeed — pull-down notification + story lever for Empire Engine.
// A physical tab bar just below the TopBar. Collapsed: 48px handle showing
// latest activity. Expanded: unified feed of story beats + game alerts.

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import type { GameNotification, NotificationPriority } from '../../game/types';
import { STORY_BEATS } from '../../data/story';

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  urgent:  '#f87171',
  info:    '#8a94a8',
  success: '#34d399',
};

const PRIORITY_ICON: Record<NotificationPriority, string> = {
  urgent:  '⚠️',
  info:    'ℹ️',
  success: '✅',
};

function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function NotifRow({ notif, isUnread }: { notif: GameNotification; isUnread: boolean }) {
  const [exp, setExp] = useState(false);
  const color = PRIORITY_COLOR[notif.priority];
  return (
    <button
      type="button"
      className="w-full text-left flex items-start gap-2.5 px-4 py-2.5 transition-colors active:bg-white/[0.03]"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isUnread ? `${color}06` : 'transparent',
      }}
      onClick={() => setExp(v => !v)}
    >
      <span className="text-base leading-none shrink-0 mt-0.5">{notif.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-[#e7ecf5] leading-tight flex-1 truncate">
            {notif.title}
          </span>
          <span className="shrink-0 text-[9px] text-[#3d4a62]">{timeAgo(notif.at)}</span>
        </div>
        <p className={`mt-0.5 text-[10px] leading-snug text-[#8a94a8] ${exp ? '' : 'line-clamp-2'}`}>
          {notif.body}
        </p>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text-[9px]">{PRIORITY_ICON[notif.priority]}</span>
        {isUnread && <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      </div>
    </button>
  );
}

export interface PullDownFeedProps {
  /** Called when user taps "Read" on a queued story beat — opens the story overlay. */
  onOpenStory: () => void;
}

export default function PullDownFeed({ onOpenStory }: PullDownFeedProps) {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);

  const notifications = state.notifications;
  const items: GameNotification[] = notifications?.items ?? [];
  const lastSeenAt = notifications?.lastSeenAt ?? 0;
  const unread = items.filter(n => n.at > lastSeenAt).length;

  const storyQueue: string[] = state.story?.queue ?? [];
  const nextBeat = storyQueue.length > 0
    ? STORY_BEATS.find(b => b.id === storyQueue[0])
    : undefined;

  const hasStory   = storyQueue.length > 0;
  const urgentItem = items.find(n => n.at > lastSeenAt && n.priority === 'urgent');
  const hasActivity = hasStory || unread > 0;

  // Accent color drives the handle glow + indicator dot
  const accentColor = hasStory
    ? '#F5C842'
    : urgentItem
      ? '#f87171'
      : unread > 0
        ? '#4ECDC4'
        : '#2a3550';

  // Handle summary content
  const tagLabel = hasStory
    ? '📖 STORY'
    : urgentItem
      ? '⚠️ URGENT'
      : unread > 0
        ? '🔔 NEW'
        : '✓ CAUGHT UP';

  const summaryText = hasStory
    ? (nextBeat?.title ?? 'Story ready')
    : urgentItem
      ? urgentItem.title
      : unread > 0
        ? `${unread} new alert${unread !== 1 ? 's' : ''}`
        : 'No new alerts';

  function toggle() {
    if (!open && unread > 0) {
      dispatch({ type: 'NOTIFICATION_READ_ALL' });
    }
    setOpen(v => !v);
  }

  function readStory() {
    setOpen(false);
    onOpenStory();
  }

  return (
    <>
      {/* ── Collapsed handle ─────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 z-[25] mx-auto max-w-[480px]"
        style={{ top: '148px' }}
      >
        <button
          type="button"
          onClick={toggle}
          className="w-full flex items-center gap-2.5 px-3 select-none"
          style={{
            height: '44px',
            background: open
              ? 'rgba(6,10,20,0.99)'
              : 'rgba(6,10,20,0.94)',
            backdropFilter: 'blur(24px)',
            borderBottom: `1px solid ${open ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
            boxShadow: hasActivity && !open
              ? `0 3px 20px -6px ${accentColor}55, 0 1px 0 rgba(255,255,255,0.04) inset`
              : '0 2px 8px -4px rgba(0,0,0,0.5)',
          }}
        >
          {/* Pulse dot */}
          <div
            className="shrink-0 h-2 w-2 rounded-full transition-colors duration-300"
            style={{
              background: accentColor,
              boxShadow: hasActivity ? `0 0 8px 2px ${accentColor}70` : 'none',
            }}
          />

          {/* Tag chip */}
          <span
            className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-widest"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {tagLabel}
          </span>

          {/* Summary label */}
          <span className="flex-1 min-w-0 text-[11px] text-[#b4c0d0] font-medium truncate">
            {summaryText}
          </span>

          {/* Unread badge + chevron */}
          <div className="flex items-center gap-1.5 shrink-0">
            {unread > 0 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none"
                style={{ background: accentColor, color: '#060A14', paddingTop: '3px', paddingBottom: '3px' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
            <span
              className="text-[11px] text-[#3d4a62] transition-transform duration-200 leading-none"
              style={{ transform: open ? 'rotate(180deg)' : 'none' }}
            >
              ▼
            </span>
          </div>
        </button>
      </div>

      {/* ── Backdrop ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[23]"
          style={{ background: 'rgba(3,5,12,0.65)', backdropFilter: 'blur(3px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Expanded panel ───────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-x-0 mx-auto max-w-[480px] z-[24] overflow-y-auto no-scrollbar animate-fade-in"
          style={{
            top: '192px',
            maxHeight: 'calc(100dvh - 270px)',
            background: 'rgba(6,10,20,0.99)',
            backdropFilter: 'blur(28px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 8px 40px -8px rgba(0,0,0,0.7)',
          }}
        >
          {/* ── Queued story beat ───────────────────────────────── */}
          {hasStory && nextBeat && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#F5C842]">
                  Story Beat
                </span>
                {storyQueue.length > 1 && (
                  <span className="text-[8px] text-[#3d4a62]">
                    +{storyQueue.length - 1} more
                  </span>
                )}
              </div>
              <div
                className="mx-3 mb-3 rounded-xl p-3.5 flex items-start gap-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,200,66,0.09), rgba(245,200,66,0.02))',
                  border: '1px solid rgba(245,200,66,0.22)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#C8890A] mb-0.5">
                    Act {nextBeat.act} · Ch.{nextBeat.chapter}
                  </div>
                  <div className="text-[13px] font-bold text-[#e7ecf5] leading-tight mb-1">
                    {nextBeat.title}
                  </div>
                  <div className="text-[11px] text-[#8a94a8] leading-relaxed line-clamp-2">
                    {nextBeat.lines[0]}
                  </div>
                </div>
                <button
                  onClick={readStory}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2
                    active:scale-95 transition-transform font-bold text-[11px]"
                  style={{ background: '#F5C842', color: '#060A14' }}
                >
                  Read ▶
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ───────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#3d4a62]">
                Alerts{items.length > 0 ? ` · ${items.length}` : ''}
              </span>
              {unread > 0 && (
                <button
                  onClick={() => dispatch({ type: 'NOTIFICATION_READ_ALL' })}
                  className="text-[9px] text-[#4ECDC4] font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">🔔</div>
                <div className="text-[11px] text-[#3d4a62]">No alerts yet</div>
                <div className="text-[10px] text-[#2a3550] mt-1">
                  Rival moves, press, market events appear here.
                </div>
              </div>
            ) : (
              items.map(notif => (
                <NotifRow
                  key={notif.id}
                  notif={notif}
                  isUnread={notif.at > lastSeenAt}
                />
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
