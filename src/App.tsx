// ============================================================================
// App  -  the integrated root. Owns the top-level router for the playing
// experience and the transient overlays/drivers that float above it.
//
//   • No setup yet -> full-screen IndustrySelect (founding flow).
//   • Setup exists -> GameShell (TopBar + active screen + BottomNav).
//       - BottomNav tabs:  Empire / Marketing / Research / Market / Prestige.
//       - TopBar overlays: Story / Advisors / Territory / Settings (sheets).
//   • Always mounted: ToastHost, WelcomeBackModal (offline summary), a
//     GoldenBubble that appears on a timer, a micro-event driver, and the
//     co-founder GUIDANCE driver (coaching pop-ups).
//
// The game loop + autosave + accent var live inside GameProvider already, so
// this file does NOT re-mount them.
// ============================================================================

import { useEffect, useRef, useState } from 'react';

import { GameProvider, useGame, getGuidanceBeat } from './game/GameContext';
import GameShell from './components/layout/GameShell';
import type { TabId } from './components/layout/BottomNav';
import type { OverlayId } from './components/layout/TopBar';

import IndustrySelect from './components/screens/IndustrySelect';
import EmpireScreen from './components/screens/EmpireScreen';
import MarketingScreen from './components/screens/MarketingScreen';
import ResearchScreen from './components/screens/ResearchScreen';
import AdvisorScreen from './components/screens/AdvisorScreen';
import InvestmentScreen from './components/screens/InvestmentScreen';
import PrestigeScreen from './components/screens/PrestigeScreen';
import StoryScreen from './components/screens/StoryScreen';
import TerritoryScreen from './components/screens/TerritoryScreen';
import SettingsScreen from './components/screens/SettingsScreen';

import WelcomeBackModal from './components/screens/WelcomeBackModal';
import GoldenBubble from './components/screens/GoldenBubble';
import EventModal from './components/screens/EventModal';
import GuidancePopup from './components/screens/GuidancePopup';

import { ToastHost } from './components/shared/ToastNotification';
import { FxLayer } from './components/shared/FxLayer';
import { CelebrationHost } from './components/shared/CelebrationHost';
import Modal from './components/shared/Modal';
import NotificationDrawer from './components/shared/NotificationDrawer';

import { sfx } from './systems/AudioEngine';
import { setHapticsEnabled } from './utils/haptics';
import { useCelebrations } from './hooks/useCelebrations';
import { useMusicEngine } from './hooks/useMusicEngine';

import { MICRO_EVENTS, type GameEvent } from './data/events';
import { pick } from './utils/random';

// ---- Tab -> screen ----------------------------------------------------------

function ActiveScreen({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'empire':
      return <EmpireScreen />;
    case 'marketing':
      return <MarketingScreen />;
    case 'research':
      return <ResearchScreen />;
    case 'invest':
      return <InvestmentScreen />;
    case 'prestige':
      return <PrestigeScreen />;
    default:
      return <EmpireScreen />;
  }
}

// ---- Overlay (header sheets) ------------------------------------------------

const OVERLAY_META: Record<OverlayId, { icon: string; title: string }> = {
  story: { icon: '📖', title: 'Saga' },
  advisors: { icon: '🃏', title: 'Advisors' },
  territory: { icon: '🗺️', title: 'Territory' },
  settings: { icon: '⚙️', title: 'Settings' },
  notifications: { icon: '🔔', title: 'Notifications' },
};

function OverlaySheet({ id, onClose }: { id: OverlayId; onClose: () => void }) {
  const meta = OVERLAY_META[id];
  return (
    <Modal icon={meta.icon} title={meta.title} onClose={onClose} size="lg">
      {id === 'story' && <StoryScreen />}
      {id === 'advisors' && <AdvisorScreen />}
      {id === 'territory' && <TerritoryScreen />}
      {id === 'settings' && <SettingsScreen />}
      {id === 'notifications' && <NotificationDrawer />}
    </Modal>
  );
}

// ---- Golden-bubble driver: appears every 60-180s, auto-despawns ~12s --------

function GOLDEN_INTERVAL_MS(): number {
  return (60 + Math.random() * 120) * 1000;
}

