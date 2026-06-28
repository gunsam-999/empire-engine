// SwipeableEmpireView — swipe between the player's live city view and rival cards.
// Slide 0 = your empire (LiveEmpireView). Slides 1..N = one card per rival.

import { useRef, useState } from 'react';
import { useGame } from '../../game/GameContext';
import { RIVAL_CONFIGS } from '../../data/rivals';
import { formatMoney } from '../../utils/bigNumber';
import LiveEmpireView from './LiveEmpireView';

const POSTURE_META: Record<string, { label: string; color: string; icon: string }> = {
  WATCHING:  { label: 'Watching',  color: '#8a94a8', icon: '👁️' },
  NEUTRAL:   { label: 'Neutral',   color: '#8a94a8', icon: '😐' },
  HOSTILE:   { label: 'Hostile',   color: '#fb923c', icon: '😠' },
  WAR:       { label: 'At War',    color: '#f87171', icon: '⚔️' },
  ALLIED:    { label: 'Allied',    color: '#34d399', icon: '🤝' },
  DEFEATED:  { label: 'Defeated',  color: '#4b5563', icon: '💀' },
};

function RivalSlide({ rivalId, accent }: { rivalId: string; accent: string }) {
  const { state } = useGame();
  const rState = (state.rivals ?? []).find(r => r.id === rivalId);
  const rConfig = RIVAL_CONFIGS.find(c => c.id === rivalId);

  if (!rState || !rConfig) return null;

  const posture = (rState.posture as string) || 'NEUTRAL';
  const pm = POSTURE_META[posture] ?? POSTURE_META.NEUTRAL;
  const aggPct = Math.min(100, Math.max(0, rState.aggression));
  const relPct = ((rState.relationship + 100) / 200) * 100;
  const hasWarning = !!rState.telegraph;

  return (
    <div
      className="w-full h-full rounded-2xl flex flex-col justify-between p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(14,20,32,0.98), rgba(7,11,20,0.98))',
        border: `1px solid ${pm.color}30`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${pm.color}12, transparent 60%)`,
        }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xl">{pm.icon}</span>
            <span className="text-base font-bold text-[#e7ecf5]">{rConfig.name}</span>
            {hasWarning && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                    style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171' }}>
                ⚡ STRIKE
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#8a94a8]">{rConfig.domain}</div>
          <div className="text-[10px] text-[#4d5a72] mt-0.5 italic">{rConfig.tagline}</div>
        </div>
        <span
          className="shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg"
          style={{ background: `${pm.color}18`, color: pm.color }}
        >
          {pm.label}
        </span>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-2 gap-3 my-3">
        <div>
          <div className="text-[9px] text-[#8a94a8] mb-1 uppercase tracking-wider">Aggression</div>
          <div className="h-1.5 rounded-full bg-[#1e2840] overflow-hidden mb-0.5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${aggPct}%`,
                background: aggPct >= 70 ? '#f87171' : aggPct >= 40 ? '#fb923c' : '#4ECDC4',
              }}
            />
          </div>
          <div className="text-[10px] font-mono text-[#8a94a8]">{aggPct.toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-[9px] text-[#8a94a8] mb-1 uppercase tracking-wider">Relationship</div>
          <div className="h-1.5 rounded-full bg-[#1e2840] overflow-hidden mb-0.5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${relPct}%`,
                background: rState.relationship >= 0 ? '#34d399' : '#f87171',
              }}
            />
          </div>
          <div className="text-[10px] font-mono text-[#8a94a8]">
            {rState.relationship > 0 ? '+' : ''}{rState.relationship.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Telegraph warning */}
      {rState.telegraph && (
        <div
          className="relative rounded-xl p-2.5 mb-2"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)' }}
        >
          <div className="text-[9px] font-bold text-[#f87171] uppercase tracking-wider mb-0.5">⚡ Incoming Strike</div>
          <div className="text-[11px] text-[#c4cedd] leading-snug">{rState.telegraph.message}</div>
        </div>
      )}

      {/* Footer: moves made / history */}
      <div className="relative flex items-center justify-between">
        <div className="text-[10px] text-[#3d4a62]">
          {rState.timesAttacked > 0 ? `${rState.timesAttacked} attack${rState.timesAttacked !== 1 ? 's' : ''} made` : 'No attacks yet'}
        </div>
        <div className="text-[10px]" style={{ color: pm.color }}>
          {rConfig.moves.length} move{rConfig.moves.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

export default function SwipeableEmpireView() {
  const { state } = useGame();
  const rivals = (state.rivals ?? []).filter(r => r.posture !== 'DEFEATED');
  const slideCount = 1 + rivals.length;

  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const touchCurr = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragDx, setDragDx] = useState(0);

  const accent = state.setup?.accent ?? '#4ECDC4';

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX;
    touchCurr.current = e.touches[0].clientX;
    setDragging(true);
    setDragDx(0);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const dx = e.touches[0].clientX - touchStart.current;
    touchCurr.current = e.touches[0].clientX;
    setDragDx(dx);
  }

  function onTouchEnd() {
    const dx = dragDx;
    setDragging(false);
    setDragDx(0);
    touchStart.current = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < slideCount - 1) setIndex(i => i + 1);
      if (dx > 0 && index > 0) setIndex(i => i - 1);
    }
  }

  const showLabel = index === 0 ? 'Your Empire' : `${RIVAL_CONFIGS.find(c => c.id === rivals[index - 1]?.id)?.name ?? 'Rival'} — Rival`;

  return (
    <div className="flex flex-col gap-2">
      {/* Slide track */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ height: 240 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${dragging ? dragDx : 0}px))`,
            transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            width: `${slideCount * 100}%`,
          }}
        >
          {/* Slide 0: player empire */}
          <div className="relative" style={{ width: `${100 / slideCount}%`, flexShrink: 0 }}>
            <LiveEmpireView />
          </div>

          {/* Slides 1..N: rival cards */}
          {rivals.map((r) => (
            <div key={r.id} style={{ width: `${100 / slideCount}%`, flexShrink: 0, padding: '0 2px' }}>
              <RivalSlide rivalId={r.id} accent={accent} />
            </div>
          ))}
        </div>
      </div>

      {/* Label + dots */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-[#8a94a8]">{showLabel}</span>
        {slideCount > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: slideCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? 16 : 6,
                  height: 6,
                  background: i === index ? accent : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>
        )}
        {slideCount > 1 && (
          <span className="text-[10px] text-[#4d5a72]">
            {index + 1}/{slideCount}
          </span>
        )}
      </div>
    </div>
  );
}
