// ============================================================================
// StoryScreen — the narrative log.
// Act header + ethics meter at the top. Below it, every beat the player has
// SEEN renders as chat-style dialogue bubbles, color-coded by speaker. When the
// story queue holds a beat, a prominent "Continue the story" button opens that
// beat in a modal: dialogue lines reveal, then choices (or a Continue button)
// dispatch STORY_CHOICE / STORY_SEEN.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';

import { useGame } from '../../game/GameContext';
import { STORY_BEATS } from '../../data/story';
import type { GameReward, Speaker, StoryBeat } from '../../game/types';
import { formatNumber } from '../../utils/bigNumber';
import { reputationMultipliers } from '../../systems/EconomyEngine';
import { CompanionPanel } from '../shared/CompanionPanel';
import { WorkforcePanel } from '../shared/WorkforcePanel';
import { AidePanel } from '../shared/AidePanel';

// ---- Speaker presentation ---------------------------------------------------

interface SpeakerMeta {
  name: string;
  role: string;
  icon: string;
  color: string; // accent for this speaker's bubbles
  align: 'left' | 'right';
}

const SPEAKERS: Record<Speaker, SpeakerMeta> = {
  mentor: { name: 'Dossier', role: 'Mentor', icon: '🦉', color: '#fbbf24', align: 'left' },
  rival: { name: 'Cassara Voss', role: 'Rival', icon: '🐍', color: '#f87171', align: 'left' },
  partner: { name: 'Theo', role: 'Co-Founder', icon: '🤝', color: '#34d399', align: 'left' },
  consortium: { name: 'The Quorum', role: 'Consortium', icon: '🕳️', color: '#a78bfa', align: 'left' },
  narrator: { name: 'Narrator', role: 'The World', icon: '🌍', color: '#8a94a8', align: 'left' },
  player: { name: 'You', role: 'Founder', icon: '👤', color: 'var(--accent)', align: 'right' },
};

const ACT_TITLES = [
  '',
  'Act I — The Founding',
  'Act II — The Climb',
  'Act III — The Reckoning',
  'Act IV — The Apex',
  'Act V — The Legacy',
];

// ---- Reward chips -----------------------------------------------------------

function rewardChips(reward?: GameReward): string[] {
  if (!reward) return [];
  const out: string[] = [];
  if (reward.cash) out.push(`💵 +${formatNumber(reward.cash)}`);
  if (reward.insight) out.push(`💡 +${formatNumber(reward.insight)}`);
  if (reward.influence) out.push(`🎖️ +${formatNumber(reward.influence)}`);
  if (reward.lp) out.push(`⭐ +${formatNumber(reward.lp)} LP`);
  if (reward.boost) out.push(`⚡ ×${reward.boost.mult} for ${reward.boost.seconds}s`);
  if (reward.advisorId) out.push(`🧑‍💼 New advisor`);
  return out;
}

// ---- Reputation meter -------------------------------------------------------

