// HomeScreen - immersive entry point. RyNo Studios presents header, logo above
// the EMPIRE ENGINE title, all game-mode CTAs, and save-slot load UI.

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import type { GameMode } from '../../game/types';
import { importSave, listSlots, loadFromSlot, saveToSlot, type SlotIndex } from '../../game/SaveSystem';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';
import EmpireLogo from '../shared/EmpireLogo';

export interface HomeScreenProps {
  onNewGame:  (mode: GameMode) => void;
  onContinue?: () => void;
}

// ---- Industry emoji lookup ---------------------------------------------------
const INDUSTRY_EMOJI: Record<string, string> = {
  tech: '💻', space: '🚀', culinary: '🍳', energy: '⚡',
  fashion: '👗', biotech: '🧬', media: '📱', agri: '🌾',
  finance: '💹', realestate: '🏢', entertainment: '🎭', hospitality: '🏨',
};

// ---- Dual-layer premium city skyline silhouettes ----------------------------
function CitySilhouette() {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 w-full">

      {/* Horizon glow line */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: '0px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(245,200,66,0.18) 20%, rgba(78,205,196,0.14) 50%, rgba(245,200,66,0.18) 80%, transparent 100%)',
          boxShadow: '0 0 24px 6px rgba(245,200,66,0.07)',
        }}
      />

      {/* Far background city — faint, smaller scale */}
      <svg
        viewBox="0 0 480 260"
        preserveAspectRatio="xMidYMax meet"
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{ opacity: 0.055, fill: 'rgba(180,200,255,0.9)' }}
      >
        <path d="
          M0,260 L0,200 L12,200 L12,185 L20,185 L20,168 L24,162 L28,155 L32,162 L32,168 L38,168
          L38,185 L48,185 L48,165 L58,165 L58,145 L62,138 L66,130 L70,138 L70,145 L80,145
          L80,165 L92,165 L92,148 L104,148 L104,125 L108,118 L112,110 L116,118 L116,125
          L126,125 L126,148 L138,148 L138,130 L150,130 L150,108 L154,100 L158,90 L162,82
          L166,90 L170,100 L174,108 L174,130 L184,130 L184,148 L196,148 L196,125 L208,125
          L208,100 L212,92 L216,84 L220,92 L224,100 L224,125 L234,125 L234,148 L244,148
          L244,128 L256,128 L256,108 L260,100 L264,92 L268,100 L272,108 L272,128 L282,128
          L282,148 L292,148 L292,125 L304,125 L304,105 L308,97 L312,88 L316,97 L320,105
          L320,125 L330,125 L330,145 L340,145 L340,122 L352,122 L352,100 L356,92 L360,84
          L364,92 L368,100 L368,122 L378,122 L378,142 L388,142 L388,118 L398,118 L398,138
          L408,138 L408,155 L418,155 L418,172 L428,172 L428,188 L438,188 L438,175 L448,175
          L448,190 L458,190 L458,205 L468,205 L468,218 L480,218 L480,260 Z
        " />
      </svg>

      {/* Near foreground city — more visible, taller, dominant skyline */}
      <svg
        viewBox="0 0 480 280"
        preserveAspectRatio="xMidYMax meet"
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{ opacity: 0.10 }}
      >
        <defs>
          <linearGradient id="hs-sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          fill="url(#hs-sg)"
          d="
            M0,280 L0,218 L10,218 L10,200 L18,200 L18,180 L22,175 L22,162 L25,155
            L28,162 L28,175 L30,180 L38,180 L38,200 L48,200 L48,176 L56,176 L56,152
            L60,144 L64,134 L68,144 L72,152 L72,176 L82,176 L82,200 L94,200
            L94,178 L106,178 L106,152 L110,142 L114,130 L118,118 L122,108 L126,96
            L130,108 L134,118 L138,130 L142,142 L146,152 L146,178 L156,178
            L156,200 L168,200 L168,175 L180,175 L180,150 L184,140 L188,128
            L192,116 L196,104 L200,92 L204,80 L208,92 L212,104 L216,116 L220,128
            L224,140 L224,150 L224,175 L234,175 L234,200 L244,200 L244,172
            L256,172 L256,148 L260,138 L264,126 L268,114 L272,102 L276,90
            L280,102 L284,114 L288,126 L292,138 L292,148 L292,172 L302,172
            L302,195 L312,195 L312,168 L324,168 L324,142 L328,132 L332,120
            L336,108 L340,120 L344,132 L348,142 L348,168 L358,168 L358,190
            L368,190 L368,165 L380,165 L380,142 L384,134 L388,125 L392,134
            L392,142 L402,142 L402,165 L412,165 L412,185 L420,185 L420,165
            L430,165 L430,185 L440,185 L440,200 L450,200 L450,218 L460,218
            L460,232 L470,232 L470,246 L480,246 L480,280 Z
          "
        />
      </svg>
    </div>
  );
}

