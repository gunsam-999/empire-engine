// DispatchSheet — notification + story feed rendered as a bottom sheet.
// Opened from the 📡 Dispatch icon in TopBar when no story is queued.

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import type { GameNotification, NotificationPriority } from '../../game/types';
import { STORY_BEATS } from '../../data/story';

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  urgent:  '#f87171',
  info:    '#8a94a8',
  success: '#34d399',
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
  const [expanded, setExpanded] = useState(false);
  const color = PRIORITY_COLOR[notif.priority];
  return (
    <button
      type="button"
      className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors active:bg-white/[0.03]"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isUnread ? `${color}08` : 'transparent',
      }}
      onClick={() => setExpanded(v => !v)}
    >
      <span className="text-lg leading-none shrink-0 mt-0.5">{notif.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12px] font-semibold text-[#e7ecf5] leading-tight flex-1 truncate">
            {notif.title}
          </span>
          <span className="shrink-0 text-[9px] text-[#3d4a62]">{timeAgo(notif.at)}</span>
        </div>
        <p className={`mt-0.5 text-[11px] leading-snug text-[#8a94a8] ${expanded ? '' : 'line-clamp-2'}`}>
          {notif.body}
        </p>
      </div>
      {isUnread && <div className="shrink-0 h-2 w-2 rounded-full mt-1" style={{ background: color }} />}
    </button>
  );
}

interface DispatchSheetProps {
  onOpenStory: () => void;
  onClose: () => void;
}

export default function DispatchSheet({ onOpenStory, onClose }: DispatchSheetProps) {
  const { state, dispatch } = useGame();

  const notifications = state.notifications;
  const items: GameNotification[] = notifications?.items ?? [];
  const lastSeenAt = notifications?.lastSeenAt ?? 0;
  const unread = items.filter(n => n.at > lastSeenAt).length;

  const storyQueue: string[] = state.story?.queue ?? [];
  const allBeats = [...STORY_BEATS, ...(state.generatedBeats ?? [])];
  const nextBeat = storyQueue.length > 0
    ? allBeats.find(b => b.id === storyQueue[0])
    : undefined;

  function readStory() {
    onClose();
    onOpenStory();
  }

  function markAllRead() {
    dispatch({ type: 'NOTIFICATION_READ_ALL' });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(3,5,12,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          background: 'rgba(7,11,20,0.99)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          maxHeight: '75dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div>
            <div className="font-bold text-[#e7ecf5] text-base">📡 Dispatch</div>
            <div className="text-[11px] text-[#8a94a8] mt-0.5">Your empire's live feed</div>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-[#4ECDC4] font-semibold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(78,205,196,0.1)' }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8a94a8] text-sm"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto no-scrollbar flex-1">
          {/* Queued story beat */}
          {nextBeat && (
            <div className="px-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#F5C842] mb-2">
                Story Beat Ready
              </div>
              <div
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,200,66,0.1), rgba(245,200,66,0.02))',
                  border: '1px solid rgba(245,200,66,0.25)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#C8890A] mb-1">
                    Act {nextBeat.act} · Ch.{nextBeat.chapter}
                  </div>
                  <div className="text-[14px] font-bold text-[#e7ecf5] leading-snug mb-1">
                    {nextBeat.title}
                  </div>
                  <div className="text-[11px] text-[#8a94a8] leading-relaxed line-clamp-2">
                    {nextBeat.lines[0]}
                  </div>
                  {storyQueue.length > 1 && (
                    <div className="text-[9px] text-[#3d4a62] mt-1">
                      +{storyQueue.length - 1} more beat{storyQueue.length > 2 ? 's' : ''} queued
                    </div>
                  )}
                </div>
                <button
                  onClick={readStory}
                  className="shrink-0 flex items-center gap-1.5 rounded-2xl px-4 py-2.5
                    active:scale-95 transition-transform font-bold text-[12px]"
                  style={{ background: '#F5C842', color: '#060A14' }}
                >
                  Read ▶
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          <div>
            <div className="px-4 pt-3 pb-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#3d4a62]">
                Alerts{items.length > 0 ? ` · ${items.length}` : ''}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-3">🔔</div>
                <div className="text-[12px] text-[#3d4a62] font-semibold">No alerts yet</div>
                <div className="text-[10px] text-[#2a3550] mt-1">
                  Rival moves, press and market events appear here.
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
      </div>
    </div>
  );
}
