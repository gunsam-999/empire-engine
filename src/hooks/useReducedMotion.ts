// useReducedMotion — single source of truth for "should we calm the motion?".
//
// Returns true when EITHER the player toggled "Reduce motion" in Settings OR the
// OS-level prefers-reduced-motion media query is set. Components gate ambient
// backdrops, FX particles, and celebration bursts on this so the experience is
// comfortable and accessible without duplicating the check everywhere.

import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Live OS-level reduced-motion preference. */
function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia(QUERY).matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    // addEventListener is the modern API; older Safari used addListener.
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}

export function useReducedMotion(): boolean {
  const { state } = useGame();
  const system = useSystemReducedMotion();
  return system || !!state.settings.reduceMotion;
}
