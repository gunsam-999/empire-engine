// ============================================================================
// ResearchScreen  -  the R&D tree.
// Branch filter tabs -> nodes as cards grouped by branch. Each node shows its
// Insight cost, research time, and effect; locked when prereqs are unmet or the
// node is already complete. The active research project shows a live countdown
// progress bar. START dispatches START_RESEARCH. Header shows insight/sec.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useFirstVisit } from '../../hooks/useFirstVisit';

import {
  useGame,
  getResearchNode,
  insightPerSec,
  getMultipliers,
} from '../../game/GameContext';
import { RESEARCH_NODES } from '../../data/research';
import type { GameState, ResearchBranch, ResearchNode } from '../../game/types';
import { formatNumber } from '../../utils/bigNumber';
import { formatDuration, formatCountdown } from '../../utils/time';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';

// ---- Branch presentation ----------------------------------------------------

interface BranchMeta {
  id: ResearchBranch;
  label: string;
  icon: string;
  blurb: string;
}

const BRANCHES: BranchMeta[] = [
  { id: 'production', label: 'Production', icon: '⚙️', blurb: 'Raw output. Numbers go up.' },
  { id: 'efficiency', label: 'Efficiency', icon: '🪙', blurb: 'Cheaper to scale.' },
  { id: 'innovation', label: 'Innovation', icon: '🔬', blurb: 'Insight & research speed.' },
  { id: 'market', label: 'Market', icon: '📈', blurb: 'Higher sale price.' },
  { id: 'legacy', label: 'Legacy', icon: '🏛️', blurb: 'Prestige & offline gains.' },
];

const EFFECT_LABEL: Record<ResearchNode['effect']['kind'], (v: number) => string> = {
  production: (v) => `+${Math.round(v * 100)}% production`,
  cost: (v) => `-${Math.round(v * 100)}% facility cost`,
  insight: (v) => `+${Math.round(v * 100)}% Insight`,
  prestige: (v) => `+${Math.round(v * 100)}% prestige mult`,
  market: (v) => `+${Math.round(v * 100)}% market price`,
  offline: (v) => `+${Math.round(v * 100)}% offline earnings`,
  advisor: (v) => `+${Math.round(v * 100)}% advisor power`,
};

type NodeStatus = 'completed' | 'active' | 'available' | 'unaffordable' | 'locked';

function nodeStatus(state: GameState, node: ResearchNode): NodeStatus {
  if (state.research.completed.includes(node.id)) return 'completed';
  if (state.research.active?.id === node.id) return 'active';
  const prereqsMet = node.requires.every((r) => state.research.completed.includes(r));
  if (!prereqsMet) return 'locked';
  if (state.insight < node.cost) return 'unaffordable';
  return 'available';
}

// ---- Live ticking clock (so countdowns/affordability feel real-time) --------

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ---- Active research banner with a live progress bar ------------------------

function ActiveResearchBanner({ now }: { now: number }) {
  const { state } = useGame();
  const active = state.research.active;
  if (!active) return null;
  const node = getResearchNode(active.id);
  if (!node) return null;

  const span = Math.max(1, active.endsAt - active.startedAt);
  const pct = Math.min(1, Math.max(0, (now - active.startedAt) / span));
  const remaining = Math.max(0, active.endsAt - now);
  const meta = BRANCHES.find((b) => b.id === node.branch);

  return (
    <div className="rounded-2xl border border-[var(--accent)] bg-[#151c2b] p-4 shadow-lg animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl animate-spin-slow">🔬</span>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--accent)]">
              Researching {meta?.label}
            </div>
            <div className="font-semibold text-[#e7ecf5]">{node.name}</div>
          </div>
        </div>
        <div className="font-mono tabular-nums text-lg text-[var(--accent)]">
          {formatCountdown(remaining)}
        </div>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#0e1420]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150 ease-linear"
          style={{
            width: `${(pct * 100).toFixed(1)}%`,
            boxShadow: '0 0 8px color-mix(in srgb, var(--accent) 70%, transparent)',
          }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-[#8a94a8]">
        <span>{Math.floor(pct * 100)}%</span>
        <span>{node.desc}</span>
      </div>
    </div>
  );
}

// ---- A single research node card --------------------------------------------

