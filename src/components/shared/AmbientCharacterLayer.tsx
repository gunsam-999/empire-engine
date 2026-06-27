// ============================================================================
// AmbientCharacterLayer — floating ambient character appearances above the game.
//
// Uses CharacterPresence to show brief co-founder pop-ins (from left) and
// rival cameos (from right) based on live game state signals. These appear
// for 1–3 lines, auto-dismiss, and never block the player.
//
// Scheduling rules:
//   • Minimum 60s gap between ANY ambient appearance.
//   • Co-founder appears when: 30s after start, rivals escalate, milestones hit.
//   • Rival appears when: rival posture ≥ 3 (escalated), 1 per rival max per 5m.
//   • Never fires while a modal/overlay/story beat is on screen (blocked prop).
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import CharacterPresence, { type CharacterPresenceConfig } from './CharacterPresence';
import { useGame } from '../../game/GameContext';

export interface AmbientCharacterLayerProps {
  /** True when any heavier surface (modal, story, guidance) is on screen. */
  blocked: boolean;
}

interface AmbientAppearance {
  character: CharacterPresenceConfig;
}

// ---- Co-founder ambient line pools ------------------------------------------
const CF_LINES_NEUTRAL = [
  ["Numbers are moving. Keep feeding the engine."],
  ["The market just ticked in our favour. Small wins add up."],
  ["We're building something real here. Don't forget that."],
  ["I've been watching the dashboard. Solid pace."],
];

const CF_LINES_INCOME_UP = [
  ["Revenue's climbing. Whatever you just did — do more of it."],
  ["That's a new high watermark. The team can feel it too."],
  ["Cash flow is singing right now. Let it compound."],
];

const CF_LINES_RIVAL = [
  ["Rivals are watching us. We should be watching them harder."],
  ["Someone's making moves in our territory. Intel Desk might be useful."],
  ["Pressure builds character, right? We've been tested before."],
];

const CF_LINES_WELCOME_BACK = [
  ["You're back. Things moved while you were out — check the feed."],
  ["Welcome back. The empire kept running. Let's see what it built."],
  ["Good timing. A few things need your eye."],
];

// ---- Rival cameo line pools --------------------------------------------------
const RIVAL_LINES: Record<string, string[]> = {
  default: [
    "Still here? I was starting to think you'd given up.",
    "Comfortable is dangerous. Enjoy it while it lasts.",
    "I've been studying your moves. Predictable.",
  ],
};

// ---- Main component ----------------------------------------------------------

export default function AmbientCharacterLayer({ blocked }: AmbientCharacterLayerProps) {
  const { state } = useGame();
  const [current, setCurrent] = useState<AmbientAppearance | null>(null);
  const lastShownAt = useRef<number>(0);
  const sessionStartRef = useRef<number>(Date.now());
  const prevIncomeRef = useRef<number>(0);
  const prevRivalCountRef = useRef<number>(0);
  const sessionReturnChecked = useRef(false);

  // Dismiss the current appearance
  const dismiss = useCallback(() => {
    setCurrent(null);
    lastShownAt.current = Date.now();
  }, []);

  // Show an appearance (only if not blocked and cooldown respected)
  const show = useCallback((appearance: AmbientAppearance) => {
    if (blocked) return;
    if (Date.now() - lastShownAt.current < 60_000) return;
    if (current) return;
    setCurrent(appearance);
  }, [blocked, current]);

  // Build a co-founder config from current game state
  const buildCofounder = useCallback((lines: string[]): CharacterPresenceConfig => {
    const cf = state.cofounder;
    return {
      avatar: { ...cf.avatar },
      name: cf.name,
      role: cf.role,
      side: 'left',
      lines,
      onComplete: dismiss,
    };
  }, [state.cofounder, dismiss]);

  // ---- Trigger: welcome back (RETURNING session) --------------------------------
  useEffect(() => {
    if (sessionReturnChecked.current || blocked) return;
    sessionReturnChecked.current = true;
    const elapsed = (Date.now() - (state.lastSaved ?? 0));
    if (elapsed > 2 * 60 * 60 * 1000) { // 2+ hour gap
      const t = setTimeout(() => {
        show({ character: buildCofounder(pick(CF_LINES_WELCOME_BACK)) });
      }, 5000);
      return () => clearTimeout(t);
    }
    // First-session 30s nudge
    const t = setTimeout(() => {
      if (!blocked && Date.now() - lastShownAt.current > 30_000) {
        show({ character: buildCofounder(pick(CF_LINES_NEUTRAL)) });
      }
    }, 35_000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Trigger: income spike ---------------------------------------------------
  useEffect(() => {
    const inc = state.events?.boost?.mult ? 1 : 0; // simple proxy for now
    if (inc && prevIncomeRef.current === 0) {
      prevIncomeRef.current = 1;
      show({ character: buildCofounder(pick(CF_LINES_INCOME_UP)) });
    }
  }, [state.events, show, buildCofounder]);

  // ---- Trigger: rival count increases -----------------------------------------
  useEffect(() => {
    const HOSTILE_POSTURES = new Set(['PROVOKED', 'HOSTILE', 'WAR']);
    const count = (state.rivals ?? []).filter(r => HOSTILE_POSTURES.has((r as { posture?: string }).posture ?? '')).length;
    if (count > prevRivalCountRef.current) {
      prevRivalCountRef.current = count;
      show({ character: buildCofounder(pick(CF_LINES_RIVAL)) });
    }
  }, [state.rivals, show, buildCofounder]);

  // ---- Periodic ambient appearance (every ~90s while active) ------------------
  useEffect(() => {
    const id = setInterval(() => {
      if (blocked || current || Date.now() - lastShownAt.current < 90_000) return;
      if (Date.now() - sessionStartRef.current < 30_000) return;
      show({ character: buildCofounder(pick(CF_LINES_NEUTRAL)) });
    }, 15_000);
    return () => clearInterval(id);
  }, [blocked, current, show, buildCofounder]);

  if (!current || blocked) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col pointer-events-none"
      aria-label="character presence"
    >
      {/* Scrim only at bottom where character stands */}
      <div
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(7,11,18,0.75) 0%, transparent 100%)' }}
      />
      <div className="mt-auto pointer-events-auto max-w-[480px] mx-auto w-full px-3 pb-28">
        <CharacterPresence {...current.character} />
      </div>
    </div>
  );
}

// ---- Helpers -----------------------------------------------------------------
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
