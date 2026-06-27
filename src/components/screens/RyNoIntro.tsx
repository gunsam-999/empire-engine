// ============================================================================
// RyNoIntro — RyNo Studios ident that plays every time the game launches.
// 2.5 seconds: logo pulses in → title reveals → fades out.
// Tap anywhere to skip after 0.8s.
// ============================================================================

import { useEffect, useRef, useState } from 'react';

export interface RyNoIntroProps {
  onDone: () => void;
}

export default function RyNoIntro({ onDone }: RyNoIntroProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [canSkip, setCanSkip] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setCanSkip(true), 800);
    const t2 = setTimeout(() => setPhase('hold'), 600);
    const t3 = setTimeout(() => setPhase('out'), 2000);
    const t4 = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  function skip() {
    if (!canSkip || doneRef.current) return;
    doneRef.current = true;
    setPhase('out');
    setTimeout(onDone, 350);
  }

  return (
    <div
      onClick={skip}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center select-none"
      style={{
        background: '#030408',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.5s ease' : phase === 'hold' ? 'none' : 'opacity 0.4s ease',
        cursor: canSkip ? 'pointer' : 'default',
      }}
    >
      {/* Ambient particle field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              opacity: 0,
              animation: `ryno-particle ${p.dur}s ${p.delay}s linear infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ryno-particle {
          0%   { transform: translateY(110vh); opacity: 0; }
          8%   { opacity: 0.22; }
          92%  { opacity: 0.08; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }
        @keyframes ryno-logo-in {
          0%   { opacity: 0; transform: scale(0.6) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ryno-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(90,74,242,0), 0 0 48px -12px rgba(90,74,242,0.7); }
          50%       { box-shadow: 0 0 0 8px rgba(90,74,242,0.08), 0 0 64px -8px rgba(90,74,242,1); }
        }
        @keyframes ryno-studio-in {
          0%   { opacity: 0; transform: translateY(8px) letterSpacing(0.5em); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ryno-title-in {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ryno-shimmer {
          0%,100% { transform: translateX(-130%); }
          50%      { transform: translateX(130%); }
        }
      `}</style>

      {/* Studio ident */}
      <div
        style={{
          fontSize: '9px',
          letterSpacing: '0.45em',
          textTransform: 'uppercase',
          color: '#3a4460',
          marginBottom: '28px',
          animation: 'ryno-studio-in 0.5s 0.2s ease both',
        }}
      >
        <span style={{ color: '#7d6ff7', fontWeight: 700 }}>RyNo</span> Studios
      </div>

      {/* Logo mark */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: '26px',
          background: 'linear-gradient(145deg, #151c2e, #0d1120)',
          border: '1.5px solid #5a4af2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'ryno-logo-in 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) both, ryno-pulse 2.4s 0.9s ease-in-out infinite',
        }}
      >
        {/* Shimmer sweep */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.10) 50%, transparent 75%)',
            animation: 'ryno-shimmer 2.6s 1s ease-in-out infinite',
          }}
        />
        <svg viewBox="0 0 512 512" width="68" height="68" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="ri-cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b4a7fb"/>
              <stop offset="100%" stopColor="#4338ca"/>
            </linearGradient>
          </defs>
          <path d="M156,354 L156,268 L198,310 L230,210 L256,278 L282,210 L314,310 L356,268 L356,354 Z"
                fill="url(#ri-cg)"/>
          <rect x="142" y="344" width="228" height="42" rx="11" fill="#5a4af2"/>
          <circle cx="230" cy="206" r="13" fill="#f472b6"/>
          <circle cx="230" cy="206" r="7" fill="white" opacity="0.5"/>
          <circle cx="282" cy="206" r="13" fill="#fbbf24"/>
          <circle cx="282" cy="206" r="7" fill="white" opacity="0.5"/>
          <circle cx="256" cy="274" r="9" fill="#38bdf8"/>
          <circle cx="256" cy="274" r="4.5" fill="white" opacity="0.55"/>
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: '22px',
          fontSize: '24px',
          fontWeight: 900,
          letterSpacing: '-0.01em',
          color: '#e7ecf5',
          animation: 'ryno-title-in 0.5s 0.65s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <span style={{ color: '#7d6ff7' }}>Empire</span> Engine
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: '6px',
          fontSize: '10px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#2a3550',
          animation: 'ryno-title-in 0.5s 0.9s ease both',
        }}
      >
        Build a dynasty
      </div>

      {/* Skip hint */}
      {canSkip && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '9px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#2a3550',
            animation: 'ryno-title-in 0.3s ease both',
          }}
        >
          tap to skip
        </div>
      )}
    </div>
  );
}

// ---- Static particle configs (deterministic pseudo-random) -------------------
const COLORS = ['#5a4af2', '#a78bfa', '#38bdf8', '#f472b6', '#34d399'];
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  x: [8, 19, 31, 44, 56, 67, 78, 88, 13, 72, 50, 25, 60, 37][i],
  size: [3, 4, 2, 5, 3, 4, 2, 3, 2, 4, 2, 3, 4, 2][i],
  dur: [7, 9, 11, 8, 10, 7.5, 12, 9.5, 13, 8.5, 10.5, 6.5, 11.5, 8.2][i],
  delay: [0, -3, -1.5, -5, -2, -6, -0.8, -4, -7, -2.5, -9, -4.5, -1.2, -3.8][i],
  color: COLORS[i % COLORS.length],
}));
