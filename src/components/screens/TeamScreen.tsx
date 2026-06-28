// TeamScreen — the unified people & advisors hub.
// Consolidates: Advisors (hire/level), Companions, Aides, Workforce, Dynasty.
// Lives as the 👥 Team tab in BottomNav.

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import { useFirstVisitGuidance } from '../../hooks/useFirstVisitGuidance';
import AdvisorScreen from './AdvisorScreen';
import { CompanionPanel } from '../shared/CompanionPanel';
import { WorkforcePanel } from '../shared/WorkforcePanel';
import { AidePanel } from '../shared/AidePanel';
import { DynastyPanel } from '../shared/DynastyPanel';

type Section = 'advisors' | 'companions' | 'workforce' | 'aides' | 'dynasty';

const SECTIONS: { id: Section; label: string; icon: string; desc: string }[] = [
  { id: 'advisors',   label: 'Advisors',   icon: '🃏', desc: 'Hire & level powerful advisors' },
  { id: 'companions', label: 'Inner Circle', icon: '🤝', desc: 'Co-founder & key companions' },
  { id: 'aides',      label: 'Aides',       icon: '🎖️', desc: 'Your specialist support team' },
  { id: 'workforce',  label: 'Workforce',   icon: '👷', desc: 'Team morale & capacity' },
  { id: 'dynasty',    label: 'Dynasty',     icon: '👑', desc: 'Legacy lineage & heirs' },
];

export default function TeamScreen() {
  useFirstVisitGuidance('g-visit-team');
  const { state } = useGame();
  const [active, setActive] = useState<Section>('advisors');

  const companions = state.companions ?? [];
  const workforce  = state.workforce  ?? [];
  const dynasty    = state.dynasty;

  return (
    <div className="flex flex-col gap-0 pb-4">
      {/* Section tab strip */}
      <div className="sticky top-0 z-10 -mx-3 px-3 pb-2 pt-3"
           style={{ background: 'rgba(6,10,20,0.92)', backdropFilter: 'blur(16px)' }}>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {SECTIONS.map(sec => {
            // Hide dynasty/companions if not yet unlocked
            if (sec.id === 'companions' && companions.length === 0) return null;
            if (sec.id === 'dynasty' && !dynasty) return null;

            const isActive = active === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActive(sec.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-2xl px-3 py-2 transition-all active:scale-95"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(245,200,66,0.18), rgba(245,200,66,0.06))'
                    : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${isActive ? 'rgba(245,200,66,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: isActive ? '0 0 12px -4px rgba(245,200,66,0.4)' : 'none',
                }}
              >
                <span className="text-sm leading-none">{sec.icon}</span>
                <span
                  className="text-[11px] font-bold leading-none"
                  style={{ color: isActive ? '#F5C842' : '#8a94a8' }}
                >
                  {sec.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 text-[10px] text-[#3d4a62]">
          {SECTIONS.find(s => s.id === active)?.desc}
        </div>
      </div>

      {/* Active panel */}
      <div className="mt-3 animate-fade-in" key={active}>
        {active === 'advisors'   && <AdvisorScreen />}
        {active === 'companions' && companions.length > 0 && <CompanionPanel />}
        {active === 'aides'      && <AidePanel />}
        {active === 'workforce'  && workforce.length > 0 && <WorkforcePanel />}
        {active === 'workforce'  && workforce.length === 0 && (
          <EmptyState icon="👷" title="No workforce yet" body="Hire your first team member from the Aides panel." />
        )}
        {active === 'dynasty'    && dynasty && <DynastyPanel />}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-bold text-[#e7ecf5] text-sm mb-1">{title}</div>
      <div className="text-[11px] text-[#8a94a8] max-w-[220px] mx-auto leading-relaxed">{body}</div>
    </div>
  );
}
