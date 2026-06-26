// ============================================================================
// GameShell — the persistent app frame for the playing experience.
//
//   ┌────────────────────────────┐  ← fixed TopBar (identity, cash, currencies)
//   │  scrollable content (pb-24)│  ← the active screen, scrolls under the bars
//   └────────────────────────────┘  ← fixed BottomNav (5 tabs)
//
// Everything lives inside a centered max-w-[480px] mobile column. The content
// region gets top/bottom padding so the fixed bars never cover it, and a
// `key` on the scroll container so switching tabs replays the fade-in.
// ============================================================================

import type { ReactNode } from 'react';
import TopBar, { type OverlayId } from './TopBar';
import BottomNav, { type TabId } from './BottomNav';

export interface GameShellProps {
  /** Currently selected bottom-nav tab (for highlight + scroll reset). */
  activeTab: TabId;
  /** Switch tabs. */
  onTabChange: (tab: TabId) => void;
  /** Open a header overlay (story / territory / settings). */
  onOpenOverlay: (id: OverlayId) => void;
  /** The active screen's content. */
  children: ReactNode;
}

export default function GameShell({
  activeTab,
  onTabChange,
  onOpenOverlay,
  children,
}: GameShellProps) {
  return (
    <div className="relative mx-auto min-h-screen max-w-[480px] bg-[#070b12]">
      <TopBar onOpenOverlay={onOpenOverlay} />

      {/* Scrollable content. pt clears the (3-row) TopBar, pb-24 clears the nav.
          Re-keyed per tab so each screen fades/slides in fresh. */}
      <main
        key={activeTab}
        className="no-scrollbar animate-fade-in min-h-screen px-3 pt-[148px] pb-24"
      >
        {children}
      </main>

      <BottomNav active={activeTab} onChange={onTabChange} />
    </div>
  );
}
