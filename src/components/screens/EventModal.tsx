// EventModal  -  renders a single random event (micro / major / crisis).
// Each option applies its reward (and pays its cost) via EVENT_RESOLVE, then
// closes. Options the player cannot afford are dimmed + disabled.

import { useGame } from '../../game/GameContext';
import type { GameEvent, EventOption } from '../../data/events';
import type { GameReward } from '../../game/types';
import { formatMoney, formatNumber } from '../../utils/bigNumber';
import { formatDuration } from '../../utils/time';
import Modal from '../shared/Modal';

export interface EventModalProps {
  /** The event to present. */
  event: GameEvent;
  /** Close the modal (after resolving, or if dismissed). */
  onClose: () => void;
}

type Cost = NonNullable<EventOption['cost']>;

/** Human-readable reward chips (e.g. "+$2.5K", "+40 Insight", "x2 60s"). */
function rewardChips(reward?: GameReward): { label: string; tone: string }[] {
  if (!reward) return [];
  const chips: { label: string; tone: string }[] = [];
  if (reward.cash) chips.push({ label: `+${formatMoney(reward.cash)}`, tone: 'text-[#34d399]' });
  if (reward.insight)
    chips.push({ label: `+${formatNumber(reward.insight)} 🧠`, tone: 'text-[#60a5fa]' });
  if (reward.influence)
    chips.push({ label: `+${formatNumber(reward.influence)} 🤝`, tone: 'text-[#fbbf24]' });
  if (reward.lp) chips.push({ label: `+${formatNumber(reward.lp)} LP`, tone: 'text-[var(--accent)]' });
  if (reward.boost)
    chips.push({
      label: `x${reward.boost.mult} · ${formatDuration(reward.boost.seconds)}`,
      tone: 'text-[var(--accent)]',
    });
  return chips;
}

/** Human-readable cost chips. */
function costChips(cost?: Cost): { label: string }[] {
  if (!cost) return [];
  const chips: { label: string }[] = [];
  if (cost.cash) chips.push({ label: `−${formatMoney(cost.cash)}` });
  if (cost.influence) chips.push({ label: `−${formatNumber(cost.influence)} 🤝` });
  if (cost.lp) chips.push({ label: `−${formatNumber(cost.lp)} LP` });
  return chips;
}

export default function EventModal({ event, onClose }: EventModalProps) {
  const { state, dispatch } = useGame();

  const canAfford = (cost?: Cost): boolean => {
    if (!cost) return true;
    if (cost.cash && state.cash < cost.cash) return false;
    if (cost.influence && state.influence < cost.influence) return false;
    if (cost.lp && state.legacyPoints < cost.lp) return false;
    return true;
  };

  const resolve = (opt: EventOption) => {
    if (!canAfford(opt.cost)) return;
    dispatch({ type: 'EVENT_RESOLVE', reward: opt.reward, cost: opt.cost });
    onClose();
  };

  return (
    <Modal icon={event.icon} title={event.title} onClose={onClose} dismissOnBackdrop={false}>
      <p className="text-sm text-[#c4ccdb] leading-relaxed mb-4">{event.text}</p>

      <div className="flex flex-col gap-2.5">
        {event.options.map((opt, i) => {
          const affordable = canAfford(opt.cost);
          const rewards = rewardChips(opt.reward);
          const costs = costChips(opt.cost);
          return (
            <button
              key={i}
              onClick={() => resolve(opt)}
              disabled={!affordable}
              className={`group w-full text-left rounded-xl border px-3.5 py-3
                transition-transform active:scale-[0.98]
                ${
                  affordable
                    ? 'border-[#232c3e] bg-[#151c2b] hover:bg-[#1b2334] hover:border-[var(--accent)]'
                    : 'border-[#232c3e] bg-[#151c2b] opacity-40 cursor-not-allowed'
                }`}
            >
              <div className="text-sm font-semibold text-[#e7ecf5] mb-1.5">{opt.label}</div>
              {(rewards.length > 0 || costs.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 font-mono tabular-nums text-xs">
                  {costs.map((c, ci) => (
                    <span
                      key={`c${ci}`}
                      className="rounded-md bg-[#0e1420] px-1.5 py-0.5 text-[#f87171]"
                    >
                      {c.label}
                    </span>
                  ))}
                  {rewards.map((r, ri) => (
                    <span
                      key={`r${ri}`}
                      className={`rounded-md bg-[#0e1420] px-1.5 py-0.5 ${r.tone}`}
                    >
                      {r.label}
                    </span>
                  ))}
                  {!affordable && (
                    <span className="text-[10px] uppercase tracking-wide text-[#8a94a8]">
                      can’t afford
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
