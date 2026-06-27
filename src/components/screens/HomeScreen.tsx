// ============================================================================
// HomeScreen — the branded entry point before onboarding.
// Shown when no game save exists or after pressing "Main Menu".
// Animated background, big "EMPIRE ENGINE" logo, and three primary CTAs.
// ============================================================================

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import type { GameMode } from '../../game/types';
import { importSave } from '../../game/SaveSystem';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';

export interface HomeScreenProps {
  /** Called when the player starts a new game (passes chosen mode). */
  onNewGame: (mode: GameMode) => void;
}

// ---- Floating background particles ------------------------------------------
const FLOAT_ITEMS = [
  { em: '💻', left: 6,  dur: 24, del: -5,  sz: 38, op: 0.07 },
  { em: '🚀', left: 18, dur: 30, del: -12, sz: 42, op: 0.065 },
  { em: '🍳', left: 33, dur: 20, del: -8,  sz: 36, op: 0.07 },
  { em: '⚡', left: 50, dur: 27, del: -16, sz: 44, op: 0.06 },
  { em: '👗', left: 64, dur: 22, del: -3,  sz: 38, op: 0.07 },
  { em: '🧬', left: 76, dur: 33, del: -21, sz: 40, op: 0.055 },
  { em: '📱', left: 87, dur: 18, del: -10, sz: 36, op: 0.07 },
  { em: '🌾', left: 94, dur: 26, del: -14, sz: 40, op: 0.06 },
  { em: '📊', left: 12, dur: 28, del: -19, sz: 24, op: 0.045 },
  { em: '🏗️', left: 42, dur: 21, del: -7,  sz: 26, op: 0.04 },
  { em: '🎭', left: 71, dur: 25, del: -4,  sz: 28, op: 0.045 },
  { em: '🏨', left: 57, dur: 35, del: -23, sz: 22, op: 0.035 },
  { em: '💎', left: 25, dur: 29, del: -17, sz: 24, op: 0.04 },
  { em: '🏛️', left: 83, dur: 23, del: -9,  sz: 26, op: 0.038 },
];

function HomeBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <style>{`
        @keyframes hs-drift {
          0%   { transform: translateY(105vh) rotate(-5deg); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 0.9; }
          100% { transform: translateY(-10vh) rotate(5deg); opacity: 0; }
        }
        @keyframes hs-aurora {
          0%,100% { opacity: 0.8; transform: scale(1) translateX(0); }
          40%     { opacity: 1;   transform: scale(1.07) translateX(-1.5%); }
          70%     { opacity: 0.75; transform: scale(0.97) translateX(1.5%); }
        }
        @keyframes hs-grid-pulse {
          0%,100% { opacity: 0.028; }
          50%     { opacity: 0.055; }
        }
        @keyframes hs-title-glow {
          0%,100% { text-shadow: 0 0 40px rgba(90,74,242,0.5), 0 0 80px rgba(90,74,242,0.2); }
          50%     { text-shadow: 0 0 60px rgba(90,74,242,0.8), 0 0 100px rgba(90,74,242,0.35); }
        }
        .hs-em { position: absolute; line-height: 1; animation: hs-drift linear infinite; }
      `}</style>

      {/* Base dark */}
      <div className="absolute inset-0" style={{ background: '#070b12' }} />

      {/* Aurora layers */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 140% 60% at 20% 10%, rgba(90,74,242,0.18), transparent 65%),
            radial-gradient(ellipse 100% 50% at 80% 90%, rgba(168,139,250,0.10), transparent 65%),
            radial-gradient(ellipse 70% 45% at 55% 50%, rgba(55,48,163,0.08), transparent 70%)
          `,
          animation: 'hs-aurora 10s ease-in-out infinite',
        }}
      />

      {/* Dot grid */}
      <svg
        width="100%" height="100%"
        className="absolute inset-0"
        style={{ animation: 'hs-grid-pulse 8s ease-in-out infinite' }}
      >
        <defs>
          <pattern id="hs-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#5a4af2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hs-dots)" />
      </svg>

      {/* Floating industry emojis */}
      {FLOAT_ITEMS.map((p, i) => (
        <span
          key={i}
          className="hs-em"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.sz}px`,
            opacity: p.op,
            filter: 'grayscale(20%) blur(0.5px)',
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.del}s`,
          }}
        >
          {p.em}
        </span>
      ))}

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: 'linear-gradient(to bottom, transparent, #070b12)' }}
      />
    </div>
  );
}

// ---- Load game drawer --------------------------------------------------------
function LoadGameSheet({ onClose }: { onClose: () => void }) {
  const { dispatch } = useGame();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function doImport() {
    const trimmed = text.trim();
    if (!trimmed) { setMsg({ ok: false, text: 'Paste a save code first.' }); return; }
    const parsed = importSave(trimmed);
    if (!parsed) { setMsg({ ok: false, text: 'Invalid save code.' }); return; }
    dispatch({ type: 'IMPORT', state: parsed });
    setMsg({ ok: true, text: 'Save loaded! Starting...' });
    setTimeout(() => onClose(), 900);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(7,11,18,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl p-5"
        style={{ background: '#0e1420', border: '1px solid #232c3e' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold text-[#e7ecf5] text-base">Load Save</div>
            <div className="text-xs text-[#8a94a8]">Paste your exported save code below.</div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a94a8] text-xl leading-none px-2 py-1 rounded-lg hover:text-[#e7ecf5]"
          >
            ×
          </button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste save code…"
          rows={4}
          className="w-full resize-none rounded-xl border p-3 text-xs font-mono text-[#e7ecf5] placeholder:text-[#8a94a8] focus:outline-none no-scrollbar"
          style={{ background: '#070b12', borderColor: '#232c3e' }}
        />
        {msg && (
          <div
            className="mt-2 text-xs px-3 py-1.5 rounded-lg"
            style={{
              background: msg.ok ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              color: msg.ok ? '#34d399' : '#f87171',
            }}
          >
            {msg.text}
          </div>
        )}
        <button
          onClick={doImport}
          disabled={!text.trim()}
          className="mt-3 w-full rounded-xl py-3 font-bold text-sm text-[#070b12] transition-transform active:scale-95 disabled:opacity-40"
          style={{ background: '#7d6ff7' }}
        >
          Import & Play →
        </button>
      </div>
    </div>
  );
}

// ---- Main component ----------------------------------------------------------

export default function HomeScreen({ onNewGame }: HomeScreenProps) {
  const [showLoad, setShowLoad] = useState(false);

  function startMode(mode: GameMode) {
    sfx.play('milestone');
    haptic('success');
    onNewGame(mode);
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between py-10 px-5 max-w-[480px] mx-auto overflow-hidden">
      <HomeBackground />

      {/* RyNo Studios mark */}
      <div className="flex flex-col items-center gap-1 animate-fade-in">
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: '44px', height: '44px',
            background: 'linear-gradient(145deg, #151c2e, #0d1120)',
            border: '1.5px solid rgba(90,74,242,0.5)',
            boxShadow: '0 0 20px -6px rgba(90,74,242,0.5)',
          }}
        >
          <svg viewBox="0 0 512 512" width="30" height="30">
            <defs>
              <linearGradient id="hs-cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b4a7fb"/>
                <stop offset="100%" stopColor="#4338ca"/>
              </linearGradient>
            </defs>
            <path d="M156,354 L156,268 L198,310 L230,210 L256,278 L282,210 L314,310 L356,268 L356,354 Z" fill="url(#hs-cg)"/>
            <rect x="142" y="344" width="228" height="42" rx="11" fill="#5a4af2"/>
            <circle cx="230" cy="206" r="13" fill="#f472b6"/>
            <circle cx="282" cy="206" r="13" fill="#fbbf24"/>
            <circle cx="256" cy="274" r="9" fill="#38bdf8"/>
          </svg>
        </div>
        <div className="text-[9px] tracking-[0.38em] uppercase" style={{ color: '#3a4460' }}>
          <span style={{ color: '#7d6ff7', fontWeight: 700 }}>RyNo</span> Studios
        </div>
      </div>

      {/* Hero title */}
      <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
        {/* Big pixel-brick logo title */}
        <div
          style={{
            fontSize: '42px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            textAlign: 'center',
            color: '#e7ecf5',
            textShadow: `
              3px 3px 0 rgba(90,74,242,0.55),
              6px 6px 0 rgba(90,74,242,0.22),
              0 0 60px rgba(90,74,242,0.6),
              0 0 120px rgba(90,74,242,0.25)
            `,
            fontFamily: "'Courier New', 'Consolas', monospace",
            textTransform: 'uppercase',
            animation: 'hs-title-glow 3.5s ease-in-out infinite',
          }}
        >
          EMPIRE<br/>ENGINE
        </div>

        <div
          className="text-center"
          style={{
            fontSize: '11px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#3d4a62',
          }}
        >
          Build an industrial dynasty
        </div>
      </div>

      {/* CTA buttons */}
      <div className="w-full flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '250ms' }}>
        {/* Story Mode */}
        <button
          onClick={() => startMode('inheritance')}
          className="relative w-full rounded-2xl p-4 text-left overflow-hidden active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, rgba(90,74,242,0.22), rgba(90,74,242,0.06))',
            border: '1px solid rgba(90,74,242,0.55)',
            boxShadow: '0 4px 28px -8px rgba(90,74,242,0.45)',
          }}
        >
          <div className="absolute inset-0 opacity-10"
               style={{ background: 'radial-gradient(ellipse at 0% 0%, #7d6ff7, transparent 60%)' }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📖</span>
              <span className="font-bold text-[#e7ecf5] text-base">Story Mode</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(90,74,242,0.3)', color: '#b4a7fb' }}>
                RECOMMENDED
              </span>
            </div>
            <div className="text-[12px] text-[#8a94a8] leading-relaxed">
              The Inheritance Arc — shape an empire from your Old Master's legacy. A full narrative campaign.
            </div>
          </div>
        </button>

        {/* Just Roll With It */}
        <button
          onClick={() => startMode('empire_run')}
          className="relative w-full rounded-2xl p-4 text-left overflow-hidden active:scale-[0.98] transition-transform"
          style={{
            background: 'rgba(30,36,54,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎲</span>
              <span className="font-bold text-[#e7ecf5] text-base">Just Roll With It</span>
            </div>
            <div className="text-[12px] text-[#8a94a8] leading-relaxed">
              Freeform Empire Run — pick an industry and build without narrative rails. Pure strategy.
            </div>
          </div>
        </button>

        {/* Load Game */}
        <button
          onClick={() => setShowLoad(true)}
          className="w-full rounded-2xl py-3.5 font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#8a94a8',
          }}
        >
          📂 Load Saved Game
        </button>
      </div>

      {showLoad && <LoadGameSheet onClose={() => setShowLoad(false)} />}
    </div>
  );
}
