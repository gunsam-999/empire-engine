// useFirstHourHaptics — fires haptic patterns for consequential first-hour milestones.
// Mount this once inside the main Game component so it watches state transitions.
// Uses refs so it fires each pattern exactly once per save, even across re-renders.

import { useEffect, useRef } from 'react';
import { useGame } from '../game/GameContext';
import { haptic } from '../utils/haptics';

export function useFirstHourHaptics() {
  const { state } = useGame();
  const fired = useRef({ dollar: false, hire: false, construct: false, rival: false });

  useEffect(() => {
    if (!fired.current.dollar && state.lifetimeEarnings > 0) {
      fired.current.dollar = true;
      haptic('dollar');
    }
  }, [state.lifetimeEarnings]);

  useEffect(() => {
    if (!fired.current.hire && (state.workforce ?? []).length > 0) {
      fired.current.hire = true;
      haptic('hire');
    }
  }, [state.workforce]);

  useEffect(() => {
    if (!fired.current.construct) {
      const total = Object.values(state.facilities).reduce((s, n) => s + n, 0);
      if (total >= 2) {
        fired.current.construct = true;
        haptic('construct');
      }
    }
  }, [state.facilities]);

  useEffect(() => {
    if (!fired.current.rival && (state.rivals ?? []).length > 0) {
      fired.current.rival = true;
      haptic('rival');
    }
  }, [state.rivals]);
}
