// ============================================================================
// NotificationEngine (Session 5.4)  -  persistent prioritised alert log.
// Detects notable state transitions in TICK, pushes them to a persistent
// NotificationState (saved across sessions), and fires ephemeral toasts for
// urgent/success events via the existing toast bus.
// ============================================================================

import type {
  GameNotification,
  GameState,
  NotificationPriority,
  NotificationState,
} from '../game/types';
import { toast } from '../components/shared/ToastNotification';
import { ECHELON_LABELS } from './EchelonEngine';

export function defaultNotificationState(): NotificationState {
  return { items: [], lastSeenAt: 0 };
}

export function unreadCount(notifications: NotificationState): number {
  return notifications.items.filter((n) => n.at > notifications.lastSeenAt).length;
}

export function markAllRead(notifications: NotificationState, now: number): NotificationState {
  return { ...notifications, lastSeenAt: now };
}

function push(
  notifications: NotificationState,
  priority: NotificationPriority,
  icon: string,
  title: string,
  body: string,
  now: number
): NotificationState {
  const notif: GameNotification = {
    id: `notif-${priority}-${now}-${title.slice(0, 6).replace(/\s/g, '')}`,
    at: now,
    priority,
    icon,
    title,
    body,
    read: false,
  };
  return { ...notifications, items: [notif, ...notifications.items].slice(0, 50) };
}

/**
 * Detect notable state transitions and append to NotificationState.
 * Also fires toasts for urgent and success events.
 * Called once at the END of each TICK with (prevState=state, nextState=next).
 */
