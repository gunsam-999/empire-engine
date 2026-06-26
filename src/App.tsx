// ============================================================================
// App — the integrated root. Owns the top-level router for the playing
// experience and the transient overlays/drivers that float above it.
//
//   • No setup yet -> full-screen IndustrySelect (founding flow).
//   • Setup exists -> GameShell (TopBar + active screen + BottomNav).
//       - BottomNav tabs:  Empire / Research / Advisors / Market / Prestige.
//       - TopBar overlays: Story / Territory / Settings (full-screen sheets).
//   • Always mounted: ToastHost, WelcomeBackModal (offline summary), a
//     GoldenBubble that appears on a timer, and a micro-event driver.
//
// The game loop + autosave + accent var live inside GameProvider already, so
// this file does NOT re-mount them.
// ============================================================================

import { useEffect, useRef, useState } from 'react';

import { GameProvider, useGame } from './game/GameContext';
import GameShell from './components/layout/GameShell';
import type { TabId } from './components/layout/BottomNav';
import type { OverlayId } from './components/layout/TopBar';

import IndustrySelect from './components/screens/IndustrySelect';
import EmpireScreen from './components/screens/EmpireScreen';
import ResearchScreen from './components/screens/ResearchScreen';
import AdvisorScreen from './components/screens/AdvisorScreen';
import MarketScreen from './components/screens/MarketScreen';
import PrestigeScreen from './components/screens/PrestigeScreen';
import StoryScreen from './components/screens/StoryScreen';
import TerritoryScreen from './components/screens/TerritoryScreen';
import SettingsScreen from './components/screens/SettingsScreen';

import WelcomeBackModal from './components/screens/WelcomeBackModal';
import GoldenBubble from './components/screens/GoldenBubble';
import EventModal from './components/screens/EventModal';

import { ToastHost } from './components/shared/ToastNotification';
import Modal from './components/shared/Modal';

import { MICRO_EVENTS, type GameEvent } from './data/events';
import { pick } from './utils/random';

// ---- Tab -> screen ----------------------------------------------------------

function ActiveScreen({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'empire':
      return <EmpireScreen />;
    case 'research':
      return <ResearchScreen />;
    case 'advisors':
      return <AdvisorScreen />;
    case 'market':
      return <MarketScreen />;
    case 'prestige':
      return <PrestigeScreen />;
    default:
      return <EmpireScreen />;
  }
}

// ---- Overlay (header sheets) ------------------------------------------------

const OVERLAY_META: Record<OverlayId, { icon: string; title: string }> = {
  story: { icon: '📖', title: 'Saga' },
  territory: { icon: '🗺️', title: 'Territory' },
  settings: { icon: '⚙️', title: 'Settings' },
};

function OverlaySheet({ id, onClose }: { id: OverlayId; onClose: () => void }) {
  const meta = OVERLAY_META[id];
  return (
    <Modal icon={meta.icon} title={meta.title} onClose={onClose} size="lg">
      {id === 'story' && <StoryScreen />}
      {id === 'territory' && <TerritoryScreen />}
      {id === 'settings' && <SettingsScreen />}
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
  const { state, offlineSummary } = useGame();
  const [tab, setTab] = useState<TabId>('empire');
  const [overlay, setOverlay] = useState<OverlayId | null>(null);

  const hasSetup = state.setup !== null;

  // Suppress floating events while any blocking surface is open, or while
  // there's a story beat waiting (the story badge should grab attention first).
  const blocking =
    overlay !== null || offlineSummary !== null || state.story.queue.length > 0;

  const golden = useGoldenBubble(hasSetup);
  const micro = useMicroEvents(hasSetup, blocking);

  if (!hasSetup) {
    return (
      <>
        <IndustrySelect />
        <ToastHost />
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

      <ToastHost />
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
