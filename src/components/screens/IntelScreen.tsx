// ============================================================================
// IntelScreen  -  the War Room / Intel Desk command center (Part 10).
// Three internal sections accessible via sub-tabs:
//   [War Room]  threat board, dossiers, commissions, counter-intel
//   [Ledger]    The Financial Ledger headlines, story arcs, front page
//   [Pantheon]  rival titan standings, activity feed, rank tracker
// ============================================================================

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import {
  canGatherIntel,
  intelCooldownRemainingSec,
  INTEL_COMMISSION_COST,
  getIntelVerdict,
  getDossier,
  getVendetta,
  hasVendetta,
  threatLevel,
  WAR_ROOM_UPGRADE_COSTS,
  WAR_ROOM_LEVEL_LABELS,
  WAR_ROOM_LEVEL_DESC,
  warRoomUpgradeCost,
  canUpgradeWarRoom,
} from '../../systems/IntelEngine';
import { getRivalConfig } from '../../data/rivals';
import { PANTHEON_CONFIGS } from '../../data/pantheon';
import { getRankedTitans, formatTitanVal } from '../../systems/PantheonEngine';
import { canRespondToNews, NEWS_RESPOND_COST } from '../../systems/NewspaperEngine';
import { formatNumber } from '../../utils/bigNumber';
import type { NewsItem, LedgerStoryArc } from '../../game/types';

// ---- Sub-tab type -----------------------------------------------------------

type SubTab = 'warroom' | 'ledger' | 'pantheon';

// ---- Helpers ----------------------------------------------------------------

