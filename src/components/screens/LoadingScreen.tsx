// ============================================================================
// LoadingScreen — Empire Engine game loading screen. Plays for 2 s after the
// RyNo Studios ident. Shows the game logo, title, and an animated loading bar.
// Always calls onDone after 2 s regardless of save state.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import EmpireLogo from '../shared/EmpireLogo';

interface Props {
  onDone: () => void;
}

export default function LoadingScreen({ onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const doneRef   = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Fade in on first frame so the transition is visible
    const frame = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDoneRef.current(); }
    }, 2000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[190] flex flex-col items-center justify-center select-none"
      style={{
        background: '#030408',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      {/* Aurora glow behind logo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 50% 40%, rgba(245,200,66,0.09), transparent 65%),
            radial-gradient(ellipse 40% 30% at 50% 75%, rgba(78,205,196,0.08), transparent 65%)
          `,
        }}
      />

      <style>{`
        @keyframes ls-logo-in {
          0%   { opacity: 0; transform: translateY(12px) scale(0.88); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ls-text-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ls-bar-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes ls-bar-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes ls-dot {
          0%,100% { transform: translateY(0);    opacity: 0.35; }
          50%     { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes ls-glow {
          0%,100% { opacity: 0.6; filter: drop-shadow(0 0 14px rgba(245,200,66,0.4)); }
          50%     { opacity: 1;   filter: drop-shadow(0 0 28px rgba(245,200,66,0.75)); }
        }
      `}</style>

      {/* Logo */}
      <div
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #0A1525, #050A14)',
          border: '2px solid rgba(245,200,66,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 48px -12px rgba(245,200,66,0.65)',
          animation: 'ls-logo-in 0.55s 0.1s cubic-bezier(0.16,1,0.3,1) both, ls-glow 2.4s 0.8s ease-in-out infinite',
        }}
      >
        <EmpireLogo size={64} uid="ls" />
      </div>

      {/* Game title */}
      <div
        style={{
          marginTop: '22px',
          fontSize: '26px',
          fontWeight: 900,
          letterSpacing: '-0.01em',
          color: '#e7ecf5',
          fontFamily: "'Courier New', Consolas, monospace",
          textTransform: 'uppercase',
          animation: 'ls-text-in 0.5s 0.35s cubic-bezier(0.16,1,0.3,1) both',
          textShadow: '0 0 40px rgba(245,200,66,0.45)',
        }}
      >
        <span style={{ color: '#F5C842' }}>Empire</span>{' '}
        <span style={{ color: '#4ECDC4' }}>Engine</span>
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: '6px',
          fontSize: '10px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#2a3550',
          animation: 'ls-text-in 0.5s 0.55s ease both',
        }}
      >
        Build a dynasty
      </div>

      {/* Loading bar */}
      <div
        style={{
          marginTop: '44px',
          width: '220px',
          height: '3px',
          background: 'rgba(78,205,196,0.15)',
          borderRadius: '2px',
          overflow: 'hidden',
          animation: 'ls-text-in 0.4s 0.6s ease both',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, #2A9D8F 0%, #4ECDC4 50%, #2A9D8F 100%)',
            backgroundSize: '200% 100%',
            animation:
              'ls-bar-fill 1.6s 0.4s cubic-bezier(0.4,0,0.2,1) both,' +
              'ls-bar-shimmer 1.2s 0.4s linear infinite',
          }}
        />
      </div>

      {/* Loading dots */}
      <div
        style={{
          marginTop: '14px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          animation: 'ls-text-in 0.4s 0.7s ease both',
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: '#4ECDC4',
              animation: `ls-dot 1.1s ${i * 0.18}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
