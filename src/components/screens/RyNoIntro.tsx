// RyNoIntro - RyNo Studios ident. Plays for 2 s on every cold launch.
// Cinematic: logo spring-pops in, accent line draws, "RyNo" reveals left-to-right,
// "Studios" spreads in below. Three-note jingle fires on mount. Tap to skip after 0.8 s.

import { useEffect, useRef, useState } from 'react';
import EmpireLogo from '../shared/EmpireLogo';

export interface RyNoIntroProps {
  onDone: () => void;
}

// ---- Synth intro jingle (3-note D-major triad, ~0.8 s) ----------------------
function playIntroJingle() {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const actx = new AC();
    const master = actx.createGain();
    master.gain.value = 0.11;
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 10;
    master.connect(comp);
    comp.connect(actx.destination);

    const notes = [
      { f: 293.66, t: 0,    d: 0.38 },   // D4
      { f: 369.99, t: 0.16, d: 0.34 },   // F#4
      { f: 440.00, t: 0.30, d: 0.55 },   // A4
    ];
    notes.forEach(({ f, t, d }) => {
      const osc = actx.createOscillator();
      const g   = actx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const s = actx.currentTime + t;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.65, s + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, s + d);
      osc.connect(g);
      g.connect(master);
      osc.start(s);
      osc.stop(s + d + 0.1);
    });
  } catch {
    // Silently blocked by autoplay policy on first cold load.
  }
}

export default function RyNoIntro({ onDone }: RyNoIntroProps) {
  const [phase, setPhase]     = useState<'in' | 'hold' | 'out'>('in');
  const [canSkip, setCanSkip] = useState(false);
  const doneRef   = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const jingle = setTimeout(playIntroJingle, 120);
    const t1 = setTimeout(() => setCanSkip(true), 800);
    const t2 = setTimeout(() => setPhase('hold'), 700);
    const t3 = setTimeout(() => setPhase('out'), 1550);
    const t4 = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDoneRef.current(); }
    }, 2000);
    return () => { clearTimeout(jingle); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []); // stable - reads refs at call time, never resets timers on re-render

  function skip() {
    if (!canSkip || doneRef.current) return;
    doneRef.current = true;
    setPhase('out');
    setTimeout(() => onDoneRef.current(), 300);
  }

  return (
    <div
      onClick={skip}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center select-none"
      style={{
        background: '#030408',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.4s ease' : 'none',
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
        @keyframes ryno-pop {
          0%   { transform: scale(0.15) translateY(32px); opacity: 0; }
          42%  { transform: scale(1.18) translateY(-10px); opacity: 1; }
          60%  { transform: scale(0.93) translateY(4px); }
          76%  { transform: scale(1.05) translateY(-2px); }
          88%  { transform: scale(0.98) translateY(0); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes ryno-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,200,66,0), 0 0 48px -12px rgba(245,200,66,0.55); }
          50%     { box-shadow: 0 0 0 8px rgba(245,200,66,0.10), 0 0 64px -8px rgba(245,200,66,0.85); }
        }
        @keyframes ryno-line-in {
          0%   { width: 0; opacity: 0; }
          60%  { opacity: 0.55; }
          100% { width: 180px; opacity: 0.32; }
        }
        @keyframes ryno-brand-reveal {
          0%   { clip-path: inset(0 100% 0 0); }
          100% { clip-path: inset(0 0% 0 0); }
        }
        @keyframes ryno-shimmer {
          0%,100% { transform: translateX(-140%); }
          50%     { transform: translateX(140%); }
        }
        @keyframes ryno-studios-in {
          from { opacity: 0; letter-spacing: 0.8em; }
          to   { opacity: 1; letter-spacing: 0.48em; }
        }
        @keyframes ryno-skip-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Logo mark - spring pop-in */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #0A1525, #050A14)',
          border: '2px solid rgba(245,200,66,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation:
            'ryno-pop 0.72s 0.08s cubic-bezier(0.34,1.56,0.64,1) both,' +
            'ryno-pulse 2.4s 0.9s ease-in-out infinite',
        }}
      >
        {/* Shimmer sweep */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.09) 50%, transparent 75%)',
            animation: 'ryno-shimmer 2.4s 1.1s ease-in-out infinite',
          }}
        />
        <EmpireLogo size={68} uid="ri" />
      </div>

      {/* Accent divider line - draws in after logo */}
      <div
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(245,200,66,0.55), rgba(78,205,196,0.3), transparent)',
          marginTop: '22px',
          animation: 'ryno-line-in 0.45s 0.44s cubic-bezier(0.16,1,0.3,1) both',
        }}
      />

      {/* "RyNo" - large gold cinematic reveal */}
      <div
        style={{
          marginTop: '14px',
          overflow: 'hidden',
          animation: 'ryno-brand-reveal 0.48s 0.44s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div
          style={{
            fontSize: '52px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFamily: "'Courier New', Consolas, monospace",
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #FFF4A3 0%, #FFD166 35%, #F5C842 65%, #C8890A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          RyNo
        </div>
      </div>

      {/* "Studios" - teal tracking spread */}
      <div
        style={{
          fontSize: '13px',
          letterSpacing: '0.48em',
          textTransform: 'uppercase',
          color: '#4ECDC4',
          fontWeight: 600,
          marginTop: '6px',
          animation: 'ryno-studios-in 0.6s 0.7s cubic-bezier(0.16,1,0.3,1) both',
          opacity: 0,
        }}
      >
        Studios
      </div>

      {/* Skip hint */}
      {canSkip && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '9px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#2a3550',
            animation: 'ryno-skip-in 0.3s ease both',
          }}
        >
          tap to skip
        </div>
      )}
    </div>
  );
}

// ---- Deterministic particle configs -----------------------------------------
const COLORS = ['#F5C842', '#4ECDC4', '#5a4af2', '#a78bfa', '#2A9D8F'];
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  x:     [8,19,31,44,56,67,78,88,13,72,50,25,60,37][i],
  size:  [3, 4, 2, 5, 3, 4, 2, 3, 2, 4, 2, 3, 4, 2][i],
  dur:   [7, 9,11, 8,10,7.5,12,9.5,13,8.5,10.5,6.5,11.5,8.2][i],
  delay: [0,-3,-1.5,-5,-2,-6,-0.8,-4,-7,-2.5,-9,-4.5,-1.2,-3.8][i],
  color: COLORS[i % COLORS.length],
}));
