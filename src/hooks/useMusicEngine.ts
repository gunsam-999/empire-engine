// useMusicEngine  -  wires the game state into MusicEngine.
//
// Lifecycle:
//   • Music starts on the first user gesture (click / touchstart) to satisfy
//     browsers' autoplay policy. This is the same moment AudioEngine's first
//     sfx.play() would fire, so the AudioContext is already warm.
//   • Syncs music.setEnabled() whenever state.settings.music changes.
//   • Sends a lightweight state snapshot to music.updateState() on state changes
//     that affect the score (era, rival threat, market boom).
//   • Stops the engine on component unmount (tab hidden / app close).

import { useEffect, useRef } from 'react';
import { useGame } from '../game/GameContext';
import { music } from '../systems/MusicEngine';

export function useMusicEngine(): void {
  const { state } = useGame();
  const started = useRef(false);

  // ------ Start on first user gesture (satisfies autoplay policy) ------------
  useEffect(() => {
    const tryStart = () => {
      if (started.current) return;
      if (state.settings.music === false) return;
      music.start();
      started.current = true;
    };
    document.addEventListener('click', tryStart, { once: true });
    document.addEventListener('touchstart', tryStart, { once: true, passive: true });
    return () => {
      // Only needed if the component unmounts before any gesture.
      document.removeEventListener('click', tryStart);
      document.removeEventListener('touchstart', tryStart);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------ Sync enabled toggle from settings ----------------------------------
  useEffect(() => {
    const on = state.settings.music !== false; // default: true
    music.setEnabled(on);
    if (on && !started.current) {
      // User re-enabled music via settings  -  start if we haven't yet
      // (requires a prior gesture to have already unlocked the AudioContext,
      // which is guaranteed since the settings panel requires clicking into it).
      music.start();
      started.current = true;
    }
  }, [state.settings.music]);

  // ------ Feed era / threat / market snapshot --------------------------------
  useEffect(() => {
    const rivals = state.rivals ?? [];
    const now = Date.now();
    const activeThreatCount = rivals.filter(
      (r) =>
        r.posture === 'HOSTILE' ||
        r.posture === 'WAR' ||
        (r.telegraph !== null && (r.telegraph?.executesAt ?? 0) > now),
    ).length;

    music.updateState({
      era: state.director?.currentPhase ?? 'BOOTSTRAPPING',
      rivalThreat: Math.min(1, activeThreatCount / 3),
      marketBoom: (state.market?.priceMul ?? 1) > 1.12,
    });
  }, [
    state.director?.currentPhase,
    state.rivals,
    state.market?.priceMul,
  ]);

  // ------ Cleanup on unmount -------------------------------------------------
  useEffect(() => () => { music.stop(); }, []);
}
