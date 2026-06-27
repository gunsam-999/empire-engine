// GameLoop  -  requestAnimationFrame driver that dispatches TICK with real dt.
// Falls back to a 1s setInterval while the document is hidden.

import type { Action } from './types';

const MAX_DT = 5; // seconds, clamp per tick
const TICK_INTERVAL_MS = 100; // ~10 ticks/sec while visible
const HIDDEN_INTERVAL_MS = 1000;

export interface GameLoopHandle {
  stop: () => void;
}

export function startGameLoop(dispatch: (action: Action) => void): GameLoopHandle {
  let rafId = 0;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  let last = performance.now();
  let acc = 0;
  let stopped = false;

  const tick = (now: number) => {
    const elapsed = (now - last) / 1000;
    last = now;
    acc += elapsed;
    if (acc >= TICK_INTERVAL_MS / 1000) {
      const dt = Math.min(MAX_DT, acc);
      dispatch({ type: 'TICK', dt });
      acc = 0;
    }
    if (!stopped) rafId = requestAnimationFrame(tick);
  };

  const startRaf = () => {
    cancelAnimationFrame(rafId);
    last = performance.now();
    acc = 0;
    rafId = requestAnimationFrame(tick);
  };

  const startHidden = () => {
    cancelAnimationFrame(rafId);
    if (hiddenTimer) clearInterval(hiddenTimer);
    let hiddenLast = Date.now();
    hiddenTimer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(MAX_DT, (now - hiddenLast) / 1000);
      hiddenLast = now;
      dispatch({ type: 'TICK', dt });
    }, HIDDEN_INTERVAL_MS);
  };

  const onVisibility = () => {
    if (document.hidden) {
      startHidden();
    } else {
      if (hiddenTimer) {
        clearInterval(hiddenTimer);
        hiddenTimer = null;
      }
      startRaf();
    }
  };

  document.addEventListener('visibilitychange', onVisibility);

  if (document.hidden) startHidden();
  else startRaf();

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      if (hiddenTimer) clearInterval(hiddenTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
