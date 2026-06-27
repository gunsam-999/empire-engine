// WelcomeBackModal  -  shown on launch when offline progress accrued.
// Reads offlineSummary from the game context; dismiss clears it.
// Renders nothing when there is no summary (App can mount it unconditionally).

import { useGame } from '../../game/GameContext';
import { formatMoney, formatNumber } from '../../utils/bigNumber';
import { formatDuration } from '../../utils/time';
import Modal from '../shared/Modal';

export default function WelcomeBackModal() {
  const { offlineSummary, dismissOffline } = useGame();
  if (!offlineSummary) return null;

  const { seconds, cash, insight, events } = offlineSummary;

  return (
    <Modal
      icon="🌙"
      title="Welcome back, founder"
      subtitle={`Away for ${formatDuration(seconds)}`}
      onClose={dismissOffline}
      dismissOnBackdrop={false}
      size="sm"
      footer={
        <button
          onClick={dismissOffline}
          className="w-full rounded-xl bg-[var(--accent)] text-[#070b12] font-semibold py-3
            active:scale-95 transition-transform"
        >
          Collect
        </button>
      }
    >
      <p className="text-sm text-[#8a94a8] mb-4">Your empire kept running while you were gone.</p>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between rounded-xl border border-[#232c3e] bg-[#151c2b] px-3.5 py-3">
          <span className="flex items-center gap-2 text-sm text-[#c4ccdb]">
            <span className="text-lg">💰</span> Earnings
          </span>
          <span className="font-mono tabular-nums font-semibold text-[#34d399]">
            +{formatMoney(cash)}
          </span>
        </div>

        {insight > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-[#232c3e] bg-[#151c2b] px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm text-[#c4ccdb]">
              <span className="text-lg">🧠</span> Insight
            </span>
            <span className="font-mono tabular-nums font-semibold text-[#60a5fa]">
              +{formatNumber(insight)}
            </span>
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-[#8a94a8] mb-2">
            While you were away
          </div>
          <ul className="flex flex-col gap-1.5">
            {events.map((e, i) => (
              <li
                key={i}
                className="text-sm text-[#c4ccdb] rounded-lg bg-[#0e1420] border border-[#232c3e] px-3 py-2"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] text-[#8a94a8] text-center">
        Offline earnings accrue at 50% of your active rate.
      </p>
    </Modal>
  );
}
