// ============================================================================
// FoundingRitualModal — the ceremonial founding moment.
//
// Full-screen cinematic overlay that plays when the player clicks "Found":
//   • Aurora sky band shifts into the company's accent colour
//   • Company name types itself in letter by letter with a glow effect
//   • Industry emoji pulses into view
//   • Co-founder character enters with 2 lines of dialogue
//   • "Begin building" button appears when dialogue completes
//
// The parent (IndustrySelect) dispatches SETUP after onComplete fires.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import CharacterPresence from '../shared/CharacterPresence';
import type { CofounderState, IndustryType } from '../../game/types';
import { INDUSTRIES } from '../../data/industries';

export interface FoundingRitualProps {
  companyName: string;
  industry: IndustryType;
  accent: string;
  cofounder: CofounderState;
  onComplete: () => void;
}

export default function FoundingRitualModal({
  companyName,
  industry,
  accent,
  cofounder,
  onComplete,
}: FoundingRitualProps) {
  const cfg = INDUSTRIES[industry];
  const emoji = cfg?.emoji ?? '🏛️';

  // Phase 0 → 1 → 2 → 3 → 4
  // 0: dark screen
  // 1: sky aurora fades in
  // 2: name starts typing
  // 3: co-founder enters (haptic fired by parent before mounting)
  // 4: can close
  const [phase, setPhase] = useState(0);
  const [typedName, setTypedName] = useState('');
  const [charReady, setCharReady] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 700);
    const t3 = setTimeout(() => { setPhase(3); setCharReady(true); }, 2000);
    const t4 = setTimeout(() => setCanProceed(true), 9000); // auto-allow after 9s
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, []);

  // Type the company name letter by letter
  useEffect(() => {
    if (phase < 2) return;
    if (typedName.length >= companyName.length) return;
    typeTimerRef.current = setTimeout(() => {
      setTypedName(companyName.slice(0, typedName.length + 1));
    }, 75);
    return () => { if (typeTimerRef.current) clearTimeout(typeTimerRef.current); };
  }, [phase, typedName, companyName]);

  const nameComplete = typedName.length === companyName.length;

  const cofounderLines = [
    `${companyName}. Say it like you mean it.`,
    "Not a company. An empire. Let's go build it.",
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden max-w-[480px] mx-auto"
      style={{ background: '#030507' }}
    >
      {/* ---- Sky aurora zone (top 45%) ---- */}
      <div className="shrink-0 relative overflow-hidden" style={{ height: '46%' }}>
        {/* Aurora gradient bloom */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            background: `radial-gradient(ellipse at 50% 110%, ${accent}38 0%, ${accent}12 40%, transparent 68%)`,
          }}
        />
        {/* Aurora sweep line */}
        {phase >= 1 && (
          <div
            className="ritual-aurora-sweep absolute inset-0"
            style={{
              background: `linear-gradient(108deg, transparent 25%, ${accent}16 50%, transparent 75%)`,
            }}
          />
        )}
        {/* Star field */}
        {phase >= 1 && Array.from({ length: 22 }, (_, i) => {
          const x = ((i * 37 + 11) % 94) + 2;
          const y = ((i * 53 + 7) % 82) + 4;
          const sz = 1 + (i % 3) * 0.6;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: sz, height: sz,
                left: `${x}%`, top: `${y}%`,
                background: 'white',
                opacity: 0.2 + (i % 5) * 0.08,
                transform: `scale(${phase >= 2 ? 1 : 0})`,
                transition: `transform ${0.4 + i * 0.03}s ease ${i * 0.02}s`,
              }}
            />
          );
        })}

        {/* Centered name + emoji in sky zone */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-3">
          {/* Industry emoji */}
          <div
            className="text-5xl"
            style={{
              filter: nameComplete ? `drop-shadow(0 0 18px ${accent})` : 'none',
              transform: phase >= 1 ? 'scale(1)' : 'scale(0.6)',
              opacity: phase >= 1 ? 1 : 0,
              transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease, filter 0.6s ease',
            }}
          >
            {emoji}
          </div>

          {/* Company name — typed reveal with glow */}
          <h1
            className="text-[1.9rem] font-bold tracking-wide text-center leading-tight"
            style={{
              color: '#f2f5fb',
              textShadow: typedName.length > 2
                ? `0 0 22px ${accent}cc, 0 0 48px ${accent}55`
                : 'none',
              minHeight: '2.2rem',
              transition: 'text-shadow 0.4s ease',
            }}
          >
            {typedName}
            {!nameComplete && phase >= 2 && (
              <span className="cursor-blink" style={{ color: accent }}>|</span>
            )}
          </h1>

          {/* "Your empire begins" tagline */}
          {nameComplete && (
            <p
              className="text-[11px] tracking-[0.22em] uppercase animate-fade-in"
              style={{ color: accent, opacity: 0.7 }}
            >
              Your empire begins
            </p>
          )}
        </div>
      </div>

      {/* ---- Gradient transition from sky to dark ---- */}
      <div
        className="pointer-events-none shrink-0"
        style={{
          height: 56,
          marginTop: -28,
          background: 'linear-gradient(to bottom, transparent, #030507)',
        }}
      />

      {/* ---- Co-founder zone (lower half) ---- */}
      <div className="flex-1 flex flex-col justify-end relative">
        {charReady && (
          <div
            className="px-3 animate-fade-in"
            style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
          >
            <CharacterPresence
              avatar={{ ...cofounder.avatar, accent }}
              name={cofounder.name}
              role={cofounder.role}
              side="left"
              lines={cofounderLines}
              onComplete={() => setCanProceed(true)}
            />
          </div>
        )}

        {/* "Begin building" CTA */}
        {canProceed && (
          <button
            className="absolute inset-x-0 bottom-0 flex justify-center animate-fade-in"
            style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
            onClick={onComplete}
          >
            <span
              className="glass rounded-full px-8 py-3 text-sm font-semibold"
              style={{
                color: accent,
                boxShadow: `0 0 24px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              Begin building →
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
