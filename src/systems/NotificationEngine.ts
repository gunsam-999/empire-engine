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
import { ECHELON_LABELS } from './EchelonEngine';
import { getRivalConfig } from '../data/rivals';
import { getCompanionConfig } from '../data/companions';
import { getPantheonConfig } from '../data/pantheon';

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
  now: number,
  toastOpts?: { msg: string; kind: 'bad' | 'good' | 'warn'; durationMs: number }
): NotificationState {
  const notif: GameNotification = {
    id: `notif-${priority}-${now}-${title.slice(0, 6).replace(/\s/g, '')}`,
    at: now,
    priority,
    icon,
    title,
    body,
    read: false,
    toast: toastOpts ? { ...toastOpts, icon } : undefined,
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
      const rivalName = getRivalConfig(r.id)?.name ?? 'A rival';
      const msg = r.telegraph.message;
      ns = push(ns, 'urgent', '⚔️', `${rivalName}: Strike Incoming`, msg, now,
        { msg: `${rivalName}: ${msg}`, kind: 'bad', durationMs: 4_000 });
    }
  }

  // 2. Coalition activated
  if (next.coalitionActive && !prev.coalitionActive) {
    const coalitionNames = (next.rivals ?? [])
      .filter(r => (r as { posture?: string }).posture === 'WAR' || (r as { posture?: string }).posture === 'HOSTILE')
      .map(r => getRivalConfig(r.id)?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    const body = coalitionNames
      ? `${coalitionNames} - and others - have united against you. Expect a coordinated assault.`
      : 'Your rivals have united against you. Expect heightened aggression on all fronts.';
    ns = push(ns, 'urgent', '⚠️', 'Coalition Formed', body, now,
      { msg: 'Coalition formed  -  rivals are coordinating against you.', kind: 'bad', durationMs: 5_000 });
  }

  // 3. Echelon tier advanced
  if (next.echelon?.tier && next.echelon.tier !== prev.echelon?.tier) {
    const label = ECHELON_LABELS[next.echelon.tier] ?? next.echelon.tier;
    const prevLabel = ECHELON_LABELS[prev.echelon?.tier ?? ''] ?? 'lower';
    const body = `You've ascended from ${prevLabel} to ${label}. The competitive landscape is shifting - new rivals take notice.`;
    ns = push(ns, 'success', '🏆', `Echelon: ${label}`, body, now,
      { msg: `Echelon advanced  -  ${label}!`, kind: 'good', durationMs: 3_500 });
  }

  // 4. Newspaper negative headline published (skip breaking — caught by #11 below)
  const nextNewsFirst = next.newspaper?.items[0];
  const prevNewsFirst = prev.newspaper?.items[0];
  if (
    nextNewsFirst &&
    nextNewsFirst.id !== prevNewsFirst?.id &&
    nextNewsFirst.sentimentScore < 0 &&
    !nextNewsFirst.isBreaking
  ) {
    ns = push(ns, 'info', '📰', 'Press Coverage', nextNewsFirst.headline, now,
      { msg: nextNewsFirst.headline, kind: 'warn', durationMs: 3_000 });
  }

  // 5. Premise clause breached
  if (next.premise && prev.premise) {
    for (const cl of next.premise.clauses) {
      const prevCl = prev.premise.clauses.find((p) => p.id === cl.id);
      if (cl.status === 'breached' && prevCl?.status === 'fulfilled') {
        const clauseName = cl.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const body = `The "${clauseName}" clause has been violated. The Old Master's reward is suspended until you restore it.`;
        ns = push(ns, 'urgent', '📜', 'Clause Breached', body, now,
          { msg: `"${clauseName}" clause breached  -  reward suspended.`, kind: 'warn', durationMs: 4_000 });
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
      ns = push(ns, 'info', '👥', 'Team Crisis', body, now,
        { msg: 'Workforce is burning out  -  rally them soon.', kind: 'warn', durationMs: 3_500 });
    }
  }

  // 7. Public confidence dropped to Crisis level (< 20)
  const prevConf = prev.publicAffairs?.confidence ?? 50;
  const nextConf = next.publicAffairs?.confidence ?? 50;
  if (nextConf < 20 && prevConf >= 20) {
    const knownAgitator = (next.intel?.vendettas ?? [])[0];
    const agitatorName = knownAgitator ? getRivalConfig(knownAgitator.rivalId)?.name : undefined;
    const body = agitatorName
      ? `Public confidence at crisis level. Intel links this to ${agitatorName}'s recent campaign against you. Issue a statement now.`
      : 'Public confidence has reached crisis levels. Issue a statement before your production suffers.';
    ns = push(ns, 'urgent', '📢', 'Confidence Crisis', body, now,
      { msg: 'Public confidence critical  -  issue a statement.', kind: 'bad', durationMs: 4_000 });
  }

  // 8. Titan has noticed the player (from Pantheon system).
  for (const t of next.pantheon?.titans ?? []) {
    const prevT = (prev.pantheon?.titans ?? []).find((p) => p.id === t.id);
    if (t.hasNoticedPlayer && !prevT?.hasNoticedPlayer) {
      const titanName = getPantheonConfig(t.id)?.name ?? 'A Pantheon titan';
      const body = `${titanName} has taken notice of your empire. A Pantheon titan is watching - check the Pantheon standings.`;
      ns = push(ns, 'success', '🌐', `${titanName} Noticed You`, body, now,
        { msg: `${titanName} is watching your empire.`, kind: 'good', durationMs: 4_000 });
    }
  }

  // 9. Player surpassed a titan's estimated valuation.
  const prevLE = prev.lifetimeEarnings ?? 0;
  const nextLE = next.lifetimeEarnings ?? 0;
  for (const t of next.pantheon?.titans ?? []) {
    if (nextLE >= t.estimatedValuation && prevLE < t.estimatedValuation) {
      const titanName = getPantheonConfig(t.id)?.name ?? 'A Pantheon titan';
      const body = `Your empire has surpassed ${titanName} in estimated valuation. The Pantheon cannot ignore you now.`;
      ns = push(ns, 'success', '👑', `Surpassed ${titanName}!`, body, now,
        { msg: `You have surpassed ${titanName}!`, kind: 'good', durationMs: 5_000 });
    }
  }

  // 10. Vendetta declared against you.
  for (const v of next.intel?.vendettas ?? []) {
    const prevV = (prev.intel?.vendettas ?? []).find((pv) => pv.rivalId === v.rivalId);
    if (!prevV) {
      const rivalName = getRivalConfig(v.rivalId)?.name ?? 'A rival';
      const body = `${rivalName} has declared a personal vendetta against you. Their attacks will intensify and target your weakest fronts. Check the War Room.`;
      ns = push(ns, 'urgent', '🔥', `${rivalName}: Vendetta`, body, now,
        { msg: `${rivalName} declared vendetta  -  this just got personal.`, kind: 'bad', durationMs: 4_500 });
    }
  }

  // 12. Companion trust milestone (25 / 50 / 75 / 100).
  const TRUST_MILESTONES = [25, 50, 75, 100];
  for (const comp of next.companions ?? []) {
    const prevComp = (prev.companions ?? []).find(c => c.id === comp.id);
    if (!prevComp) continue;
    for (const milestone of TRUST_MILESTONES) {
      if (comp.trust >= milestone && prevComp.trust < milestone) {
        const cfg = getCompanionConfig(comp.id);
        const cName = cfg?.name ?? 'Your companion';
        const milestoneLabel =
          milestone <= 25 ? 'opened up to you' :
          milestone <= 50 ? 'trusts you as a partner' :
          milestone <= 75 ? 'considers this a real alliance' :
          'is fully committed  -  their loyalty is absolute';
        const body = `${cName} ${milestoneLabel}. Their strongest abilities are now available to you.`;
        ns = push(ns, 'success', '🤝', `${cName}: Trust Milestone`, body, now,
          { msg: `${cName} trust milestone reached.`, kind: 'good', durationMs: 3_500 });
      }
    }
  }

  // 11. Breaking news in The Ledger.
  const nextNews = next.newspaper?.items ?? [];
  const prevNews = prev.newspaper?.items ?? [];
  const newBreaking = nextNews.find(
    (n) => n.isBreaking && !prevNews.some((p) => p.id === n.id)
  );
  if (newBreaking) {
    ns = push(ns, 'info', '🔴', 'Breaking: Ledger', newBreaking.headline, now,
      { msg: newBreaking.headline, kind: 'warn', durationMs: 4_000 });
  }

  return ns;
}
