// useOfflineEarnings  -  convenience accessor for the offline summary from context.

import { useGame } from '../game/GameContext';
import type { OfflineSummary } from '../game/types';

export function useOfflineEarnings(): {
  summary: OfflineSummary | null;
  dismiss: () => void;
} {
  const { offlineSummary, dismissOffline } = useGame();
  return { summary: offlineSummary, dismiss: dismissOffline };
}
