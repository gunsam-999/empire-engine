import { useRef, useState } from 'react';
import { useGame, potentialLP, getChannel } from '../../game/GameContext';
import TabButton from '../shared/TabButton';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';

export type TabId = 'empire' | 'marketing' | 'research' | 'invest' | 'prestige' | 'intel';

export const TAB_IDS: TabId[] = ['empire', 'marketing', 'research', 'invest', 'prestige', 'intel'];

interface TabMeta {
  id: TabId;
  label: string;
  icon: string;
  desc: string;
}

const TABS: TabMeta[] = [
  {
    id: 'empire',
    label: 'Empire',
    icon: '🏭',
    desc: 'Buy & upgrade facilities to grow your income streams',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: '📣',
    desc: 'Build reach through social, content, PR and partnerships',
  },
  {
    id: 'research',
    label: 'Research',
    icon: '🔬',
    desc: 'Unlock passive multipliers and breakthroughs in your R&D lab',
  },
  {
    id: 'invest',
    label: 'Invest',
    icon: '💎',
    desc: 'The Wiz — portfolio investments that pay market-beating returns',
  },
  {
    id: 'prestige',
    label: 'Prestige',
    icon: '♻️',
    desc: 'Rebirth for Legacy Points when income outgrows your current tier',
  },
  {
    id: 'intel',
    label: 'Intel',
    icon: '🕵️',
    desc: 'Rival moves, Financial Ledger and Pantheon titan rankings',
  },
];

export interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const { state } = useGame();
  const [tooltipId, setTooltipId] = useState<TabId | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lp = potentialLP(state);
  const prestigeReady = lp > state.legacyPoints * 2 && lp > 0;

  const needsMarketing =
    getChannel(state, 'social').level === 0 || getChannel(state, 'content').level === 0;

  const wizHasOffer = !!(state.investments?.pendingOffer);

  const hasRivalTelegraph = (state.rivals ?? []).some((r) => r.telegraph);
  const hasBreakingNews = (state.newspaper?.items ?? []).some((n) => n.isBreaking && !n.read);
  const hasPendingCounterIntel = !!(state.intel?.pendingCounterIntel);
  const intelPulse = hasRivalTelegraph || hasBreakingNews || hasPendingCounterIntel;

  function startLongPress(id: TabId) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
    timerRef.current = setTimeout(() => {
      haptic('tap');
      setTooltipId(id);
      dismissRef.current = setTimeout(() => setTooltipId(null), 2200);
    }, 550);
  }

  function cancelLongPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  const tooltipTab = TABS.find((t) => t.id === tooltipId);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] glass-panel"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      aria-label="Primary"
    >
      {/* Long-press / hover tooltip — floats above the nav bar */}
      {tooltipTab && (
        <div
          className="absolute bottom-full left-0 right-0 px-3 pb-1.5 pointer-events-none"
          aria-hidden
        >
          <div
            className="rounded-xl border border-[var(--accent)]/25 px-3 py-2 text-center animate-fade-in"
            style={{ background: 'rgba(10,14,24,0.97)', backdropFilter: 'blur(20px)' }}
          >
            <div className="text-[11px] font-bold text-[var(--accent)]">{tooltipTab.label}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-[#8a94a8]">{tooltipTab.desc}</div>
          </div>
        </div>
      )}

      <div className="flex items-stretch px-2 py-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className="flex flex-1"
            title={tab.desc}
            onMouseEnter={() => setTooltipId(tab.id)}
            onMouseLeave={() => setTooltipId(null)}
            onTouchStart={() => startLongPress(tab.id)}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
          >
            <TabButton
              icon={tab.icon}
              label={tab.label}
              active={active === tab.id}
              pulse={
                (tab.id === 'prestige' && prestigeReady && active !== 'prestige') ||
                (tab.id === 'marketing' && needsMarketing && active !== 'marketing') ||
                (tab.id === 'invest' && wizHasOffer && active !== 'invest') ||
                (tab.id === 'intel' && intelPulse && active !== 'intel')
              }
              onClick={() => {
                cancelLongPress();
                if (tooltipId) { setTooltipId(null); return; } // dismiss tooltip on tap
                if (active !== tab.id) {
                  sfx.play('tap');
                  haptic('tap');
                }
                onChange(tab.id);
              }}
            />
          </div>
        ))}
      </div>
    </nav>
  );
}