// ---- Animated background (aurora + grid + floating icons) --------------------
const FLOAT_ITEMS = [
  { em: '💻', left: 6,  dur: 24, del: -5,  sz: 38, op: 0.06 },
  { em: '🚀', left: 18, dur: 30, del: -12, sz: 42, op: 0.055 },
  { em: '🍳', left: 33, dur: 20, del: -8,  sz: 36, op: 0.06 },
  { em: '⚡', left: 50, dur: 27, del: -16, sz: 44, op: 0.05 },
  { em: '👗', left: 64, dur: 22, del: -3,  sz: 38, op: 0.06 },
  { em: '🧬', left: 76, dur: 33, del: -21, sz: 40, op: 0.048 },
  { em: '📱', left: 87, dur: 18, del: -10, sz: 36, op: 0.06 },
  { em: '🌾', left: 94, dur: 26, del: -14, sz: 40, op: 0.05 },
  { em: '📊', left: 12, dur: 28, del: -19, sz: 24, op: 0.038 },
  { em: '🏗️', left: 42, dur: 21, del: -7,  sz: 26, op: 0.034 },
  { em: '🎭', left: 71, dur: 25, del: -4,  sz: 28, op: 0.038 },
  { em: '💎', left: 25, dur: 29, del: -17, sz: 24, op: 0.034 },
];

function HomeBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
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
          0%,100% { opacity: 0.022; }
          50%     { opacity: 0.048; }
        }
        @keyframes hs-title-glow {
          0%,100% { filter: drop-shadow(0 0 18px rgba(245,200,66,0.4)) drop-shadow(0 0 40px rgba(245,200,66,0.15)); }
          50%     { filter: drop-shadow(0 0 28px rgba(245,200,66,0.7)) drop-shadow(0 0 60px rgba(245,200,66,0.28)); }
        }
        @keyframes hs-logo-glow {
          0%,100% { box-shadow: 0 0 32px -8px rgba(245,200,66,0.55); }
          50%     { box-shadow: 0 0 48px -4px rgba(245,200,66,0.80), 0 0 80px -16px rgba(78,205,196,0.35); }
        }
        @keyframes hs-header-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hs-em { position: absolute; line-height: 1; animation: hs-drift linear infinite; }
      `}</style>

      <div className="absolute inset-0" style={{ background: '#060A14' }} />

      {/* Aurora */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 140% 55% at 20% 5%,  rgba(90,74,242,0.14), transparent 65%),
          radial-gradient(ellipse 100% 50% at 80% 90%, rgba(78,205,196,0.10), transparent 65%),
          radial-gradient(ellipse 80%  45% at 60% 40%, rgba(245,200,66,0.07), transparent 70%)
        `,
        animation: 'hs-aurora 12s ease-in-out infinite',
      }} />

      {/* Dot grid */}
      <svg width="100%" height="100%" className="absolute inset-0"
           style={{ animation: 'hs-grid-pulse 8s ease-in-out infinite' }}>
        <defs>
          <pattern id="hs-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#5a4af2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hs-dots)" />
      </svg>

      {/* Floating industry icons */}
      {FLOAT_ITEMS.map((p, i) => (
        <span key={i} className="hs-em" style={{
          left: `${p.left}%`,
          fontSize: `${p.sz}px`,
          opacity: p.op,
          filter: 'grayscale(15%) blur(0.5px)',
          animationDuration: `${p.dur}s`,
          animationDelay: `${p.del}s`,
        }}>
          {p.em}
        </span>
      ))}

      <div className="absolute bottom-0 left-0 right-0 h-56"
           style={{ background: 'linear-gradient(to bottom, transparent, #060A14)' }} />
    </div>
  );
}

