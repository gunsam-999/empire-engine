// Time formatting helpers.

/** "2h 3m", "45s", "3d 4h" — coarse human duration from seconds. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** "01:23" / "1:02:03" style countdown from milliseconds remaining. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/** Fraction complete in [0,1] for a window between startedAt and endsAt (ms). */
export function progressOf(startedAt: number, endsAt: number, now: number = Date.now()): number {
  if (endsAt <= startedAt) return 1;
  return Math.min(1, Math.max(0, (now - startedAt) / (endsAt - startedAt)));
}
