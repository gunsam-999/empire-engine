// ============================================================================
// AdvisorScreen — the advisor collection. A rarity-tiered grid of all 40
// advisors: owned cards are full-color and interactive (level up, assign to a
// facility, activate legendaries); locked cards show a silhouette. Tapping an
// owned advisor opens a detail sheet with the assign flow.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';

import { useGame, getIndustry } from '../../game/GameContext';
import { ADVISORS } from '../../data/advisors';
import { levelCost } from '../../systems/AdvisorSystem';
import { tierUnlocked } from '../../systems/EconomyEngine';
import type { Advisor, Rarity } from '../../game/types';
import { formatNumber } from '../../utils/bigNumber';
import { formatCountdown } from '../../utils/time';
import Card from '../shared/Card';
import ProgressBar from '../shared/ProgressBar';
import Modal from '../shared/Modal';

// ---- Rarity styling ---------------------------------------------------------

const RARITY: Record<Rarity, { color: string; label: string; order: number }> = {
  common: { color: '#8a94a8', label: 'Common', order: 0 },
  rare: { color: '#60a5fa', label: 'Rare', order: 1 },
  epic: { color: '#c084fc', label: 'Epic', order: 2 },
  legendary: { color: '#fbbf24', label: 'Legendary', order: 3 },
};

const BONUS_LABEL: Record<Advisor['passiveBonus']['kind'], string> = {
  production: 'Production',
  cost: 'Cost ↓',
  insight: 'Insight',
  influence: 'Influence',
  market: 'Market',
};

// ---- Card tile --------------------------------------------------------------

function AdvisorTile({
  advisor,
  owned,
  level,
  assignedTo,
  onOpen,
}: {
  advisor: Advisor;
  owned: boolean;
  level: number;
  assignedTo: string | null;
  onOpen: () => void;
}) {
  const r = RARITY[advisor.rarity];

  return (
    <button
      onClick={owned ? onOpen : undefined}
      disabled={!owned}
      className={`relative text-left rounded-2xl border p-2.5 transition-transform ${
        owned ? 'active:scale-95 cursor-pointer' : 'cursor-default'
      }`}
      style={{
        borderColor: owned ? r.color : '#232c3e',
        background: owned
          ? `linear-gradient(160deg, color-mix(in srgb, ${r.color} 12%, #151c2b), #151c2b)`
          : '#10151f',
        boxShadow: owned ? `0 0 14px -6px ${r.color}` : 'none',
      }}
    >
      {/* rarity pip */}
      <span
        className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{ color: owned ? r.color : '#3a455a', background: owned ? `${r.color}1f` : '#161d2a' }}
      >
        {advisor.rarity === 'legendary' ? '★' : ''}
        {r.label}
      </span>

      <div
        className="h-12 w-12 grid place-items-center rounded-xl text-2xl mb-1.5"
        style={{
          background: owned ? '#0e1420' : '#0b101a',
          border: `1px solid ${owned ? r.color : '#232c3e'}`,
          filter: owned ? 'none' : 'grayscale(1) brightness(0.35)',
        }}
      >
        {owned ? advisor.icon : '❔'}
      </div>

      <p className="text-xs font-semibold leading-tight truncate" style={{ color: owned ? '#e7ecf5' : '#4a566b' }}>
        {owned ? advisor.name : '???'}
      </p>
      <p className="text-[10px] truncate" style={{ color: owned ? '#8a94a8' : '#3a455a' }}>
        {owned ? advisor.title : 'Locked'}
      </p>

      {owned && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-mono tabular-nums text-[#8a94a8]">
            Lv {level}/{advisor.maxLevel}
          </span>
          {assignedTo && <span className="text-[10px]" style={{ color: r.color }}>📌</span>}
        </div>
      )}
    </button>
  );
}

// ---- Detail / assign sheet --------------------------------------------------

