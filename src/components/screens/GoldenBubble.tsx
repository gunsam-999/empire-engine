// GoldenBubble — a rare floating reward that drifts up across the screen.
// Tap it to bank a big short boost (x7 for 30s). App owns when this is mounted;
// on tap (or when the drift finishes) it calls onDone so App can unmount it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../game/GameContext';
import { fx } from '../shared/FxLayer';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';

export interface GoldenBubbleProps {
  /** Called once the bubble is finished (tapped or drifted off-screen). */
  onDone?: () => void;
  /** Seconds the bubble drifts before it escapes. Default 9. */
  lifespanSec?: number;
}

const BOOST = { mult: 7, seconds: 30, source: 'Golden Bonus' } as const;

export default function GoldenBubble({ onDone, lifespanSec = 9 }: GoldenBubbleProps) {
  const { dispatch } = useGame();
  const [tapped, setTapped] = useState(false);
  const [toast, setToast] = useState(false);
  const doneRef = useRef(false);

  // Random horizontal lane so it doesn't always cross the same spot.
  const leftPct = useMemo(() => 12 + Math.random() * 64, []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  };

  // Auto-escape if never tapped.
  useEffect(() => {
    const t = setTimeout(finish, lifespanSec * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifespanSec]);

  const onTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (tapped) return;
    setTapped(true);
    dispatch({ type: 'SET_BOOST', mult: BOOST.mult, seconds: BOOST.seconds, source: BOOST.source });
    // Golden burst + chime at the tap point.
    fx.burst(e.clientX, e.clientY, { color: '#fbbf24', count: 16 });
    fx.gain(e.clientX, e.clientY - 10, `×${BOOST.mult}!`, { color: '#fbbf24' });
    sfx.play('milestone');
    haptic('success');
    setToast(true);
    // Let the pop + toast play, then unmount.
    setTimeout(() => setToast(false), 1900);
    setTimeout(finish, 600);
  };

  return (
    <>
      {/* Floating bubble */}
      {!tapped && (
        <button
          onClick={onTap}
          aria-label="Tap the golden bonus"
          className="fixed bottom-28 z-40 h-16 w-16 -translate-x-1/2 rounded-full
            grid place-items-center text-3xl select-none cursor-pointer
            active:scale-90 transition-transform animate-golden-drift"
          style={{
            left: `${leftPct}%`,
            // Local style so we don't depend on a global keyframe name.
            animationDuration: `${lifespanSec}s`,
            background:
              'radial-gradient(circle at 30% 25%, #fff6cf 0%, #fbbf24 45%, #d97706 100%)',
            boxShadow:
              '0 0 0 4px rgba(251,191,36,0.18), 0 0 30px 6px rgba(251,191,36,0.55), inset 0 -6px 14px rgba(146,64,14,0.5)',
          }}
        >
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">⭐</span>
        </button>
      )}

      {/* Toast confirmation */}
      {toast && (
        <div className="fixed bottom-40 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
          <div
            className="rounded-xl border border-[#fbbf24] bg-[#0e1420]/95 px-4 py-2.5
              shadow-[0_8px_30px_-8px_rgba(251,191,36,0.6)] flex items-center gap-2"
          >
            <span className="text-xl">⭐</span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-[#fbbf24]">Golden Bonus!</div>
              <div className="text-xs font-mono tabular-nums text-[#c4ccdb]">
                ×{BOOST.mult} production for {BOOST.seconds}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Component-scoped drift keyframes (in case index.css lacks this one). */}
      <style>{`
        @keyframes golden-drift {
          0%   { transform: translate(-50%, 30vh) scale(0.6); opacity: 0; }
          12%  { opacity: 1; }
          50%  { transform: translate(calc(-50% + 18px), 8vh) scale(1); }
          88%  { opacity: 1; }
          100% { transform: translate(-50%, -55vh) scale(0.85); opacity: 0; }
        }
        .animate-golden-drift {
          animation-name: golden-drift;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
          animation-iteration-count: 1;
        }
      `}</style>
    </>
  );
}
