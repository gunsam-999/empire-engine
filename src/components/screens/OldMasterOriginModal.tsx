// ============================================================================
// OldMasterOriginModal  -  cinematic 3-step origin sequence shown during
// onboarding when the player selects "The Inheritance Arc" mode.
// The Old Master speaks; each line advances on tap/click.
// ============================================================================

import { useState, useEffect } from 'react';
import type { OldMasterConfig } from '../../data/oldMasters';

interface Props {
  master: OldMasterConfig;
  onComplete: () => void;
}

export default function OldMasterOriginModal({ master, onComplete }: Props) {
  const [lineIdx, setLineIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  // Fade in the overlay then the text
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60);
    const t2 = setTimeout(() => setTextVisible(true), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // When line changes, briefly reset text opacity for a shimmer feel
  useEffect(() => {
    setTextVisible(false);
    const t = setTimeout(() => setTextVisible(true), 150);
    return () => clearTimeout(t);
  }, [lineIdx]);

  const isHandoff = lineIdx >= master.originLines.length;
  const currentLine = isHandoff ? master.handoff : master.originLines[lineIdx];

  function advance() {
    if (isHandoff) {
      onComplete();
      return;
    }
    setLineIdx((i) => i + 1);
  }

  const total = master.originLines.length + 1; // +1 for handoff
  const current = lineIdx + 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${master.name} — Origin`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{
        background: `radial-gradient(ellipse 120% 80% at 50% 50%, color-mix(in srgb, ${master.accent} 12%, transparent), transparent 70%), #030508`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
      onClick={advance}
    >
      {/* Skip hint */}
      <div className="absolute top-4 right-4 text-[11px] text-muted opacity-50 select-none pointer-events-none">
        tap to continue
      </div>

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i < current ? 16 : 6,
              height: 6,
              background: i < current ? master.accent : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      <div className="max-w-[400px] w-full text-center">
        {/* Portrait */}
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${master.accent} 25%, transparent), color-mix(in srgb, ${master.accent} 6%, transparent))`,
            boxShadow: `0 0 40px -8px ${master.accent}, 0 0 0 1px color-mix(in srgb, ${master.accent} 25%, transparent)`,
          }}
        >
          {master.emoji}
        </div>

        {/* Name + title */}
        <div
          className="mb-1 text-xs font-semibold tracking-[0.18em] uppercase"
          style={{ color: master.accent }}
        >
          {master.name}
        </div>
        <div className="mb-8 text-[11px] text-muted tracking-wide">
          {master.title}
        </div>

        {/* Quote line */}
        <div
          className="min-h-[96px] flex items-center justify-center"
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          <p
            className="text-[15px] leading-relaxed font-light"
            style={{
              color: isHandoff ? master.accent : '#d8e4f0',
              fontStyle: isHandoff ? 'normal' : 'italic',
              fontWeight: isHandoff ? 600 : 300,
              letterSpacing: isHandoff ? '0.02em' : '0',
            }}
          >
            {isHandoff && (
              <span className="mr-2 not-italic opacity-60">-</span>
            )}
            {currentLine}
          </p>
        </div>

        {/* Decorative divider */}
        <div className="mt-8 flex items-center gap-3 justify-center opacity-30">
          <div className="h-px flex-1" style={{ background: master.accent }} />
          <div className="text-[10px]" style={{ color: master.accent }}>
            {master.status}
          </div>
          <div className="h-px flex-1" style={{ background: master.accent }} />
        </div>

        {/* CTA */}
        <div className="mt-6">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); advance(); }}
            className="rounded-xl px-8 py-3 text-sm font-semibold transition-transform active:scale-95"
            style={{
              background: isHandoff
                ? `linear-gradient(135deg, ${master.accent}, color-mix(in srgb, ${master.accent} 70%, white 30%))`
                : 'rgba(255,255,255,0.06)',
              color: isHandoff ? '#050810' : '#a0b0c8',
              border: isHandoff ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {isHandoff ? 'Begin' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