// ---- Save slot UI -----------------------------------------------------------

function formatSavedAt(ts: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function SaveSlotCard({
  slot,
  onLoad,
  disabled,
}: {
  slot: ReturnType<typeof listSlots>[0];
  onLoad: (idx: SlotIndex) => void;
  disabled?: boolean;
}) {
  const emoji = INDUSTRY_EMOJI[slot.industry] ?? '🏭';
  return (
    <button
      onClick={() => { if (slot.hasData) onLoad(slot.slot); }}
      disabled={!slot.hasData || disabled}
      className="w-full text-left rounded-2xl p-3.5 border transition-transform active:scale-[0.98] disabled:opacity-40"
      style={{
        background: slot.hasData
          ? 'linear-gradient(135deg, rgba(245,200,66,0.06), rgba(78,205,196,0.03))'
          : 'rgba(14,20,32,0.4)',
        borderColor: slot.hasData ? 'rgba(245,200,66,0.22)' : '#1e2840',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: slot.hasData ? 'rgba(245,200,66,0.12)' : '#151c2b' }}
        >
          {slot.hasData ? emoji : <span className="text-[#3d4a62] text-xs">✕</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-[#e7ecf5] truncate">
            {slot.hasData ? slot.name : `Slot ${slot.slot} — Empty`}
          </div>
          <div className="text-[10px] text-[#8a94a8] mt-0.5">
            {slot.hasData ? formatSavedAt(slot.savedAt) : 'No save data'}
          </div>
        </div>
        {slot.hasData && (
          <div
            className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{ background: '#F5C842', color: '#060A14' }}
          >
            Load
          </div>
        )}
      </div>
    </button>
  );
}

function LoadGameSheet({ onClose }: { onClose: () => void }) {
  const { dispatch } = useGame();
  const [tab, setTab] = useState<'slots' | 'code'>('slots');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const slots = listSlots();

  function loadSlot(idx: SlotIndex) {
    sfx.play('milestone');
    haptic('success');
    const state = loadFromSlot(idx);
    if (!state) { setMsg({ ok: false, text: 'Slot data corrupted.' }); return; }
    dispatch({ type: 'IMPORT', state });
    setMsg({ ok: true, text: 'Loaded! Starting...' });
    setTimeout(() => onClose(), 800);
  }

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
      style={{ background: 'rgba(4,6,14,0.88)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl overflow-hidden"
        style={{ background: '#0b1120', border: '1px solid #1e2840', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="font-bold text-[#e7ecf5] text-base">Load Game</div>
            <div className="text-xs text-[#8a94a8] mt-0.5">Select a save slot or paste a code</div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a94a8] w-8 h-8 flex items-center justify-center rounded-xl glass text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex mx-5 mb-4 rounded-xl overflow-hidden border border-[#1e2840]">
          {(['slots', 'code'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-[11px] font-semibold transition-colors"
              style={{
                background: tab === t ? '#F5C842' : 'transparent',
                color: tab === t ? '#060A14' : '#8a94a8',
              }}
            >
              {t === 'slots' ? '💾 Save Slots' : '📋 Import Code'}
            </button>
          ))}
        </div>

        {/* Slots tab */}
        {tab === 'slots' && (
          <div className="flex flex-col gap-2 px-5 pb-6">
            {slots.map(slot => (
              <SaveSlotCard
                key={slot.slot}
                slot={slot}
                onLoad={loadSlot}
                disabled={loading}
              />
            ))}
            {!slots.some(s => s.hasData) && (
              <div className="text-center py-4 text-[11px] text-[#3d4a62]">
                No saves yet. Start a game and save from the 💾 button.
              </div>
            )}
          </div>
        )}

        {/* Code tab */}
        {tab === 'code' && (
          <div className="px-5 pb-6">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste save code..."
              rows={4}
              className="w-full resize-none rounded-xl border p-3 text-xs font-mono text-[#e7ecf5] placeholder:text-[#8a94a8] focus:outline-none no-scrollbar"
              style={{ background: '#070b12', borderColor: '#1e2840' }}
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
              className="mt-3 w-full rounded-xl py-3 font-bold text-sm transition-transform active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #F5C842, #D4950F)', color: '#060A14' }}
            >
              Import &amp; Play
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Save slot picker (for the 💾 button in-game) ---------------------------

export function SaveSlotPicker({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const [saved, setSaved] = useState<SlotIndex | null>(null);
  const slots = listSlots();


  function doSave(slot: SlotIndex) {
    saveToSlot(state, slot);
    setSaved(slot);
    haptic('success');
    setTimeout(() => onClose(), 900);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(4,6,14,0.88)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl overflow-hidden"
        style={{ background: '#0b1120', border: '1px solid #1e2840', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="font-bold text-[#e7ecf5] text-base">Save Game</div>
            <div className="text-xs text-[#8a94a8] mt-0.5">Choose a slot to save your progress</div>
          </div>
          <button onClick={onClose} className="text-[#8a94a8] w-8 h-8 flex items-center justify-center rounded-xl glass text-sm">✕</button>
        </div>

        <div className="flex flex-col gap-2 px-5 pb-6">
          {slots.map(slot => (
            <button
              key={slot.slot}
              onClick={() => doSave(slot.slot)}
              className="w-full text-left rounded-2xl p-3.5 border transition-transform active:scale-[0.98]"
              style={{
                background: saved === slot.slot
                  ? 'rgba(52,211,153,0.1)'
                  : slot.hasData
                    ? 'rgba(245,200,66,0.06)'
                    : 'rgba(14,20,32,0.4)',
                borderColor: saved === slot.slot ? '#34d399' : slot.hasData ? 'rgba(245,200,66,0.22)' : '#1e2840',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                     style={{ background: 'rgba(245,200,66,0.1)' }}>
                  {saved === slot.slot ? '✅' : '💾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[#e7ecf5]">
                    {saved === slot.slot ? 'Saved!' : slot.hasData ? `Overwrite: ${slot.name}` : `Slot ${slot.slot} — Empty`}
                  </div>
                  <div className="text-[10px] text-[#8a94a8] mt-0.5">
                    {slot.hasData ? formatSavedAt(slot.savedAt) : 'No existing data'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Main component ----------------------------------------------------------
export default function HomeScreen({ onNewGame, onContinue }: HomeScreenProps) {
  const [showLoad, setShowLoad] = useState(false);

  function startMode(mode: GameMode) {
    sfx.play('milestone');
    haptic('success');
    onNewGame(mode);
  }

  function continueGame() {
    sfx.play('milestone');
    haptic('success');
    onContinue?.();
  }

  return (
    <div className="relative min-h-screen flex flex-col px-5 max-w-[480px] mx-auto overflow-hidden">
      <HomeBackground />
      <CitySilhouette />

      {/* Header - "RyNo Studios presents" */}
      <div
        className="relative z-10 flex justify-center pt-10 pb-1"
        style={{ animation: 'hs-header-in 0.5s 0.05s ease both' }}
      >
        <div style={{ fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 500 }}>
          <span style={{ color: '#F5C842', fontWeight: 700 }}>RyNo</span>{' '}
          <span style={{ color: '#6b7899' }}>Studios</span>{' '}
          <span style={{ color: '#3a4460' }}>presents</span>
        </div>
      </div>

      {/* Hero - logo above Empire Engine title */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">

        {/* Logo */}
        <div
          className="animate-fade-in"
          style={{
            width: '92px', height: '92px', borderRadius: '50%',
            background: 'linear-gradient(145deg, #0A1525, #050A14)',
            border: '2px solid rgba(245,200,66,0.52)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            animation: 'hs-logo-glow 3.8s 0.5s ease-in-out infinite',
          }}
        >
          <EmpireLogo size={68} uid="hs" />
        </div>

        {/* Title + tagline */}
        <div className="flex flex-col items-center gap-2.5 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div style={{
            fontSize: '62px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.0,
            textAlign: 'center', fontFamily: "'Courier New', Consolas, monospace",
            textTransform: 'uppercase',
            background: 'linear-gradient(145deg, #FFF4A3 0%, #FFD166 30%, #F5C842 60%, #C8890A 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'hs-title-glow 3.5s ease-in-out infinite',
          }}>
            EMPIRE<br/>ENGINE
          </div>
          <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: '#4ECDC4', fontWeight: 600 }}>
            Build an industrial dynasty
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="w-full flex flex-col gap-3 pb-10 animate-fade-in" style={{ animationDelay: '200ms' }}>
        {/* Continue */}
        {onContinue && (
          <button
            onClick={continueGame}
            className="relative w-full rounded-2xl p-4 text-left overflow-hidden active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #F5C842, #C8890A)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 32px -8px rgba(245,200,66,0.55)' }}
          >
            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 0% 0%, #fff, transparent 60%)' }} />
            <div className="relative flex items-center gap-3">
              <span className="text-2xl leading-none">&#9654;</span>
              <div>
                <div className="font-bold text-[#060A14] text-base">Continue Empire</div>
                <div className="text-[12px] text-[#3a2800] leading-snug">Pick up where you left off</div>
              </div>
            </div>
          </button>
        )}

        {/* Story Mode */}
        <button
          onClick={() => startMode('inheritance')}
          className="relative w-full rounded-2xl p-4 text-left overflow-hidden active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, rgba(90,74,242,0.2), rgba(90,74,242,0.05))', border: '1px solid rgba(90,74,242,0.5)', boxShadow: '0 4px 24px -8px rgba(90,74,242,0.4)' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at 0% 0%, #7d6ff7, transparent 60%)' }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📖</span>
              <span className="font-bold text-[#e7ecf5] text-base">Story Mode</span>
              {!onContinue && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(90,74,242,0.3)', color: '#b4a7fb' }}>
                  RECOMMENDED
                </span>
              )}
            </div>
            <div className="text-[12px] text-[#8a94a8] leading-relaxed">
              The Inheritance Arc - shape an empire from your Old Master's legacy.
            </div>
          </div>
        </button>

        {/* Just Roll With It */}
        <button
          onClick={() => startMode('empire_run')}
          className="relative w-full rounded-2xl p-4 text-left overflow-hidden active:scale-[0.98] transition-transform"
          style={{ background: 'rgba(30,36,54,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎲</span>
              <span className="font-bold text-[#e7ecf5] text-base">Just Roll With It</span>
            </div>
            <div className="text-[12px] text-[#8a94a8] leading-relaxed">
              Freeform Empire Run - pick an industry and build without narrative rails.
            </div>
          </div>
        </button>

        {/* Load Game */}
        <button
          onClick={() => setShowLoad(true)}
          className="w-full rounded-2xl py-3.5 font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#8a94a8' }}
        >
          📂 Load Saved Game
        </button>
      </div>

      {showLoad && <LoadGameSheet onClose={() => setShowLoad(false)} />}
    </div>
  );
}