function ResearchCard({
  node,
  now,
}: {
  node: ResearchNode;
  now: number;
}) {
  const { state, dispatch } = useGame();
  const status = nodeStatus(state, node);
  const hasActive = state.research.active !== null;

  const canStart = status === 'available' && !hasActive;
  const dim = status === 'locked' || status === 'completed';

  const effLabel = EFFECT_LABEL[node.effect.kind](node.effect.value);

  // Missing prerequisites, by readable name.
  const missing =
    status === 'locked'
      ? node.requires
          .filter((r) => !state.research.completed.includes(r))
          .map((r) => getResearchNode(r)?.name ?? r)
      : [];

  const ringColor =
    status === 'completed'
      ? '#34d399'
      : status === 'active'
      ? 'var(--accent)'
      : '#232c3e';

  return (
    <div
      className={[
        'rounded-2xl border bg-[#151c2b] p-3.5 transition-transform',
        dim ? 'opacity-60' : '',
        status === 'active' ? 'animate-pulse-accent' : '',
      ].join(' ')}
      style={{ borderColor: ringColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a94a8]">
              T{node.tier}
            </span>
            <h4 className="truncate font-semibold text-[#e7ecf5]">{node.name}</h4>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-[#8a94a8]">{node.desc}</p>
        </div>
        {status === 'completed' && <span className="shrink-0 text-lg">✅</span>}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        <span className="rounded-md bg-[#0e1420] px-2 py-0.5 font-mono tabular-nums text-[var(--accent)]">
          {effLabel}
        </span>
        <span className="flex items-center gap-1 text-[#8a94a8]">
          💡
          <span className="font-mono tabular-nums">{formatNumber(node.cost)}</span>
        </span>
        <span className="flex items-center gap-1 text-[#8a94a8]">
          ⏱️
          <span className="font-mono tabular-nums">{formatDuration(node.timeSec)}</span>
        </span>
      </div>

      {missing.length > 0 && (
        <div className="mt-2 text-[11px] text-[#fbbf24]">
          🔒 Requires: {missing.join(', ')}
        </div>
      )}

      <div className="mt-3">
        {status === 'completed' ? (
          <div className="rounded-xl bg-[#0e1420] py-2 text-center text-[12px] font-semibold text-[#34d399]">
            Researched
          </div>
        ) : status === 'active' ? (
          <div className="rounded-xl bg-[#0e1420] py-2 text-center text-[12px] font-semibold text-[var(--accent)]">
            In progress  -  {formatCountdown(Math.max(0, (state.research.active?.endsAt ?? now) - now))}
          </div>
        ) : (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              dispatch({ type: 'START_RESEARCH', id: node.id });
              sfx.play('research');
              haptic('buy');
            }}
            className={[
              'w-full rounded-xl py-2 text-[13px] font-semibold transition-transform active:scale-95',
              canStart
                ? 'bg-[var(--accent)] text-[#070b12]'
                : 'cursor-not-allowed bg-[#1b2334] text-[#8a94a8] opacity-60',
            ].join(' ')}
          >
            {hasActive && status !== 'available'
              ? 'Lab busy'
              : status === 'locked'
              ? 'Locked'
              : status === 'unaffordable'
              ? `Need 💡 ${formatNumber(node.cost - state.insight)} more`
              : hasActive
              ? 'Lab busy'
              : 'Start research'}
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Screen -----------------------------------------------------------------

export default function ResearchScreen() {
  useFirstVisit('hint-research-first');
  const { state } = useGame();
  const now = useNow(120);
  const [branch, setBranch] = useState<ResearchBranch>('production');

  const ips = insightPerSec(state);
  const insightMult = getMultipliers(state).insight;

  // Progress per branch (completed / total) for the tab badges.
  const branchProgress = useMemo(() => {
    const out: Record<string, { done: number; total: number }> = {};
    for (const b of BRANCHES) {
      const nodes = RESEARCH_NODES.filter((n) => n.branch === b.id);
      out[b.id] = {
        done: nodes.filter((n) => state.research.completed.includes(n.id)).length,
        total: nodes.length,
      };
    }
    return out;
  }, [state.research.completed]);

  const nodes = useMemo(
    () =>
      RESEARCH_NODES.filter((n) => n.branch === branch).sort((a, b) => a.tier - b.tier),
    [branch]
  );

  const activeMeta = BRANCHES.find((b) => b.id === branch)!;

  return (
    <div className="px-3 pb-24 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#e7ecf5]">Research Lab 🔬</h2>
          <p className="text-[12px] text-[#8a94a8]">Spend Insight to unlock permanent upgrades.</p>
        </div>
        <div className="rounded-xl border border-[#232c3e] bg-[#0e1420] px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wider text-[#8a94a8]">Insight</div>
          <div className="font-mono tabular-nums text-[var(--accent)]">
            💡 {formatNumber(state.insight)}
          </div>
          <div className="font-mono tabular-nums text-[11px] text-[#34d399]">
            +{formatNumber(ips)}/s
          </div>
        </div>
      </div>

      {/* Insight multiplier note */}
      {insightMult > 1 && (
        <p className="mt-1 text-[11px] text-[#8a94a8]">
          Insight generation boosted ×{insightMult.toFixed(2)} by research & advisors.
        </p>
      )}

      {/* Active research */}
      <div className="mt-3">
        <ActiveResearchBanner now={now} />
      </div>

      {/* Branch tabs */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {BRANCHES.map((b) => {
          const prog = branchProgress[b.id];
          const isActive = b.id === branch;
          const complete = prog.done === prog.total;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBranch(b.id)}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-transform active:scale-95',
                isActive
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[#070b12]'
                  : 'border-[#232c3e] bg-[#151c2b] text-[#e7ecf5]',
              ].join(' ')}
            >
              <span>{b.icon}</span>
              <span>{b.label}</span>
              <span
                className={[
                  'rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                  isActive
                    ? 'bg-[#070b12]/25 text-[#070b12]'
                    : complete
                    ? 'bg-[#34d399]/15 text-[#34d399]'
                    : 'bg-[#0e1420] text-[#8a94a8]',
                ].join(' ')}
              >
                {prog.done}/{prog.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Branch blurb */}
      <p className="mt-3 text-[12px] text-[#8a94a8]">
        <span className="text-[#e7ecf5]">{activeMeta.icon} {activeMeta.label}</span>  -  {activeMeta.blurb}
      </p>

      {/* Nodes */}
      <div className="mt-2 grid grid-cols-1 gap-2.5">
        {nodes.map((n) => (
          <ResearchCard key={n.id} node={n} now={now} />
        ))}
      </div>
    </div>
  );
}
