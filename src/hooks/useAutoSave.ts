// useAutoSave  -  periodic + on-hide save of game state. GameProvider wires this
// internally; exposed for components/tests that want explicit control.

import { useEffect, useRef } from 'react';
import { saveGame } from '../game/SaveSystem';
import type { GameState } from '../game/types';

export function useAutoSave(state: GameState, intervalMs = 30_000): void {
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const tick = setInterval(() => {
      if (ref.current.setup) saveGame(ref.current);
    }, intervalMs);

    const onHide = () => {
      if (document.hidden && ref.current.setup) saveGame(ref.current);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onHide);

    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [intervalMs]);
}
