// useFirstVisit — queues a co-founder guidance beat the first time a screen is visited.
// Call once at the top of any screen component. Fires after a 1.5s settling delay
// so the screen is visible before the popup appears.

import { useEffect, useRef } from 'react';
import { useGame } from '../game/GameContext';

export function useFirstVisit(beatId: string) {
  const { state, dispatch } = useGame();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const g = state.guidance;
    if (!g) return;
    if (g.seen.includes(beatId) || g.queue.includes(beatId) || g.dismissed.includes(beatId)) {
      firedRef.current = true;
      return;
    }
    firedRef.current = true;
    const t = setTimeout(() => {
      dispatch({ type: 'GUIDANCE_QUEUE', id: beatId });
    }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally fires only on mount
}