function AdvisorDetail({ advisorId, onClose }: { advisorId: string; onClose: () => void }) {
  const { state, dispatch } = useGame();

  // live re-render for cooldown countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const advisor = ADVISORS.find((a) => a.id === advisorId);
  if (!advisor) return null;

  const r = RARITY[advisor.rarity];
  const level = state.advisors.owned[advisorId] ?? 0;
  const maxed = level >= advisor.maxLevel;
  const cost = levelCost(level);
  const canLevel = !maxed && level > 0 && state.influence >= cost;

  const industry = getIndustry(state);
  const facilities = (industry?.facilities ?? []).filter((f) => tierUnlocked(state, f.tier));

  // current assignments
  const assigned = state.advisors.assigned;
  const myFacilities = Object.keys(assigned).filter((fid) => assigned[fid] === advisorId);

  // cooldown
  const cdEnds = state.advisors.cooldowns[advisorId] ?? 0;
  const cdRemain = Math.max(0, cdEnds - now);
  const boostActive =
    state.events.boost && state.events.boost.source === advisor.name && state.events.boost.endsAt > now;

  const sameIndustry = advisor.industry === state.setup?.industry;

  return (
    <Modal
      onClose={onClose}
      icon={advisor.icon}
      title={advisor.name}
      subtitle={`${advisor.title} · ${r.label}`}
      size="md"
    >
      <div className="flex flex-col gap-3">
        {/* rarity + flavor */}
        <div
          className="rounded-xl p-3 border"
          style={{ borderColor: r.color, background: `color-mix(in srgb, ${r.color} 10%, #0e1420)` }}
        >
          <p className="text-[12px] italic text-[#c9d2e3] leading-snug">“{advisor.flavorText}”</p>
        </div>

        {/* passive */}
        <div className="rounded-xl bg-[#0e1420] border border-[#232c3e] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#8a94a8]">
              {BONUS_LABEL[advisor.passiveBonus.kind]} passive
            </span>
            <span className="text-sm font-mono font-semibold tabular-nums" style={{ color: r.color }}>
              +{Math.round(advisor.passiveBonus.value * (1 + 0.1 * Math.max(1, level)) * 100)}%
            </span>
          </div>
          {sameIndustry && advisor.passiveBonus.kind === 'production' && (
            <p className="text-[11px] text-[#34d399] mt-1">
              ×1.5 home-industry synergy ({industry?.name})
            </p>
          )}
        </div>

        {/* level up */}
        <div className="rounded-xl bg-[#0e1420] border border-[#232c3e] p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-[#e7ecf5]">
              Level {level}
              <span className="text-[#8a94a8] font-normal"> / {advisor.maxLevel}</span>
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#8a94a8]">
              🤝 {formatNumber(state.influence)} influence
            </span>
          </div>
          <ProgressBar value={advisor.maxLevel ? level / advisor.maxLevel : 0} heightClass="h-2" color={r.color} />
          <button
            disabled={!canLevel}
            onClick={() => dispatch({ type: 'ADVISOR_LEVEL', id: advisorId })}
            className="mt-2.5 w-full rounded-xl font-semibold py-2 text-sm active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
            style={{
              background: canLevel ? r.color : '#232c3e',
              color: canLevel ? '#070b12' : '#8a94a8',
            }}
          >
            {maxed
              ? 'Max level'
              : `Level Up · 🤝 ${formatNumber(cost)}`}
          </button>
        </div>

        {/* active ability (legendaries) */}
        {advisor.activeAbility && (
          <div
            className="rounded-xl p-3 border"
            style={{ borderColor: '#fbbf24', background: 'color-mix(in srgb, #fbbf24 8%, #0e1420)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#fbbf24]">⚡ {advisor.activeAbility.name}</span>
              <span className="text-[11px] font-mono tabular-nums text-[#8a94a8]">
                ×{advisor.activeAbility.mult} · {advisor.activeAbility.durationSec}s
              </span>
            </div>
            <p className="text-[11px] text-[#8a94a8] mt-1 leading-snug">
              {advisor.activeAbility.description}
            </p>
            <button
              disabled={cdRemain > 0 || !!boostActive}
              onClick={() => dispatch({ type: 'ADVISOR_ACTIVATE', id: advisorId })}
              className="mt-2.5 w-full rounded-xl font-semibold py-2 text-sm text-[#070b12] active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
              style={{ background: cdRemain > 0 || boostActive ? '#232c3e' : '#fbbf24', color: cdRemain > 0 || boostActive ? '#8a94a8' : '#070b12' }}
            >
              {boostActive
                ? `Active — ×${advisor.activeAbility.mult}!`
                : cdRemain > 0
                ? `Cooldown ${formatCountdown(cdRemain)}`
                : `Activate ×${advisor.activeAbility.mult}`}
            </button>
          </div>
        )}

        {/* assign to facility */}
        <div className="rounded-xl bg-[#0e1420] border border-[#232c3e] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#e7ecf5]">Assign to facility</span>
            <span className="text-[11px] text-[#8a94a8]">{myFacilities.length} assigned</span>
          </div>
          <p className="text-[11px] text-[#8a94a8] mb-2 leading-snug">
            An assigned advisor applies its bonus to that facility{advisor.passiveBonus.kind === 'production' ? "'s output" : ''}.
            Tap to assign / unassign.
          </p>
          {facilities.length === 0 ? (
            <p className="text-[11px] text-[#8a94a8]">No facilities unlocked yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto no-scrollbar pr-0.5">
              {facilities.map((f) => {
                const owned = (state.facilities[f.id] ?? 0) > 0;
                const here = assigned[f.id];
                const isMine = here === advisorId;
                const takenByOther = !!here && !isMine;
                return (
                  <button
                    key={f.id}
                    onClick={() => dispatch({ type: 'ADVISOR_ASSIGN', advisorId, facilityId: f.id })}
                    className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors active:scale-[0.98]"
                    style={{
                      borderColor: isMine ? r.color : '#232c3e',
                      background: isMine ? `color-mix(in srgb, ${r.color} 14%, #151c2b)` : '#151c2b',
                      opacity: owned ? 1 : 0.55,
                    }}
                  >
                    <span className="text-lg">{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#e7ecf5] truncate">{f.name}</p>
                      <p className="text-[10px] text-[#8a94a8]">
                        T{f.tier} · {state.facilities[f.id] ?? 0} owned
                        {takenByOther && <span className="text-[#fbbf24]"> · occupied</span>}
                      </p>
                    </div>
                    <span className="text-sm" style={{ color: isMine ? r.color : '#3a455a' }}>
                      {isMine ? '📌' : '＋'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---- Screen -----------------------------------------------------------------

export default function AdvisorScreen() {
  const { state } = useGame();
  const [openId, setOpenId] = useState<string | null>(null);

  const owned = state.advisors.owned;
  const assigned = state.advisors.assigned;

  const ownedCount = useMemo(
    () => ADVISORS.filter((a) => (owned[a.id] ?? 0) > 0).length,
    [owned]
  );

  // Sort: rarity ascending so commons read first, legendaries last (the
  // collection "builds up" to the prize). Group by industry for readability.
  const sorted = useMemo(
    () =>
      [...ADVISORS].sort((a, b) => {
        if (a.industry !== b.industry) return a.industry.localeCompare(b.industry);
        return RARITY[a.rarity].order - RARITY[b.rarity].order;
      }),
    []
  );

  const collectionPct = ownedCount / ADVISORS.length;
  const accent = state.setup?.accent ?? '#6366f1';

  const assignedById = (id: string) => {
    for (const fid of Object.keys(assigned)) {
      if (assigned[fid] === id) return fid;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header + collection progress */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#e7ecf5]">Advisors</h1>
            <p className="text-xs text-[#8a94a8]">Recruit, level, and assign your inner circle</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono font-bold tabular-nums" style={{ color: accent }}>
              {ownedCount}
              <span className="text-[#8a94a8] text-sm">/{ADVISORS.length}</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[#8a94a8]">Collected</p>
          </div>
        </div>
        <div className="mt-2">
          <ProgressBar
            value={collectionPct}
            heightClass="h-3"
            label={`${Math.round(collectionPct * 100)}% complete`}
            color={accent}
          />
        </div>
      </div>

      {/* Rarity legend */}
      <div className="flex items-center gap-3 flex-wrap text-[10px]">
        {(['common', 'rare', 'epic', 'legendary'] as Rarity[]).map((rk) => (
          <span key={rk} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: RARITY[rk].color }} />
            <span className="text-[#8a94a8]">{RARITY[rk].label}</span>
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {sorted.map((advisor) => {
          const lvl = owned[advisor.id] ?? 0;
          return (
            <AdvisorTile
              key={advisor.id}
              advisor={advisor}
              owned={lvl > 0}
              level={lvl}
              assignedTo={assignedById(advisor.id)}
              onOpen={() => setOpenId(advisor.id)}
            />
          );
        })}
      </div>

      {ownedCount === 0 && (
        <Card pad="md" className="text-center">
          <p className="text-sm text-[#e7ecf5]">No advisors yet</p>
          <p className="text-[11px] text-[#8a94a8] mt-1">
            Recruit advisors through the story and events. Each one is a permanent, levelable bonus.
          </p>
        </Card>
      )}

      {openId && <AdvisorDetail advisorId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
