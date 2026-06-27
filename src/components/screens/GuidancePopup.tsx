// ============================================================================
// GuidancePopup  -  the co-founder's coaching pop-up. A polished lower-third card
// (NOT the heavy story modal): co-founder portrait + name, the beat's lines, an
// optional marketing-tip chip, an emotion-colored accent, slide/fade-in, and a
// "Got it" button. App decides WHICH beat shows and wires onDismiss; this just
// renders one beat beautifully.
// ============================================================================

import { useEffect, useState } from 'react';

import { useGame } from '../../game/GameContext';
import { getCofounderAvatar } from '../../data/characters';
import type { GuidanceBeat } from '../../data/guidance';
import CharacterPortrait from '../shared/CharacterPortrait';

export interface GuidancePopupProps {
  beat: GuidanceBeat;
  onDismiss: () => void;
}

// Emotion -> accent color + flavor label/icon used for the card's mood.
const EMOTION: Record<
  GuidanceBeat['emotion'],
  { color: string; label: string; icon: string }
> = {
  hype: { color: '#fbbf24', label: 'Hyped', icon: '🔥' },
  proud: { color: '#34d399', label: 'Proud', icon: '🎉' },
  calm: { color: '#60a5fa', label: 'Steady', icon: '🌿' },
  urgent: { color: '#f87171', label: 'Now!', icon: '⚡' },
  tip: { color: '#a78bfa', label: 'Pro tip', icon: '💡' },
};

export default function GuidancePopup({ beat, onDismiss }: GuidancePopupProps) {
  const { state } = useGame();
  const { cofounder } = state;
  const avatar = getCofounderAvatar(cofounder);
  const speakerName = cofounder.recruited ? cofounder.name : 'Empire HQ';
  const speakerRole = cofounder.recruited ? cofounder.role : 'Strategic Advisor';
  const mood = EMOTION[beat.emotion] ?? EMOTION.tip;

  // Mount/leave animation state so dismiss slides out before unmount.
  const [leaving, setLeaving] = useState(false);

  // Reveal lines one at a time for a "speaking" feel.
  const [revealed, setRevealed] = useState(1);
  const allRevealed = revealed >= beat.lines.length;
  useEffect(() => {
    if (allRevealed) return;
    const id = setTimeout(() => setRevealed((r) => r + 1), 600);
    return () => clearTimeout(id);
  }, [revealed, allRevealed]);

  function close() {
    if (leaving) return;
    setLeaving(true);
    // Allow the slide-out transition to play before parent unmounts us.
    setTimeout(onDismiss, 220);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[88px]">
      <div
        className={[
          'pointer-events-auto w-full max-w-[480px] overflow-hidden rounded-2xl border bg-[#0e1420]',
          'transition-all duration-200 ease-out',
          leaving ? 'translate-y-3 opacity-0' : 'animate-slide-up opacity-100',
        ].join(' ')}
        style={{
          borderColor: `color-mix(in srgb, ${mood.color} 55%, #232c3e)`,
          boxShadow: `0 -6px 30px -10px color-mix(in srgb, ${mood.color} 60%, transparent), 0 0 0 1px color-mix(in srgb, ${mood.color} 24%, transparent)`,
        }}
      >
        {/* Emotion accent bar */}
        <div className="h-1 w-full" style={{ background: mood.color }} />

        <div className="p-3.5">
          <div className="flex gap-3">
            {/* Portrait / icon with emotion glow */}
            <div
              className="shrink-0"
              style={{
                filter: `drop-shadow(0 4px 12px color-mix(in srgb, ${mood.color} 55%, transparent))`,
              }}
            >
              {avatar ? (
                <CharacterPortrait avatar={avatar} size={52} ring />
              ) : (
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-2xl"
                  style={{
                    background: `color-mix(in srgb, ${mood.color} 14%, #0e1420)`,
                    border: `2px solid color-mix(in srgb, ${mood.color} 45%, transparent)`,
                  }}
                >
                  🎯
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Name + role + emotion chip */}
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-bold text-[#e7ecf5]">
                  {speakerName}
                </span>
                <span className="truncate text-[11px] text-[#8a94a8]">· {speakerRole}</span>
                <span
                  className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: mood.color,
                    background: `color-mix(in srgb, ${mood.color} 16%, transparent)`,
                  }}
                >
                  {mood.icon} {mood.label}
                </span>
              </div>

              {/* Lines */}
              <div className="mt-2 flex flex-col gap-1.5">
                {beat.lines.slice(0, revealed).map((line, i) => (
                  <p
                    key={i}
                    className="animate-slide-up text-[13px] leading-snug text-[#e7ecf5]"
                  >
                    {line}
                  </p>
                ))}
                {!allRevealed && (
                  <span className="inline-flex gap-1 text-[#8a94a8]">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse [animation-delay:150ms]">●</span>
                    <span className="animate-pulse [animation-delay:300ms]">●</span>
                  </span>
                )}
              </div>

              {/* Tip chip */}
              {beat.tip && allRevealed && (
                <div
                  className="animate-fade-in mt-2.5 flex items-start gap-1.5 rounded-xl border px-2.5 py-1.5"
                  style={{
                    borderColor: 'color-mix(in srgb, #a78bfa 40%, #232c3e)',
                    background: 'color-mix(in srgb, #a78bfa 10%, #151c2b)',
                  }}
                >
                  <span className="text-[12px] leading-none">💡</span>
                  <span className="text-[11.5px] leading-snug text-[#cbd2e0]">{beat.tip}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <button
            type="button"
            onClick={close}
            className="mt-3 w-full rounded-xl py-2.5 text-[13px] font-bold text-[#070b12] transition-transform active:scale-95"
            style={{ background: mood.color }}
          >
            Got it 👊
          </button>
        </div>
      </div>
    </div>
  );
}