function fmt(secs: number): string {
  if (secs <= 0) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const CAT_COLOR: Record<string, string> = {
  business:  '#60a5fa',
  victory:   '#34d399',
  politics:  '#a78bfa',
  scandal:   '#f87171',
  market:    '#fbbf24',
};

const POSTURE_COLOR: Record<string, string> = {
  DORMANT:  '#8a94a8',
  WATCHING: '#60a5fa',
  PROVOKED: '#fbbf24',
  HOSTILE:  '#fb923c',
  WAR:      '#f87171',
  DEFEATED: '#34d399',
  ALLIED:   '#34d399',
};

function postureBar(aggression: number, posture: string): string {
  const color = POSTURE_COLOR[posture] ?? '#8a94a8';
  const w = Math.min(100, aggression);
  return `${w}% (${posture})`;
}

function timeAgo(at: number, now: number): string {
  const s = Math.round((now - at) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

// ---- War Room section -------------------------------------------------------

function WarRoomSection() {
  const { state, dispatch } = useGame();
  const intel = state.intel;
  const rivals = state.rivals ?? [];
  const now = Date.now();
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);

  const canCommit = canGatherIntel(intel, now) && state.influence >= INTEL_COMMISSION_COST;
  const cooldownSecs = intelCooldownRemainingSec(intel, now);
  const pending = intel.reports.filter((r) => !r.resolved);

  // Threat board: all active rivals sorted by threat.
  const activeRivals = rivals.filter(
    (r) => r.posture !== 'DEFEATED' && r.posture !== 'ALLIED'
  );
  const threatBoard = [...activeRivals]
    .map((r) => {
      const d = getDossier(intel, r.id);
      return { rival: r, threat: threatLevel(r.aggression, d?.attacksOnPlayer ?? 0) };
    })
    .sort((a, b) => b.threat - a.threat);

  const selectedRival = selectedRivalId
    ? rivals.find((r) => r.id === selectedRivalId)
    : null;
  const selectedDossier = selectedRivalId ? getDossier(intel, selectedRivalId) : null;
  const selectedVendetta = selectedRivalId ? getVendetta(intel, selectedRivalId) : null;
  const selectedCfg = selectedRivalId ? getRivalConfig(selectedRivalId) : null;

  const canUpgrade = canUpgradeWarRoom(intel, state.influence);
  const upgradeCost = warRoomUpgradeCost(intel);

  return (
    <div className="flex flex-col gap-4">
      {/* War Room header */}
      <div className="rounded-2xl border border-[#232c3e] bg-[#0e1420] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-[#e7ecf5]">
              🕵️ WAR ROOM
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: '#a78bfa' }}>
              Level {intel.warRoomLevel} - {WAR_ROOM_LEVEL_LABELS[intel.warRoomLevel]}
            </div>
          </div>
          {intel.warRoomLevel < 5 && (
            <button
              type="button"
              disabled={!canUpgrade}
              onClick={() => dispatch({ type: 'WAR_ROOM_UPGRADE' })}
              className="rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40 active:scale-[0.97]"
              style={{
                background: canUpgrade ? '#a78bfa22' : '#232c3e',
                border: `1px solid ${canUpgrade ? '#a78bfa55' : '#232c3e'}`,
                color: canUpgrade ? '#a78bfa' : '#8a94a8',
              }}
            >
              Upgrade → Lv{intel.warRoomLevel + 1}
              {upgradeCost < Infinity && ` 🤝${formatNumber(upgradeCost)}`}
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#8a94a8]">
          {WAR_ROOM_LEVEL_DESC[intel.warRoomLevel]}
        </p>
        {intel.warRoomLevel < 5 && (
          <p className="mt-1 text-[10px] text-[#a78bfa]/70">
            Next: {WAR_ROOM_LEVEL_LABELS[(intel.warRoomLevel + 1) as keyof typeof WAR_ROOM_LEVEL_LABELS]} - {WAR_ROOM_LEVEL_DESC[(intel.warRoomLevel + 1) as keyof typeof WAR_ROOM_LEVEL_DESC]}
          </p>
        )}
      </div>

      {/* Network level */}
      {intel.warRoomLevel >= 1 && (
        <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-[#e7ecf5]">🔍 Intel Network</span>
            <span className="font-mono text-[#60a5fa]">{Math.round(intel.level)}/100</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0e1420]">
            <div
              className="h-full rounded-full bg-[#60a5fa] transition-[width] duration-700"
              style={{ width: `${intel.level}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-[#8a94a8]">Network decays 2 pts/min. Commission reports to maintain it.</div>

          {pending.length > 0 && (
            <div className="mt-2 text-[11px] text-[#fbbf24]">
              {pending.length} report{pending.length > 1 ? 's' : ''} in progress -{' '}
              ~{Math.round(Math.max(0, (pending[0].revealsAt - now) / 1000))}s
            </div>
          )}

          <button
            type="button"
            disabled={!canCommit}
            onClick={() => dispatch({ type: 'INTEL_COMMISSION', rivalId: selectedRivalId ?? undefined })}
            className="mt-3 w-full rounded-xl py-2 text-[12px] font-semibold transition-opacity disabled:opacity-50 active:scale-[0.98]"
            style={{
              background: canCommit ? '#60a5fa22' : '#1a2236',
              border: `1px solid ${canCommit ? '#60a5fa55' : '#232c3e'}`,
              color: canCommit ? '#60a5fa' : '#8a94a8',
            }}
          >
            {canCommit
              ? `Commission Report${selectedRivalId ? ` on ${selectedCfg?.name ?? selectedRivalId}` : ''} - 🤝${INTEL_COMMISSION_COST}`
              : cooldownSecs > 0
                ? `Cooldown: ${fmt(cooldownSecs)}`
                : `Need 🤝${INTEL_COMMISSION_COST}`}
          </button>
        </div>
      )}

      {/* Counter-intel alert */}
      {intel.pendingCounterIntel && intel.warRoomLevel >= 4 && (
        <div className="rounded-2xl border border-[#f87171]/40 bg-[#f87171]/10 p-3.5 animate-pulse">
          <div className="text-[12px] font-semibold text-[#f87171]">⚠️ COUNTER-INTEL DETECTED</div>
          <div className="mt-1 text-[11px] text-[#e7ecf5]">
            {getRivalConfig(intel.pendingCounterIntel.rivalId)?.name ?? intel.pendingCounterIntel.rivalId} has an operative watching you.
          </div>
          <div className="mt-1 text-[10px] text-[#f87171]">
            Window: {Math.round(Math.max(0, (intel.pendingCounterIntel.expiresAt - now) / 1000))}s remaining
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'INTEL_COMMISSION', rivalId: intel.pendingCounterIntel!.rivalId })}
            disabled={!canCommit}
            className="mt-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50 active:scale-[0.97]"
            style={{ background: '#f8717122', border: '1px solid #f8717155', color: '#f87171' }}
          >
            Neutralise Operation - 🤝{INTEL_COMMISSION_COST}
          </button>
        </div>
      )}

      {/* Threat board */}
      {intel.warRoomLevel >= 1 && threatBoard.length > 0 && (
        <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
          <div className="mb-2 text-[12px] font-semibold text-[#e7ecf5]">🎯 Threat Board</div>
          <div className="flex flex-col gap-2">
            {threatBoard.map(({ rival, threat }) => {
              const cfg = getRivalConfig(rival.id);
              const verdict = getIntelVerdict(intel, rival.id);
              const isSelected = selectedRivalId === rival.id;
              const pColor = POSTURE_COLOR[rival.posture] ?? '#8a94a8';
              const vendettaActive = hasVendetta(intel, rival.id);

              return (
                <button
                  key={rival.id}
                  type="button"
                  onClick={() => setSelectedRivalId(isSelected ? null : rival.id)}
                  className="w-full rounded-xl border p-2.5 text-left transition-colors active:scale-[0.98]"
                  style={{
                    borderColor: isSelected ? '#a78bfa55' : '#232c3e',
                    background: isSelected ? '#a78bfa0a' : '#0e1420',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-[#e7ecf5] truncate">
                          {cfg?.name ?? rival.id}
                        </span>
                        {vendettaActive && (
                          <span className="text-[9px] rounded px-1 py-0.5 bg-[#f87171]/20 text-[#f87171] font-bold">VENDETTA</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#8a94a8]">{cfg?.domain}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rival.telegraph && (
                        <span className="text-[9px] rounded px-1.5 py-0.5 font-bold animate-pulse"
                          style={{ background: '#f87171/20', color: '#f87171' }}>
                          ⚡ MOVE
                        </span>
                      )}
                      <span className="text-[10px] font-semibold" style={{ color: pColor }}>
                        {rival.posture}
                      </span>
                    </div>
                  </div>
                  {/* Threat bar */}
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#232c3e]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${threat}%`, background: pColor }}
                    />
                  </div>
                  {verdict && (
                    <div className="mt-1 text-[10px]" style={{ color: verdict === 'feint' ? '#34d399' : '#f87171' }}>
                      {verdict === 'feint' ? '✓ Intel: Feint confirmed' : '⚠ Intel: Verified threat'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dossier drawer */}
      {intel.warRoomLevel >= 2 && selectedRival && selectedCfg && (
        <div className="rounded-2xl border border-[#a78bfa]/30 bg-[#a78bfa]/05 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-bold text-[#e7ecf5]">📁 {selectedCfg.name}</div>
            <button
              type="button"
              onClick={() => setSelectedRivalId(null)}
              className="text-[11px] text-[#8a94a8] active:scale-[0.95]"
            >✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <div className="text-[#8a94a8]">Domain</div>
              <div className="text-[#e7ecf5]">{selectedCfg.domain}</div>
            </div>
            <div>
              <div className="text-[#8a94a8]">Posture</div>
              <div style={{ color: POSTURE_COLOR[selectedRival.posture] }}>{selectedRival.posture}</div>
            </div>
            <div>
              <div className="text-[#8a94a8]">Aggression</div>
              <div className="text-[#e7ecf5]">{Math.round(selectedRival.aggression)}/100</div>
            </div>
            <div>
              <div className="text-[#8a94a8]">Relationship</div>
              <div className="text-[#e7ecf5]">{selectedRival.relationship > 0 ? '+' : ''}{Math.round(selectedRival.relationship)}</div>
            </div>
          </div>

          {selectedDossier ? (
            <div className="mt-3 flex flex-col gap-2">
              <div className="text-[11px]">
                <span className="text-[#8a94a8]">Attacks on you: </span>
                <span className="text-[#f87171] font-semibold">{selectedDossier.attacksOnPlayer}</span>
              </div>
              {selectedDossier.movesObserved.length > 0 && (
                <div className="text-[11px]">
                  <div className="text-[#8a94a8] mb-1">Known moves:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedDossier.movesObserved.map((mid) => (
                      <span key={mid} className="rounded px-1.5 py-0.5 bg-[#232c3e] text-[10px] text-[#c8d0dc]">
                        {mid.replace(selectedRival.id + '-', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {intel.warRoomLevel >= 3 && selectedDossier.weaknessKind && (
                <div className="rounded-lg bg-[#34d399]/10 border border-[#34d399]/30 p-2 text-[11px]">
                  <span className="text-[#34d399] font-semibold">⚡ Weakness revealed: </span>
                  <span className="text-[#e7ecf5]">{selectedDossier.weaknessKind} attacks</span>
                  <div className="mt-0.5 text-[#8a94a8]">Strike their {selectedDossier.weaknessKind} for maximum effect.</div>
                </div>
              )}
              {intel.warRoomLevel >= 3 && selectedDossier.predictedNextMoveId && (
                <div className="rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/30 p-2 text-[11px]">
                  <span className="text-[#fbbf24] font-semibold">🔮 Predicted next: </span>
                  <span className="text-[#e7ecf5]">
                    {selectedDossier.predictedNextMoveId.replace(selectedRival.id + '-', '')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-[#8a94a8]">
              Commission a report on this rival to start building their dossier file.
            </div>
          )}

          {selectedVendetta && (
            <div className="mt-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/30 p-2.5">
              <div className="text-[11px] font-semibold text-[#f87171]">
                🔥 VENDETTA - Escalation Level {selectedVendetta.escalationLevel}/3
              </div>
              <div className="mt-0.5 text-[10px] text-[#e7ecf5]">
                {selectedCfg.name} has attacked you {selectedVendetta.totalAttacks} times. This is personal.
              </div>
              <button
                type="button"
                disabled={state.influence < 300}
                onClick={() => dispatch({ type: 'VENDETTA_RESPOND', rivalId: selectedRival.id })}
                className="mt-2 rounded-lg px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 active:scale-[0.97]"
                style={{ background: '#f8717122', border: '1px solid #f8717155', color: '#f87171' }}
              >
                De-escalate - 🤝300
              </button>
            </div>
          )}

          {/* Proactive strikes */}
          <div className="mt-3">
            <div className="text-[11px] text-[#8a94a8] mb-2">Proactive Strikes</div>
            <div className="flex flex-col gap-1.5">
              {[
                { kind: 'leak_story', label: 'Leak Story', cost: '🤝500', cash: 0, inf: 500 },
                { kind: 'fund_competitor', label: 'Fund Rival', cost: '$10K', cash: 10_000, inf: 0 },
                { kind: 'undercut', label: 'Market Undercut', cost: '$5K', cash: 5_000, inf: 0 },
                { kind: 'talent_poach', label: 'Poach Talent', cost: '$20K', cash: 20_000, inf: 0 },
                { kind: 'patent_claim', label: 'Patent Claim', cost: '🤝800', cash: 0, inf: 800 },
              ].map(({ kind, label, cost, cash, inf }) => {
                const canAffordIt = state.cash >= cash && state.influence >= inf;
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!canAffordIt || selectedRival.posture === 'ALLIED'}
                    onClick={() => dispatch({
                      type: 'RIVAL_STRIKE',
                      rivalId: selectedRival.id,
                      strikeKind: kind as any,
                    })}
                    className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[11px] transition-opacity disabled:opacity-40 active:scale-[0.97]"
                    style={{
                      background: canAffordIt ? '#60a5fa0a' : '#1a2236',
                      border: `1px solid ${canAffordIt ? '#60a5fa30' : '#232c3e'}`,
                      color: canAffordIt ? '#60a5fa' : '#8a94a8',
                    }}
                  >
                    <span>{label}</span>
                    <span className="font-mono text-[10px]">{cost}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {intel.warRoomLevel === 0 && (
        <div className="rounded-2xl border border-[#232c3e] bg-[#0e1420] p-6 text-center">
          <div className="text-2xl mb-2">🕵️</div>
          <div className="text-[13px] font-semibold text-[#e7ecf5] mb-1">War Room Not Commissioned</div>
          <div className="text-[11px] text-[#8a94a8] mb-3">
            Build your War Room to gather competitive intelligence, compile rival dossiers,
            and plan proactive strikes.
          </div>
          <button
            type="button"
            disabled={!canUpgrade}
            onClick={() => dispatch({ type: 'WAR_ROOM_UPGRADE' })}
            className="rounded-xl px-5 py-2 text-[12px] font-semibold disabled:opacity-40 active:scale-[0.97]"
            style={{
              background: canUpgrade ? '#a78bfa22' : '#232c3e',
              border: `1px solid ${canUpgrade ? '#a78bfa55' : '#232c3e'}`,
              color: canUpgrade ? '#a78bfa' : '#8a94a8',
            }}
          >
            Commission War Room - 🤝{WAR_ROOM_UPGRADE_COSTS[1]}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Ledger section ---------------------------------------------------------

function LedgerSection() {
  const { state, dispatch } = useGame();
  const newspaper = state.newspaper;
  const now = Date.now();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('all');

  if (!newspaper || newspaper.items.length === 0) {
    return (
      <div className="rounded-2xl border border-[#232c3e] bg-[#0e1420] p-6 text-center">
        <div className="text-2xl mb-2">🗞</div>
        <div className="text-[13px] font-semibold text-[#e7ecf5] mb-1">The Financial Ledger</div>
        <div className="text-[11px] text-[#8a94a8]">
          No headlines yet. Keep building your empire - the world is watching.
        </div>
      </div>
    );
  }

  const { items, heatScore, arcs, frontPageItemId, issueNumber } = newspaper;
  const hasInfluence = state.influence >= NEWS_RESPOND_COST;
  const heatColor = heatScore >= 60 ? '#f87171' : heatScore >= 30 ? '#fbbf24' : '#34d399';
  const heatLabel = heatScore >= 60 ? 'Crisis' : heatScore >= 30 ? 'Elevated' : 'Calm';

  const unread = items.filter((i) => !i.read).length;

  const SECTIONS = ['all', 'empire', 'rivals', 'pantheon', 'scandal'] as const;
  const filtered =
    activeSection === 'all' ? items : items.filter((i) => i.section === activeSection);

  const frontPage = frontPageItemId ? items.find((i) => i.id === frontPageItemId) : null;

  const activeArcs = arcs.filter((a) => a.resolvedAt === null);

  return (
    <div className="flex flex-col gap-4">
      {/* Masthead */}
      <div className="rounded-2xl border border-[#232c3e] bg-[#0e1420] p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[16px] font-black text-[#e7ecf5] tracking-tight">
              THE FINANCIAL LEDGER
            </div>
            <div className="text-[10px] text-[#8a94a8] mt-0.5">
              Issue #{issueNumber} &bull; Press Heat:{' '}
              <span className="font-semibold" style={{ color: heatColor }}>
                {Math.round(heatScore)} ({heatLabel})
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {unread > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'LEDGER_READ_ALL' })}
                className="rounded-lg px-2 py-0.5 text-[10px] font-semibold active:scale-[0.97]"
                style={{ background: '#60a5fa22', border: '1px solid #60a5fa55', color: '#60a5fa' }}
              >
                Mark all read ({unread})
              </button>
            )}
          </div>
        </div>
        {heatScore > 0 && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#232c3e]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${heatScore}%`, background: heatColor }}
            />
          </div>
        )}
      </div>

      {/* Breaking / Front Page */}
      {frontPage && (
        <div className="rounded-2xl border-2 border-[#fbbf24]/50 bg-[#fbbf24]/05 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-black text-[#fbbf24] tracking-widest uppercase">
              {frontPage.isBreaking ? '🔴 BREAKING' : '★ FRONT PAGE'}
            </span>
          </div>
          <div className="text-[14px] font-bold leading-snug text-[#e7ecf5]">
            {frontPage.headline}
          </div>
          <div className="mt-1.5 text-[11px] leading-relaxed text-[#8a94a8]">
            {frontPage.body}
          </div>
          <div className="mt-1 text-[10px] text-[#8a94a8]">{timeAgo(frontPage.at, now)}</div>
        </div>
      )}

      {/* Active story arcs */}
      {activeArcs.length > 0 && (
        <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
          <div className="text-[12px] font-semibold text-[#e7ecf5] mb-2">📖 Story Arcs</div>
          <div className="flex flex-col gap-2">
            {activeArcs.map((arc) => (
              <div key={arc.id} className="rounded-lg bg-[#0e1420] border border-[#232c3e] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#e7ecf5]">{arc.title}</span>
                  <span className="text-[9px] rounded px-1.5 py-0.5 font-bold uppercase tracking-wide"
                    style={{
                      background: arc.phase === 'peak' ? '#f87171/20' : arc.phase === 'escalating' ? '#fbbf24/20' : '#60a5fa/20',
                      color: arc.phase === 'peak' ? '#f87171' : arc.phase === 'escalating' ? '#fbbf24' : '#60a5fa',
                    }}>
                    {arc.phase}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-[#8a94a8]">
                  {arc.relatedItemIds.length} headline{arc.relatedItemIds.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section filter */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors active:scale-[0.97]"
            style={{
              background: activeSection === s ? '#60a5fa22' : '#1a2236',
              border: `1px solid ${activeSection === s ? '#60a5fa55' : '#232c3e'}`,
              color: activeSection === s ? '#60a5fa' : '#8a94a8',
            }}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Headlines */}
      <div className="flex flex-col gap-2">
        {filtered.slice(0, 25).map((item) => {
          const color = CAT_COLOR[item.category] ?? '#8a94a8';
          const isNeg = item.sentimentScore < 0;
          const isExpanded = expandedId === item.id;
          const isBreaking = item.isBreaking;

          return (
            <div
              key={item.id}
              className="rounded-xl border p-3 transition-colors"
              style={{
                borderColor: isBreaking ? '#fbbf24/40' : `${color}30`,
                background: isBreaking ? '#fbbf24/05' : `${color}08`,
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      style={{ background: `${color}20`, color }}
                    >
                      {item.category}
                    </span>
                    {isBreaking && (
                      <span className="text-[9px] font-black text-[#fbbf24] tracking-widest">BREAKING</span>
                    )}
                    {!item.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] shrink-0" />
                    )}
                    <span className="text-[9px] text-[#8a94a8] ml-auto shrink-0">{timeAgo(item.at, now)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="text-left w-full"
                  >
                    <p className="text-[12px] font-semibold leading-snug text-[#e7ecf5]">{item.headline}</p>
                  </button>
                  {isExpanded && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a94a8]">{item.body}</p>
                  )}
                </div>
              </div>
              {isNeg && !item.responded && (
                <button
                  type="button"
                  disabled={!hasInfluence}
                  onClick={() => dispatch({ type: 'NEWS_RESPOND', itemId: item.id })}
                  className="mt-2 rounded-lg px-3 py-1 text-[10px] font-semibold disabled:opacity-50 active:scale-[0.97]"
                  style={{
                    background: hasInfluence ? '#f8717122' : '#232c3e',
                    border: `1px solid ${hasInfluence ? '#f8717155' : '#232c3e'}`,
                    color: hasInfluence ? '#f87171' : '#8a94a8',
                  }}
                >
                  Respond publicly - 🤝{NEWS_RESPOND_COST}
                </button>
              )}
              {item.responded && isNeg && (
                <span className="mt-1 block text-[10px] text-[#34d399]">✓ Response issued</span>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-[#232c3e] bg-[#151c2b] p-4 text-center text-[11px] text-[#8a94a8]">
            No headlines in this section yet.
          </div>
        )}
        {filtered.length > 25 && (
          <div className="text-center text-[10px] text-[#8a94a8]">+{filtered.length - 25} older stories in the archive</div>
        )}
      </div>
    </div>
  );
}

// ---- Pantheon section -------------------------------------------------------

function PantheonSection() {
  const { state } = useGame();
  const pantheon = state.pantheon;
  const now = Date.now();

  if (!pantheon) return null;

  const ranked = getRankedTitans(pantheon);
  const playerLE = state.lifetimeEarnings ?? 0;
  const playerRank = pantheon.playerRank;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-2xl border border-[#232c3e] bg-[#0e1420] p-4">
        <div className="text-[15px] font-black text-[#e7ecf5] tracking-tight">🌐 THE PANTHEON</div>
        <div className="text-[11px] text-[#8a94a8] mt-1">
          The six founders who own the global economy. Your arc is to close the gap - then surpass them.
        </div>
        <div className="mt-3 rounded-xl bg-[#151c2b] border border-[#232c3e] p-3">
          <div className="text-[11px] text-[#8a94a8]">Your position</div>
          <div className="text-[18px] font-black text-[#60a5fa] mt-0.5">
            #{playerRank} <span className="text-[13px] font-semibold">in the world</span>
          </div>
          <div className="text-[11px] text-[#8a94a8] mt-0.5">
            Lifetime earnings: <span className="text-[#e7ecf5] font-semibold">{formatNumber(playerLE)}</span>
          </div>
        </div>
      </div>

      {/* Titan roster */}
      <div className="flex flex-col gap-3">
        {ranked.map((titanState, idx) => {
          const cfg = PANTHEON_CONFIGS.find((c) => c.id === titanState.id);
          if (!cfg) return null;

          const rank = idx + 1;
          const valStr = formatTitanVal(titanState.estimatedValuation);
          const isAhead = titanState.estimatedValuation > playerLE;
          const gap = isAhead
            ? `${(titanState.estimatedValuation / Math.max(playerLE, 1)).toFixed(1)}× ahead`
            : 'YOU HAVE SURPASSED THEM';

          const noticeStatus = titanState.hasNoticedPlayer
            ? (titanState.enteredAsRival ? 'rival' : 'watching')
            : 'unaware';

          const noticeColor =
            noticeStatus === 'rival' ? '#f87171'
            : noticeStatus === 'watching' ? '#fbbf24'
            : '#8a94a8';
          const noticeLabel =
            noticeStatus === 'rival' ? '⚔️ RIVAL'
            : noticeStatus === 'watching' ? '👁 WATCHING'
            : '- Unaware';

          return (
            <div
              key={titanState.id}
              className="rounded-2xl border p-4"
              style={{
                borderColor: noticeStatus === 'rival' ? '#f87171/40' : '#232c3e',
                background: noticeStatus === 'rival' ? '#f87171/05' : '#151c2b',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{cfg.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-bold text-[#e7ecf5]">
                        #{rank} {cfg.name}
                      </div>
                      <div className="text-[11px]" style={{ color: '#a78bfa' }}>
                        {cfg.title}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-mono font-semibold text-[#e7ecf5]">{valStr}</div>
                      <div className="text-[9px] font-semibold" style={{ color: noticeColor }}>
                        {noticeLabel}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-[#8a94a8]">{cfg.domain}</div>
                  <div className="mt-1.5 text-[10px] italic text-[#8a94a8]">{cfg.philosophy}</div>
                  {/* Wealth gap bar */}
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#0e1420]">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: isAhead
                          ? `${Math.max(2, Math.min(100, (playerLE / titanState.estimatedValuation) * 100))}%`
                          : '100%',
                        background: isAhead ? '#60a5fa' : '#34d399',
                      }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px]" style={{ color: isAhead ? '#8a94a8' : '#34d399' }}>
                    {gap}
                  </div>
                  {/* Recent activity */}
                  {titanState.recentActivity.length > 0 && (
                    <div className="mt-2 text-[10px] text-[#8a94a8] line-clamp-2 italic">
                      Latest: {titanState.recentActivity[0]}
                    </div>
                  )}
                  {/* Noticed quote */}
                  {titanState.hasNoticedPlayer && (
                    <div className="mt-2 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/20 px-2 py-1.5 text-[10px] text-[#fbbf24] italic">
                      {cfg.noticesQuote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player slot */}
      <div className="rounded-2xl border-2 border-[#60a5fa]/40 bg-[#60a5fa]/05 p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🏭</div>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-[#60a5fa]">
              #{playerRank} {state.setup?.name ?? 'Your Empire'}
            </div>
            <div className="text-[11px] text-[#8a94a8]">You</div>
            <div className="text-[12px] font-mono text-[#e7ecf5] mt-0.5">{formatNumber(playerLE)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main screen ------------------------------------------------------------

export default function IntelScreen() {
  useFirstVisit('hint-intel-first');
  const [subTab, setSubTab] = useState<SubTab>('warroom');
  const { state } = useGame();

  const newspaper = state.newspaper;
  const unreadNews = (newspaper?.items ?? []).filter((i) => !i.read).length;
  const hasBreaking = (newspaper?.items ?? []).some((i) => i.isBreaking && !i.read);

  const SUB_TABS: Array<{ id: SubTab; label: string; badge?: number; urgent?: boolean }> = [
    { id: 'warroom', label: '🕵️ War Room' },
    { id: 'ledger', label: '🗞 Ledger', badge: unreadNews, urgent: hasBreaking },
    { id: 'pantheon', label: '🌐 Pantheon' },
  ];

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Sub-tab bar */}
      <div className="flex gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className="flex-1 rounded-xl py-2 text-[11px] font-semibold transition-colors relative active:scale-[0.97]"
            style={{
              background: subTab === t.id ? '#60a5fa22' : '#151c2b',
              border: `1px solid ${subTab === t.id ? '#60a5fa55' : '#232c3e'}`,
              color: subTab === t.id ? '#60a5fa' : '#8a94a8',
            }}
          >
            {t.label}
            {t.badge && t.badge > 0 ? (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black px-1"
                style={{ background: t.urgent ? '#f87171' : '#60a5fa', color: '#fff' }}
              >
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Active section */}
      {subTab === 'warroom' && <WarRoomSection />}
      {subTab === 'ledger' && <LedgerSection />}
      {subTab === 'pantheon' && <PantheonSection />}
    </div>
  );
}
