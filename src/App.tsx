// ============================================================================
// App — the integrated root. Owns the top-level phase machine:
//
//   'intro'  → RyNoIntro (brand ident, 2.5s)
//   'home'   → HomeScreen (new-game modes + load-game, no save exists)
//   'game'   → GameShell (full playing experience)
//              if state.setup === null → IndustrySelect first
//
// Also mounts globally: ToastHost, FxLayer, CelebrationHost, WelcomeBackModal,
// GoldenBubble, micro-event driver, co-founder guidance driver,
// AmbientCharacterLayer, PWA update banner.
// ============================================================================

import { useEffect, useRef, useState } from 'react';

import { GameProvider, useGame, getGuidanceBeat } from './game/GameContext';
import type { GameMode } from './game/types';
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
import IntelScreen from './components/screens/IntelScreen';
import StoryScreen from './components/screens/StoryScreen';
import TerritoryScreen from './components/screens/TerritoryScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import RyNoIntro from './components/screens/RyNoIntro';
import HomeScreen from './components/screens/HomeScreen';

import WelcomeBackModal from './components/screens/WelcomeBackModal';
import GoldenBubble from './components/screens/GoldenBubble';
import EventModal from './components/screens/EventModal';
import GuidancePopup from './components/screens/GuidancePopup';

import { ToastHost } from './components/shared/ToastNotification';
import { FxLayer } from './components/shared/FxLayer';
import { CelebrationHost } from './components/shared/CelebrationHost';
import Modal from './components/shared/Modal';
import NotificationDrawer from './components/shared/NotificationDrawer';
import AmbientCharacterLayer from './components/shared/AmbientCharacterLayer';

import { sfx } from './systems/AudioEngine';
import { setHapticsEnabled } from './utils/haptics';
import { useCelebrations } from './hooks/useCelebrations';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useFirstHourHaptics } from './hooks/useFirstHourHaptics';

import { MICRO_EVENTS, type GameEvent } from './data/events';
import { pick } from './utils/random';

// ---- Tab -> screen ----------------------------------------------------------

function ActiveScreen({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'empire':    return <EmpireScreen />;
    case 'marketing': return <MarketingScreen />;
    case 'research':  return <ResearchScreen />;
    case 'invest':    return <InvestmentScreen />;
    case 'prestige':  return <PrestigeScreen />;
    case 'intel':     return <IntelScreen />;
    default:          return <EmpireScreen />;
  }
}

// ---- Overlay (header sheets) ------------------------------------------------

const OVERLAY_META: Record<OverlayId, { icon: string; title: string }> = {
  story:         { icon: '📖', title: 'Saga' },
  advisors:      { icon: '🃏', title: 'Advisors' },
  territory:     { icon: '🗺️', title: 'Territory' },
  settings:      { icon: '⚙️', title: 'Settings' },
  notifications: { icon: '🔔', title: 'Notifications' },
};

function OverlaySheet({ id, onClose }: { id: OverlayId; onClose: () => void }) {
  const meta = OVERLAY_META[id];
  return (
    <Modal icon={meta.icon} title={meta.title} onClose={onClose} size="lg">
      {id === 'story'         && <StoryScreen />}
      {id === 'advisors'      && <AdvisorScreen />}
      {id === 'territory'     && <TerritoryScreen />}
      {id === 'settings'      && <SettingsScreen />}
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
      if (!show && Date.now() >= nextAt.current) setShow(true);
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

// ---- PWA update banner -------------------------------------------------------

function useSwUpdatePending(): boolean {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      if (reg.waiting) { setPending(true); return; }
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            setPending(true);
          }
        });
      });
    });
  }, []);
  return pending;
}

