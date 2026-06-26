// useGameLoop — start the rAF game loop bound to a dispatch. Optional hook;
// GameProvider already wires the loop internally, but UI/tests may use this.

import { useEffect } from 'react';
import { startGameLoop } from '../game/GameLoop';
import type { Action } from '../game/types';

export function useGameLoop(dispatch: (action: Action) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handle = startGameLoop(dispatch);
    return () => handle.stop();
  }, [dispatch, enabled]);
}