export function detectNotifications(
  prev: GameState,
  next: GameState,
  notifications: NotificationState,
  now: number
): NotificationState {
  let ns = notifications;

  // 1. Rival telegraph appeared (or changed to a different move)
  for (const r of next.rivals ?? []) {
    const prevR = (prev.rivals ?? []).find((p) => p.id === r.id);
    if (
      r.telegraph &&
      (!prevR?.telegraph || prevR.telegraph.moveId !== r.telegraph.moveId)
    ) {
      const msg = r.telegraph.message;
      ns = push(ns, 'urgent', '⚔️', 'Rival Strike Incoming', msg, now);
      toast.bad(msg, { icon: '⚔️', durationMs: 4_000 });
    }
  }

  // 2. Coalition activated
  if (next.coalitionActive && !prev.coalitionActive) {
    const body = 'Your rivals have united against you. Expect heightened aggression on all fronts.';
    ns = push(ns, 'urgent', '⚠️', 'Coalition Formed', body, now);
    toast.bad('Coalition formed  -  rivals are coordinating against you.', {
      icon: '⚠️',
      durationMs: 5_000,
    });
  }

  // 3. Echelon tier advanced
  if (next.echelon?.tier && next.echelon.tier !== prev.echelon?.tier) {
    const label = ECHELON_LABELS[next.echelon.tier] ?? next.echelon.tier;
    const body = `You've reached the ${label} echelon. The competitive landscape is shifting.`;
    ns = push(ns, 'success', '🏆', `Echelon: ${label}`, body, now);
    toast.good(`Echelon advanced  -  ${label}!`, { icon: '🏆', durationMs: 3_500 });
  }

  // 4. Newspaper negative headline published
  const nextNewsFirst = next.newspaper?.items[0];
  const prevNewsFirst = prev.newspaper?.items[0];
  if (nextNewsFirst && nextNewsFirst.id !== prevNewsFirst?.id && nextNewsFirst.sentimentScore < 0) {
    ns = push(ns, 'info', '📰', 'Press Coverage', nextNewsFirst.headline, now);
    toast.warn(nextNewsFirst.headline, { icon: '📰', durationMs: 3_000 });
  }

  // 5. Premise clause breached
  if (next.premise && prev.premise) {
    for (const cl of next.premise.clauses) {
      const prevCl = prev.premise.clauses.find((p) => p.id === cl.id);
      if (cl.status === 'breached' && prevCl?.status === 'fulfilled') {
        const body = `Inheritance clause "${cl.id}" has been violated. Your reward is suspended.`;
        ns = push(ns, 'urgent', '📜', 'Clause Breached', body, now);
        toast.warn("Old Master's clause breached  -  reward suspended.", {
          icon: '📜',
          durationMs: 4_000,
        });
      }
    }
  }

  // 6. Workforce mood collapsed to BURNT_OUT
  if ((next.workforce ?? []).length > 0 && (prev.workforce ?? []).length > 0) {
    const prevAvg =
      prev.workforce.reduce((s, w) => s + w.morale, 0) / prev.workforce.length;
    const nextAvg =
      next.workforce.reduce((s, w) => s + w.morale, 0) / next.workforce.length;
    if (nextAvg < 20 && prevAvg >= 20) {
      const body = 'Team morale has collapsed. Rally your people before productivity craters.';
      ns = push(ns, 'info', '👥', 'Team Crisis', body, now);
      toast.warn('Workforce is burning out  -  rally them soon.', {
        icon: '👥',
        durationMs: 3_500,
      });
    }
  }

  // 7. Public confidence dropped to Crisis level (< 20)
  const prevConf = prev.publicAffairs?.confidence ?? 50;
  const nextConf = next.publicAffairs?.confidence ?? 50;
  if (nextConf < 20 && prevConf >= 20) {
    const body = 'Public confidence has reached crisis levels. Issue a statement before your production suffers.';
    ns = push(ns, 'urgent', '📢', 'Confidence Crisis', body, now);
    toast.bad('Public confidence critical  -  issue a statement.', {
      icon: '📢',
      durationMs: 4_000,
    });
  }

  // 8. Titan has noticed the player (from Pantheon system).
  for (const t of next.pantheon?.titans ?? []) {
    const prevT = (prev.pantheon?.titans ?? []).find((p) => p.id === t.id);
    if (t.hasNoticedPlayer && !prevT?.hasNoticedPlayer) {
      const body = `A Pantheon titan has taken notice of your empire. Check The Ledger and the Pantheon standings.`;
      ns = push(ns, 'success', '🌐', 'Pantheon Noticed You', body, now);
      toast.good('A Pantheon titan is watching you.', { icon: '🌐', durationMs: 4_000 });
    }
  }

  // 9. Player surpassed a titan's estimated valuation.
  const prevLE = prev.lifetimeEarnings ?? 0;
  const nextLE = next.lifetimeEarnings ?? 0;
  for (const t of next.pantheon?.titans ?? []) {
    if (nextLE >= t.estimatedValuation && prevLE < t.estimatedValuation) {
      const body = `Your empire has surpassed a Pantheon titan in estimated valuation. The world is watching.`;
      ns = push(ns, 'success', '👑', 'Titan Surpassed!', body, now);
      toast.good('You have surpassed a Pantheon titan!', { icon: '👑', durationMs: 5_000 });
    }
  }

  // 10. Vendetta declared against you.
  for (const v of next.intel?.vendettas ?? []) {
    const prevV = (prev.intel?.vendettas ?? []).find((pv) => pv.rivalId === v.rivalId);
    if (!prevV) {
      const body = `A rival has declared a personal vendetta. Their attacks will intensify. Check the War Room.`;
      ns = push(ns, 'urgent', '🔥', 'Vendetta Declared', body, now);
      toast.bad('Vendetta declared  -  this just got personal.', { icon: '🔥', durationMs: 4_500 });
    }
  }

  // 11. Breaking news in The Ledger.
  const nextNews = next.newspaper?.items ?? [];
  const prevNews = prev.newspaper?.items ?? [];
  const newBreaking = nextNews.find(
    (n) => n.isBreaking && !prevNews.some((p) => p.id === n.id)
  );
  if (newBreaking) {
    ns = push(ns, 'info', '🔴', 'Breaking: Ledger', newBreaking.headline, now);
    toast.warn(newBreaking.headline, { icon: '🔴', durationMs: 4_000 });
  }

  return ns;
}