function UpdateBanner() {
  const [dismissed, setDismissed] = useState(false);
  const swPending = useSwUpdatePending();

  if (!swPending || dismissed) return null;

  function applyUpdate() {
    navigator.serviceWorker.ready.then(reg => {
      reg.waiting?.postMessage('SKIP_WAITING');
    });
    setTimeout(() => window.location.reload(), 300);
  }

  return (
    <div
      className="fixed top-0 inset-x-0 z-[150] flex items-center justify-between gap-2 px-4 py-2.5 max-w-[480px] mx-auto"
      style={{
        background: 'linear-gradient(90deg, rgba(90,74,242,0.95), rgba(124,99,255,0.95))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="text-xs font-semibold text-white">🔄 Empire Engine update ready</div>
      <div className="flex gap-2">
        <button
          onClick={applyUpdate}
          className="text-xs font-bold text-white bg-white/20 rounded-lg px-3 py-1 active:scale-95 transition-transform"
        >
          Refresh
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-white/60 px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ---- The playing experience -------------------------------------------------

type AppPhase = 'intro' | 'home' | 'game';

function Game() {
  const { state, dispatch, offlineSummary } = useGame();
  const [tab, setTab] = useState<TabId>('empire');
  const [overlay, setOverlay] = useState<OverlayId | null>(null);
  const [phase, setPhase] = useState<AppPhase>('intro');
  const [preferredMode, setPreferredMode] = useState<GameMode>('inheritance');

  const hasSetup = state.setup !== null;

  // Keep audio + haptic engines in sync with preferences.
  useEffect(() => { sfx.setEnabled(state.settings.sound); }, [state.settings.sound]);
  useEffect(() => { setHapticsEnabled(state.settings.haptics); }, [state.settings.haptics]);

  useCelebrations();
  useMusicEngine();
  useFirstHourHaptics();

  const guidanceQueued = state.guidance.queue.length > 0;
  const storyQueued    = state.story.queue.length > 0;
  const blocking = overlay !== null || offlineSummary !== null || storyQueued || guidanceQueued;

  const guidanceBeatId =
    guidanceQueued && overlay === null && offlineSummary === null && !storyQueued
      ? state.guidance.queue[0]
      : null;
  const guidanceBeat = guidanceBeatId ? getGuidanceBeat(guidanceBeatId) : undefined;

  const golden = useGoldenBubble(hasSetup && phase === 'game');
  const micro  = useMicroEvents(hasSetup && phase === 'game', blocking);

  // ---- Intro phase -----------------------------------------------------------
  if (phase === 'intro') {
    return (
      <>
        <RyNoIntro
          onDone={() => setPhase(hasSetup ? 'game' : 'home')}
        />
        <ToastHost />
      </>
    );
  }

  // ---- Home screen (no save exists) ------------------------------------------
  if (phase === 'home' && !hasSetup) {
    return (
      <>
        <HomeScreen
          onNewGame={(mode) => {
            setPreferredMode(mode);
            setPhase('game');
          }}
        />
        <ToastHost />
        <UpdateBanner />
      </>
    );
  }

  // ---- Onboarding (game phase, no setup yet) ----------------------------------
  if (!hasSetup) {
    return (
      <>
        <IndustrySelect initialMode={preferredMode} />
        <ToastHost />
        <FxLayer />
        <CelebrationHost />
        <UpdateBanner />
      </>
    );
  }

  // ---- Full playing experience ------------------------------------------------
  return (
    <>
      <GameShell activeTab={tab} onTabChange={setTab} onOpenOverlay={setOverlay}>
        <ActiveScreen tab={tab} />
      </GameShell>

      {overlay && <OverlaySheet id={overlay} onClose={() => setOverlay(null)} />}

      <WelcomeBackModal />

      {micro.event && <EventModal event={micro.event} onClose={micro.close} />}

      {golden.show && <GoldenBubble onDone={golden.done} lifespanSec={12} />}

      {guidanceBeat && (
        <GuidancePopup
          key={guidanceBeat.id}
          beat={guidanceBeat}
          onDismiss={() => dispatch({ type: 'GUIDANCE_SEEN', id: guidanceBeat.id })}
        />
      )}

      {/* Ambient character layer — co-founder + rival pop-ins */}
      <AmbientCharacterLayer blocked={blocking || !!micro.event || !!overlay} />

      <UpdateBanner />
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