function ReputationMeter({ ethics, reputationHeldSec }: { ethics: number; reputationHeldSec: number }) {
  const clamped = Math.max(-100, Math.min(100, ethics));
  const pct = ((clamped + 100) / 200) * 100;

  const label =
    ethics >= 40
      ? 'Visionary'
      : ethics >= 12
      ? 'Principled'
      : ethics > -12
      ? 'Pragmatic'
      : ethics > -40
      ? 'Ruthless'
      : 'Tyrant';

  const color = ethics >= 12 ? '#34d399' : ethics <= -12 ? '#f87171' : '#fbbf24';

  const rep = reputationMultipliers(ethics, reputationHeldSec);
  const prodPct = Math.round((rep.prod - 1) * 100);
  const costPct = Math.round((1 - rep.cost) * 100);

  let effectLine: string | null = null;
  if (rep.prod !== 1 && rep.cost !== 1) {
    effectLine = `+${prodPct}% production, ${costPct}% cheaper facilities`;
  } else if (rep.prod !== 1) {
    effectLine = `+${prodPct}% production`;
  } else if (rep.cost !== 1) {
    effectLine = `${costPct}% cheaper facilities`;
  }

  // Show compounding visionary progress if on the visionary path
  const showCompound = ethics > 20 && reputationHeldSec > 0;

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#8a94a8]">Reputation</span>
        <span className="font-semibold" style={{ color }}>
          {label}{' '}
          <span className="font-mono tabular-nums text-[#8a94a8]">
            ({ethics >= 0 ? '+' : ''}{ethics})
          </span>
        </span>
      </div>
      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-[#f87171]/30 via-[#fbbf24]/25 to-[#34d399]/30">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#070b12]/60" />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#070b12] transition-[left] duration-300"
          style={{ left: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wide text-[#8a94a8]">
        <span>Ruthless</span>
        <span>Visionary</span>
      </div>
      {effectLine && (
        <div className="mt-2 text-[11px] font-semibold" style={{ color }}>
          {effectLine}
        </div>
      )}
      {showCompound && (
        <div className="mt-1 text-[10px] text-[#8a94a8]">
          Loyalty depth: {Math.round(reputationHeldSec)}s / 300s
          {reputationHeldSec >= 300 && ' (max)'}
        </div>
      )}
    </div>
  );
}

// ---- A seen beat rendered as a dialogue group -------------------------------

function SeenBeat({ beat }: { beat: StoryBeat }) {
  const meta = SPEAKERS[beat.speaker];
  const right = meta.align === 'right';
  return (
    <div className="animate-fade-in">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[#8a94a8]">
        <span className="text-base">{meta.icon}</span>
        <span className="font-semibold" style={{ color: meta.color }}>
          {meta.name}
        </span>
        <span className="text-[#8a94a8]">· {meta.role}</span>
        <span className="ml-auto text-[#8a94a8]/70">{beat.title}</span>
      </div>
      <div className={['flex flex-col gap-1.5', right ? 'items-end' : 'items-start'].join(' ')}>
        {beat.lines.map((line, i) => (
          <div
            key={i}
            className={[
              'max-w-[86%] rounded-2xl px-3 py-2 text-[13px] leading-snug',
              right ? 'rounded-tr-sm' : 'rounded-tl-sm',
            ].join(' ')}
            style={{
              background: right
                ? 'color-mix(in srgb, var(--accent) 16%, #151c2b)'
                : `color-mix(in srgb, ${meta.color} 12%, #151c2b)`,
              borderLeft: right ? undefined : `2px solid ${meta.color}`,
              borderRight: right ? `2px solid var(--accent)` : undefined,
              color: '#e7ecf5',
            }}
          >
            {line}
          </div>
        ))}
      </div>
      {(() => {
        const chips = rewardChips(beat.reward);
        if (chips.length === 0) return null;
        return (
          <div className={['mt-1.5 flex flex-wrap gap-1.5', right ? 'justify-end' : ''].join(' ')}>
            {chips.map((c, i) => (
              <span
                key={i}
                className="rounded-md bg-[#0e1420] px-2 py-0.5 font-mono text-[11px] tabular-nums text-[#34d399]"
              >
                {c}
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ---- The active beat modal --------------------------------------------------

function BeatModal({ beat, onClose }: { beat: StoryBeat; onClose: () => void }) {
  const { dispatch } = useGame();
  const meta = SPEAKERS[beat.speaker];

  // Reveal lines one at a time for a juicy "incoming dialogue" feel.
  const [revealed, setRevealed] = useState(1);
  const allRevealed = revealed >= beat.lines.length;

  useEffect(() => {
    if (allRevealed) return;
    const id = setTimeout(() => setRevealed((r) => r + 1), 650);
    return () => clearTimeout(id);
  }, [revealed, allRevealed]);

  function finishPlain() {
    dispatch({ type: 'STORY_SEEN', id: beat.id });
    onClose();
  }

  function choose(index: number) {
    dispatch({ type: 'STORY_CHOICE', beatId: beat.id, optionIndex: index });
    onClose();
  }

  const baseRewardChips = rewardChips(beat.reward);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#070b12]/80 backdrop-blur-sm sm:items-center">
      <div className="animate-slide-up max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border border-[#232c3e] bg-[#0e1420] p-4 sm:rounded-3xl">
        {/* Speaker header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-2xl"
            style={{ background: `color-mix(in srgb, ${meta.color} 18%, #151c2b)` }}
          >
            {meta.icon}
          </div>
          <div>
            <div className="font-bold" style={{ color: meta.color }}>
              {meta.name}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-[#8a94a8]">
              {beat.title}
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="mt-4 flex flex-col gap-2">
          {beat.lines.slice(0, revealed).map((line, i) => (
            <p
              key={i}
              className="animate-slide-up rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[14px] leading-relaxed text-[#e7ecf5]"
              style={{
                background: `color-mix(in srgb, ${meta.color} 12%, #151c2b)`,
                borderLeft: `2px solid ${meta.color}`,
              }}
            >
              {line}
            </p>
          ))}
          {!allRevealed && (
            <div className="px-2 text-[#8a94a8]">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse [animation-delay:150ms]">●</span>
                <span className="animate-pulse [animation-delay:300ms]">●</span>
              </span>
            </div>
          )}
        </div>

        {/* Reward (for non-choice beats) */}
        {!beat.choice && baseRewardChips.length > 0 && allRevealed && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {baseRewardChips.map((c, i) => (
              <span
                key={i}
                className="rounded-md bg-[#151c2b] px-2 py-1 font-mono text-[12px] tabular-nums text-[#34d399]"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5">
          {!allRevealed ? (
            <button
              type="button"
              onClick={() => setRevealed(beat.lines.length)}
              className="w-full rounded-xl border border-[#232c3e] bg-[#151c2b] py-2.5 text-[13px] font-semibold text-[#8a94a8] transition-transform active:scale-95"
            >
              Skip ⏩
            </button>
          ) : beat.choice ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-[#e7ecf5]">{beat.choice.prompt}</p>
              {beat.choice.options.map((opt, i) => {
                const chips = rewardChips(opt.reward);
                const good = opt.ethicsShift > 0;
                const bad = opt.ethicsShift < 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => choose(i)}
                    className="group rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3 text-left transition-transform active:scale-[0.98] hover:border-[var(--accent)]"
                  >
                    <div className="text-[13px] font-medium text-[#e7ecf5]">{opt.text}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {(good || bad) && (
                        <span
                          className="rounded-md px-1.5 py-0.5 font-mono tabular-nums"
                          style={{
                            background: good ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                            color: good ? '#34d399' : '#f87171',
                          }}
                        >
                          {good ? '+' : ''}{opt.ethicsShift} rep
                        </span>
                      )}
                      {chips.map((c, j) => (
                        <span
                          key={j}
                          className="rounded-md bg-[#0e1420] px-1.5 py-0.5 font-mono tabular-nums text-[#8a94a8]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={finishPlain}
              className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-[14px] font-semibold text-[#070b12] transition-transform active:scale-95"
            >
              Continue ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Screen -----------------------------------------------------------------

export default function StoryScreen() {
  const { state } = useGame();
  const [openBeatId, setOpenBeatId] = useState<string | null>(null);

  // Seen beats, in canonical story order.
  const seenBeats = useMemo(
    () => STORY_BEATS.filter((b) => state.story.seen.includes(b.id)),
    [state.story.seen]
  );

  // Next queued beat (canonical order), if any.
  const nextBeat = useMemo(() => {
    if (state.story.queue.length === 0) return null;
    return (
      STORY_BEATS.find((b) => state.story.queue.includes(b.id)) ?? null
    );
  }, [state.story.queue]);

  const openBeat = openBeatId ? STORY_BEATS.find((b) => b.id === openBeatId) ?? null : null;

  const actLabel = ACT_TITLES[state.story.act] ?? `Act ${state.story.act}`;

  return (
    <div className="px-3 pb-24 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#e7ecf5]">The Chronicle 📖</h2>
          <p className="text-[12px] text-[var(--accent)]">{actLabel}</p>
        </div>
        <div className="rounded-xl border border-[#232c3e] bg-[#0e1420] px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wider text-[#8a94a8]">Chapters</div>
          <div className="font-mono tabular-nums text-[#e7ecf5]">
            {seenBeats.length}/{STORY_BEATS.length}
          </div>
        </div>
      </div>

      {/* Reputation */}
      <div className="mt-3">
        <ReputationMeter ethics={state.story.ethics} reputationHeldSec={state.reputationHeldSec ?? 0} />
      </div>

      {/* Inner Circle */}
      {(state.companions ?? []).length > 0 && (
        <div className="mt-3">
          <CompanionPanel />
        </div>
      )}

      {/* Workforce */}
      {(state.workforce ?? []).length > 0 && (
        <div className="mt-3">
          <WorkforcePanel />
        </div>
      )}

      {/* Cabinet */}
      {(state.aides ?? []).length > 0 && (
        <div className="mt-3">
          <AidePanel />
        </div>
      )}

      {/* Continue button */}
      {nextBeat && (
        <button
          type="button"
          onClick={() => setOpenBeatId(nextBeat.id)}
          className="animate-pulse-accent mt-4 w-full rounded-2xl bg-[var(--accent)] p-4 text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#070b12]/70">
                {SPEAKERS[nextBeat.speaker].icon} New transmission
              </div>
              <div className="mt-0.5 text-[15px] font-bold text-[#070b12]">
                Continue the story
              </div>
              <div className="text-[12px] text-[#070b12]/80">{nextBeat.title}</div>
            </div>
            <span className="text-2xl text-[#070b12]">▶</span>
          </div>
        </button>
      )}

      {/* Log */}
      <div className="mt-5">
        {seenBeats.length === 0 && !nextBeat ? (
          <div className="rounded-2xl border border-dashed border-[#232c3e] bg-[#151c2b] p-6 text-center text-[13px] text-[#8a94a8]">
            Your story has yet to be written. Build your empire and the world will
            start to take notice.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {seenBeats.map((b) => (
              <SeenBeat key={b.id} beat={b} />
            ))}
          </div>
        )}
      </div>

      {/* Active beat modal */}
      {openBeat && <BeatModal beat={openBeat} onClose={() => setOpenBeatId(null)} />}
    </div>
  );
}
