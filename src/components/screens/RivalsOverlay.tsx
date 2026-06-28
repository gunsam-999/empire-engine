// RivalsOverlay — full rival system view.
// Shows each rival's posture, aggression, active telegraph, relationship,
// and counter-intel history.

import { useGame } from '../../game/GameContext';
import { RIVAL_CONFIGS } from '../../data/rivals';
import { formatNumber } from '../../utils/bigNumber';

type Posture = 'NEUTRAL' | 'HOSTILE' | 'WAR' | 'ALLIED' | 'DEFEATED';

const POSTURE_META: Record<string, { label: string; color: string; icon: string }> = {
  NEUTRAL:  { label: 'Neutral',  color: '#8a94a8', icon: '😐' },
  HOSTILE:  { label: 'Hostile',  color: '#fb923c', icon: '😠' },
  WAR:      { label: 'At War',   color: '#f87171', icon: '⚔️' },
  ALLIED:   { label: 'Allied',   color: '#34d399', icon: '🤝' },
  DEFEATED: { label: 'Defeated', color: '#6b7899', icon: '💀' },
};

function AggressionBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 75 ? '#f87171' : pct >= 45 ? '#fb923c' : '#4ECDC4';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-[#1e2840] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[9px] font-mono tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function RivalsOverlay({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const rivals = state.rivals ?? [];
  const vendettas = state.intel?.vendettas ?? [];
  const coalitionActive = state.coalitionActive ?? false;

  const spawnedRivals = rivals.map(r => ({
    state: r,
    config: RIVAL_CONFIGS.find(c => c.id === r.id),
  })).filter(r => r.config);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(3,5,12,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          background: 'rgba(7,11,20,0.99)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div className="font-bold text-[#e7ecf5] text-base">⚔️ Rival System</div>
            <div className="text-[11px] text-[#8a94a8] mt-0.5">
              {spawnedRivals.length} active · {vendettas.length > 0 ? `${vendettas.length} vendetta` : 'no vendettas'}
              {coalitionActive && ' · 🔴 Coalition active!'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8a94a8] text-sm"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto no-scrollbar flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Coalition warning */}
          {coalitionActive && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.3)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔴</span>
                <span className="font-bold text-[#f87171] text-sm">Coalition Formed</span>
              </div>
              <div className="text-[11px] text-[#8a94a8] leading-relaxed">
                Your rivals have united. Expect coordinated attacks across all fronts.
                Strengthen defenses, engage allies, and consider counter-offensive action.
              </div>
            </div>
          )}

          {/* No rivals yet */}
          {spawnedRivals.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">😶</div>
              <div className="font-semibold text-[#e7ecf5] text-sm mb-1">No rivals yet</div>
              <div className="text-[11px] text-[#8a94a8]">Rivals emerge as your empire grows. Keep building.</div>
            </div>
          )}

          {/* Rival cards */}
          {spawnedRivals.map(({ state: rs, config }) => {
            if (!config) return null;
            const posture = (rs.posture as string) || 'NEUTRAL';
            const pm = POSTURE_META[posture] ?? POSTURE_META.NEUTRAL;
            const hasVendetta = vendettas.some(v => v.rivalId === rs.id);
            const telegraph = rs.telegraph;

            return (
              <div
                key={rs.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${pm.color}25`,
                }}
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: `${pm.color}08`, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="text-2xl leading-none">{pm.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[#e7ecf5]">{config.name}</span>
                      {hasVendetta && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171' }}>
                          🔥 VENDETTA
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#8a94a8]">{config.domain} · {config.tagline}</div>
                  </div>
                  <span
                    className="shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg"
                    style={{ background: `${pm.color}18`, color: pm.color }}
                  >
                    {pm.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="px-4 py-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] text-[#8a94a8] mb-1">Aggression</div>
                    <AggressionBar value={rs.aggression} />
                  </div>
                  <div>
                    <div className="text-[9px] text-[#8a94a8] mb-1">Relationship</div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[#1e2840] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${((rs.relationship + 100) / 200) * 100}%`,
                            background: rs.relationship >= 0 ? '#34d399' : '#f87171',
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono tabular-nums text-[#8a94a8]">
                        {rs.relationship > 0 ? '+' : ''}{rs.relationship.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active telegraph */}
                {telegraph && (
                  <div
                    className="mx-3 mb-3 rounded-xl p-3"
                    style={{
                      background: 'rgba(248,113,113,0.08)',
                      border: '1px solid rgba(248,113,113,0.22)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">⚡</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#f87171]">
                        Strike Incoming
                        {rs.telegraphIsFeint && ' (Suspected Feint)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#c4cedd] leading-snug">{telegraph.message}</div>
                  </div>
                )}

                {/* Defense history */}
                {rs.defenseHistory.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="text-[9px] text-[#3d4a62] mb-1">Recent counters</div>
                    <div className="flex gap-1 flex-wrap">
                      {rs.defenseHistory.map((m, i) => (
                        <span
                          key={i}
                          className="text-[8px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7899' }}
                        >
                          {m.split('-').pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