function useGoldenBubble(active: boolean): { show: boolean; done: () => void } {
  const [show, setShow] = useState(false);
  const nextAt = useRef<number>(Date.now() + GOLDEN_INTERVAL_MS());

  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => {
      if (!show && Date.now() >= nextAt.current) {
        setShow(true);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [active, show]);

  const done = () => {
    setShow(false);
    nextAt.current = Date.now() + GOLDEN_INTERVAL_MS();
  };

  return { show, done };
}

// ---- Micro-event driver: every ~45-120s present a random micro event --------

function MICRO_INTERVAL_MS(): number {
  return (45 + Math.random() * 75) * 1000;
}

function useMicroEvents(active: boolean, suppressed: boolean): {
  event: GameEvent | null;
  close: () => void;
} {
  const [event, setEvent] = useState<GameEvent | null>(null);
  const nextAt = useRef<number>(Date.now() + MICRO_INTERVAL_MS());

  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => {
      // Don't spam: only fire when nothing else is on screen.
      if (!event && !suppressed && Date.now() >= nextAt.current) {
        setEvent(pick(MICRO_EVENTS));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [active, event, suppressed]);

  const close = () => {
    setEvent(null);
    nextAt.current = Date.now() + MICRO_INTERVAL_MS();
  };

  return { event, close };
}

// ---- The playing experience -------------------------------------------------

function Game() {
  const { state, dispatch, offlineSummary } = useGame();
  const [tab, setTab] = useState<TabId>('empire');
  const [overlay, setOverlay] = useState<OverlayId | null>(null);

  const hasSetup = state.setup !== null;

  // Keep the audio + haptic engines in sync with the player's preferences.
  useEffect(() => {
    sfx.setEnabled(state.settings.sound);
  }, [state.settings.sound]);
  useEffect(() => {
    setHapticsEnabled(state.settings.haptics);
  }, [state.settings.haptics]);

  // Watch for milestone / echelon / era / prestige moments and celebrate them.
  useCelebrations();

  // Adaptive procedural music  -  starts on first gesture, tracks era/threat.
  useMusicEngine();

  // ---- Guidance (co-founder coaching) driver -------------------------------
  // The reducer queues eligible beat ids into state.guidance.queue (min-interval
  // gated). App decides WHEN to actually surface the head of the queue: only
  // when nothing else is grabbing attention (no overlay, no offline summary, no
  // pending story beat). The popup self-handles its dismiss animation, then we
  // dispatch GUIDANCE_SEEN to retire it.
  const guidanceQueued = state.guidance.queue.length > 0;
  const storyQueued = state.story.queue.length > 0;

  // Suppress floating events while any blocking surface is open, while there's a
  // story beat waiting (the story badge should grab attention first), or while a
  // coaching pop-up is on screen.
  const blocking =
    overlay !== null || offlineSummary !== null || storyQueued || guidanceQueued;

  // Show the head guidance beat only when no heavier surface is competing.
  const guidanceBeatId =
    guidanceQueued && overlay === null && offlineSummary === null && !storyQueued
      ? state.guidance.queue[0]
      : null;
  const guidanceBeat = guidanceBeatId ? getGuidanceBeat(guidanceBeatId) : undefined;

  const golden = useGoldenBubble(hasSetup);
  const micro = useMicroEvents(hasSetup, blocking);

  if (!hasSetup) {
    return (
      <>
        <IndustrySelect />
        <ToastHost />
        <FxLayer />
        <CelebrationHost />
      </>
    );
  }

  return (
    <>
      <GameShell
        activeTab={tab}
        onTabChange={setTab}
        onOpenOverlay={setOverlay}
      >
        <ActiveScreen tab={tab} />
      </GameShell>

      {overlay && <OverlaySheet id={overlay} onClose={() => setOverlay(null)} />}

      <WelcomeBackModal />

      {micro.event && <EventModal event={micro.event} onClose={micro.close} />}

      {golden.show && <GoldenBubble onDone={golden.done} lifespanSec={12} />}

      {/* Co-founder coaching pop-up  -  keyed by id so each beat mounts fresh
          (re-runs its line-by-line reveal animation). */}
      {guidanceBeat && (
        <GuidancePopup
          key={guidanceBeat.id}
          beat={guidanceBeat}
          onDismiss={() => dispatch({ type: 'GUIDANCE_SEEN', id: guidanceBeat.id })}
        />
      )}

      <ToastHost />
      <FxLayer />
      <CelebrationHost />
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
