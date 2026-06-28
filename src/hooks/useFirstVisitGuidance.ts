// Fires a guidance beat exactly once when a UI screen is first visited.
// Dispatches GUIDANCE_QUEUE only if the beat hasn't been seen yet.

import { useEffect, useRef } from 'react';
import { useGame } from '../game/GameContext';

export function useFirstVisitGuidance(beatId: string) {
  const { state, dispatch } = useGame();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const seen = state.guidance?.seen ?? [];
    if (seen.includes(beatId)) return;
    firedRef.current = true;
    // Small delay so the screen has rendered before the aide pops up
    const timer = setTimeout(() => {
      dispatch({ type: 'GUIDANCE_QUEUE', id: beatId });
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
