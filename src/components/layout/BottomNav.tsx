import { useGame, potentialLP, getChannel } from '../../game/GameContext';
import TabButton from '../shared/TabButton';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';

/** Canonical screen identifiers used by the router/App. */
export type TabId = 'empire' | 'marketing' | 'research' | 'invest' | 'prestige';

export const TAB_IDS: TabId[] = ['empire', 'marketing', 'research', 'invest', 'prestige'];

interface TabMeta {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabMeta[] = [
  { id: 'empire', label: 'Empire', icon: '🏭' },
  { id: 'marketing', label: 'Marketing', icon: '📣' },
  { id: 'research', label: 'Research', icon: '🔬' },
  { id: 'invest', label: 'Invest', icon: '💎' },
  { id: 'prestige', label: 'Prestige', icon: '♻️' },
];

export interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const { state } = useGame();

  // Prestige pulses when a rebirth now would more than double banked LP.
  const lp = potentialLP(state);
  const prestigeReady = lp > state.legacyPoints * 2 && lp > 0;

  // Marketing pulses while a must-have growth channel is still untouched.
  const needsMarketing =
    getChannel(state, 'social').level === 0 || getChannel(state, 'content').level === 0;

  // Invest pulses when The Wiz has a pending offer.
  const wizHasOffer = !!(state.investments?.pendingOffer);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-[#232c3e]
        bg-[#0e1420]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch px-2 py-1">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={active === tab.id}
            pulse={
              (tab.id === 'prestige' && prestigeReady && active !== 'prestige') ||
              (tab.id === 'marketing' && needsMarketing && active !== 'marketing') ||
              (tab.id === 'invest' && wizHasOffer && active !== 'invest')
            }
            onClick={() => {
              if (active !== tab.id) {
                sfx.play('tap');
                haptic('tap');
              }
              onChange(tab.id);
            }}
          />
        ))}
      </div>
    </nav>
  );
}
