// ============================================================================
// IndustrySelect  -  premium onboarding / company-founding flow.
//   1. Name your company
//   2. Pick one of 12 industries (rich cards with flavor/challenge/archetype)
//   3. Choose a game mode (The Inheritance Arc vs The Empire Run)
//   4. [Inheritance Arc only] Old Master origin scene (modal)
//   5. Pick your accent color
//   6. Pick a founding philosophy
//   7. Meet your co-founder
//   Found Company -> dispatch SETUP
// ============================================================================

import { useMemo, useState } from 'react';

import { useGame } from '../../game/GameContext';
import {
  ACCENT_SWATCHES,
  INDUSTRY_LIST,
  PHILOSOPHIES,
} from '../../data/industries';
import { AIDE_CONFIGS } from '../../data/aides';
import type { CompanySetup, GameMode, IndustryType, Philosophy } from '../../game/types';
import Card from '../shared/Card';
import OldMasterOriginModal from './OldMasterOriginModal';
import FoundingRitualModal from './FoundingRitualModal';
import { getOldMaster } from '../../data/oldMasters';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';
import { celebrate } from '../shared/CelebrationHost';

// ---------------------------------------------------------------------------
// Animated home-screen background
// ---------------------------------------------------------------------------

const FLOAT_ITEMS = [
  { em: '💻', left: 6,  dur: 24, del: -5,  sz: 38, op: 0.08 },
  { em: '🚀', left: 18, dur: 30, del: -12, sz: 42, op: 0.07 },
  { em: '🍳', left: 33, dur: 20, del: -8,  sz: 36, op: 0.09 },
  { em: '⚡', left: 50, dur: 27, del: -16, sz: 44, op: 0.07 },
  { em: '👗', left: 64, dur: 22, del: -3,  sz: 38, op: 0.08 },
  { em: '🧬', left: 76, dur: 33, del: -21, sz: 40, op: 0.06 },
  { em: '📱', left: 87, dur: 18, del: -10, sz: 36, op: 0.09 },
  { em: '🌾', left: 94, dur: 26, del: -14, sz: 40, op: 0.07 },
  { em: '📊', left: 12, dur: 28, del: -19, sz: 26, op: 0.055 },
  { em: '🏗️', left: 42, dur: 21, del: -7,  sz: 28, op: 0.05 },
  { em: '🎭', left: 71, dur: 25, del: -4,  sz: 30, op: 0.055 },
  { em: '🏨', left: 57, dur: 35, del: -23, sz: 24, op: 0.045 },
  { em: '🧬', left: 25, dur: 29, del: -17, sz: 26, op: 0.05 },
  { em: '🚀', left: 83, dur: 23, del: -9,  sz: 28, op: 0.045 },
];

function HomeBg({ accent }: { accent: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
    >
      <style>{`
        @keyframes hb-drift {
          0%   { transform: translateY(105vh) rotate(-6deg); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 0.85; }
          100% { transform: translateY(-12vh) rotate(6deg); opacity: 0; }
        }
        @keyframes hb-aurora {
          0%,100% { opacity: 0.7; transform: scale(1) translateX(0); }
          33%     { opacity: 1;   transform: scale(1.06) translateX(-2%); }
          66%     { opacity: 0.8; transform: scale(0.97) translateX(2%); }
        }
        @keyframes hb-dot-pulse {
          0%,100% { opacity: 0.035; }
          50%     { opacity: 0.065; }
        }
        .hb-em { position: absolute; line-height: 1; animation: hb-drift linear infinite; }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 130% 55% at 25% 15%, color-mix(in srgb, ${accent} 14%, transparent), transparent 65%),
            radial-gradient(ellipse 90% 45% at 78% 85%, rgba(90,74,242,0.10), transparent 70%),
            radial-gradient(ellipse 60% 40% at 55% 50%, rgba(55,48,163,0.07), transparent 70%)
          `,
          animation: 'hb-aurora 9s ease-in-out infinite',
        }}
      />

      {FLOAT_ITEMS.map((p, i) => (
        <span
          key={i}
          className="hb-em"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.sz}px`,
            opacity: p.op,
            filter: 'grayscale(25%) blur(0.4px)',
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.del}s`,
          }}
        >
          {p.em}
        </span>
      ))}

      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ animation: 'hb-dot-pulse 7s ease-in-out infinite' }}
      >
        <defs>
          <pattern id="hb-dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={accent} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hb-dots)" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Industry card (expanded detail when selected)
// ---------------------------------------------------------------------------

function IndustryCard({
  cfg,
  selected,
  onPick,
}: {
  cfg: (typeof INDUSTRY_LIST)[number];
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <Card
      pad="sm"
      active={selected}
      onClick={onPick}
      className="relative overflow-hidden transition-all"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.10]"
        style={{
          background: `radial-gradient(90% 80% at 0% 0%, ${cfg.accent}, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start gap-2">
          <span className="text-2xl leading-none mt-0.5">{cfg.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[14px] leading-tight">{cfg.name}</span>
              {selected && (
                <span className="ml-auto text-[var(--accent)] text-sm">✓</span>
              )}
            </div>
            <div className="text-[10px] text-muted mt-0.5 line-clamp-1">{cfg.tagline}</div>
          </div>
        </div>

        {/* Expanded detail when selected */}
        {selected && (
          <div className="mt-3 space-y-2 animate-slide-up">
            <p className="text-[11px] leading-relaxed text-[#9aa8be] italic border-l-2 pl-2"
               style={{ borderColor: `color-mix(in srgb, ${cfg.accent} 60%, transparent)` }}>
              {cfg.flavor}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#0e1420] border border-[#232c3e] px-1.5 py-0.5">
                <span className="text-[9px]">⚡</span>
                <span className="text-[9px] font-medium" style={{ color: cfg.accent }}>{cfg.mechanicName}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#180e0e] border border-[#2e1e1e] px-1.5 py-0.5">
                <span className="text-[9px]">⚠</span>
                <span className="text-[9px] text-[#ca7a7a]">{cfg.challenge}</span>
              </span>
            </div>
            <div className="text-[10px] text-muted mt-1">
              <span className="opacity-50">For:</span> {cfg.archetype}
            </div>
          </div>
        )}

        {/* Collapsed mechanic chip */}
        {!selected && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#0e1420] border border-[#232c3e] px-1.5 py-0.5">
            <span className="text-[10px]">⚙️</span>
            <span className="text-[10px] font-medium text-[var(--accent)]">{cfg.mechanicName}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mode selection cards
// ---------------------------------------------------------------------------

function ModeCard({
  mode,
  selected,
  accent,
  onPick,
}: {
  mode: GameMode;
  selected: boolean;
  accent: string;
  onPick: () => void;
}) {
  const isInheritance = mode === 'inheritance';
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full text-left rounded-xl p-4 transition-all relative overflow-hidden"
      style={{
        border: selected
          ? `1px solid ${accent}`
          : '1px solid rgba(255,255,255,0.07)',
        background: selected
          ? `color-mix(in srgb, ${accent} 8%, #090d16)`
          : '#090d16',
        boxShadow: selected
          ? `0 0 24px -8px color-mix(in srgb, ${accent} 40%, transparent)`
          : 'none',
      }}
    >
      {selected && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, ${accent} 10%, transparent), transparent 70%)`,
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted mb-0.5">
              {isInheritance ? 'Story Mode' : 'Alternate Mode'}
            </div>
            <div className="text-[15px] font-semibold" style={{ color: selected ? accent : '#c8d8f0' }}>
              {isInheritance ? 'The Inheritance Arc' : 'The Empire Run'}
            </div>
          </div>
          <div
            className="h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
            style={{
              borderColor: selected ? accent : 'rgba(255,255,255,0.2)',
              background: selected ? accent : 'transparent',
            }}
          >
            {selected && <span className="text-[10px] text-[#050810] font-bold">✓</span>}
          </div>
        </div>
        <p className="text-[11px] text-muted leading-relaxed mb-2">
          {isInheritance
            ? 'You inherit a legendary empire. A will binds it. Choose your aide, honor the clauses, and claim what was left for you.'
            : 'No cutscenes. The story lives in your rivals, your companions, and the Ledger. For players who\'ve earned the right to skip the preamble.'}
        </p>
        <div className="flex flex-wrap gap-1">
          {(isInheritance
            ? ['Old Master origin', 'Aide selection', 'Industry clauses', 'Full story arc']
            : ['Ambient narrative', 'Deep rival arcs', 'Companion spine', 'Industry backdrop']
          ).map((f) => (
            <span
              key={f}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: selected
                  ? `color-mix(in srgb, ${accent} 15%, transparent)`
                  : 'rgba(255,255,255,0.04)',
                color: selected ? accent : '#6a7a90',
                border: `1px solid ${selected ? `color-mix(in srgb, ${accent} 30%, transparent)` : 'transparent'}`,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Aide selection card
// ---------------------------------------------------------------------------

function AideCard({
  cfg,
  selected,
  accent,
  onPick,
}: {
  cfg: (typeof AIDE_CONFIGS)[number];
  selected: boolean;
  accent: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full text-left rounded-xl p-3.5 transition-all relative overflow-hidden"
      style={{
        border: selected
          ? `1px solid ${accent}`
          : '1px solid rgba(255,255,255,0.07)',
        background: selected
          ? `color-mix(in srgb, ${accent} 9%, #090d16)`
          : '#090d16',
        boxShadow: selected
          ? `0 0 20px -6px color-mix(in srgb, ${accent} 35%, transparent)`
          : 'none',
      }}
    >
      {selected && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(70% 60% at 5% 5%, color-mix(in srgb, ${accent} 10%, transparent), transparent 65%)`,
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none mt-0.5 flex-shrink-0">{cfg.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-[13px] leading-snug" style={{ color: selected ? accent : '#c8d8f0' }}>
                {cfg.name}
              </span>
              {selected && (
                <div
                  className="h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: accent, background: accent }}
                >
                  <span className="text-[8px] text-[#050810] font-bold">✓</span>
                </div>
              )}
            </div>
            <div className="text-[10px]" style={{ color: selected ? `color-mix(in srgb, ${accent} 80%, #9aa8be)` : '#6a7a90' }}>
              {cfg.role}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#8a98b0] italic">
          "{cfg.tagline}"
        </p>
        <div
          className="mt-2 rounded-lg px-2 py-1.5 text-[10px] leading-snug"
          style={{
            background: selected
              ? `color-mix(in srgb, ${accent} 10%, transparent)`
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${selected ? `color-mix(in srgb, ${accent} 20%, transparent)` : 'rgba(255,255,255,0.05)'}`,
            color: selected ? `color-mix(in srgb, ${accent} 85%, #cde)` : '#606a7c',
          }}
        >
          <span className="font-semibold">Mechanic: </span>{cfg.mechanicDesc.split('.')[0]}.
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              color: accent,
              border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
            }}
          >
            Deploy: {cfg.deployLabel}
          </span>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function IndustrySelect({ initialMode }: { initialMode?: GameMode } = {}) {
  const { dispatch } = useGame();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<IndustryType | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>(initialMode ?? 'inheritance');
  const [showOrigin, setShowOrigin] = useState(false);
  const [originSeen, setOriginSeen] = useState(false);
  const [chosenAideId, setChosenAideId] = useState<string>('marcus');
  const [philosophy, setPhilosophy] = useState<Philosophy | null>(null);
  const [accentTouched, setAccentTouched] = useState(false);
  const [accent, setAccent] = useState<string>(ACCENT_SWATCHES[0]);
  const [pendingSetup, setPendingSetup] = useState<CompanySetup | null>(null);

  const selectedIndustry = useMemo(
    () => INDUSTRY_LIST.find((i) => i.id === industry) ?? null,
    [industry]
  );

  const oldMaster = useMemo(
    () => (industry ? getOldMaster(industry) : null),
    [industry]
  );

  function pickIndustry(id: IndustryType) {
    setIndustry(id);
    setOriginSeen(false); // reset if they change industry
    if (!accentTouched) {
      const cfg = INDUSTRY_LIST.find((i) => i.id === id);
      if (cfg) setAccent(cfg.accent);
    }
  }

  function pickAccent(hex: string) {
    setAccent(hex);
    setAccentTouched(true);
  }

  function pickMode(m: GameMode) {
    setGameMode(m);
    // Show origin scene immediately when selecting Inheritance Arc (if industry chosen)
    if (m === 'inheritance' && industry && !originSeen) {
      setShowOrigin(true);
    }
  }

  function handleOriginComplete() {
    setShowOrigin(false);
    setOriginSeen(true);
  }

  const trimmedName = name.trim();
  const ready = trimmedName.length > 0 && !!industry && !!philosophy;

  function found() {
    if (!ready || !industry || !philosophy) return;
    sfx.play('milestone');
    haptic('heavy');
    const setup: CompanySetup = {
      name: trimmedName,
      industry,
      accent,
      philosophy,
      foundedAt: Date.now(),
      gameMode,
      chosenAideId,
    };
    setPendingSetup(setup);
  }

  function completeSetup() {
    if (!pendingSetup) return;
    dispatch({ type: 'SETUP', payload: pendingSetup });
    celebrate({
      kind: 'milestone',
      icon: '🏛️',
      title: pendingSetup.name,
      subtitle: 'Your empire begins. Build something legendary.',
      color: pendingSetup.accent,
    });
  }

  // Founding ritual modal
  if (pendingSetup && industry) {
    return (
      <FoundingRitualModal
        companyName={pendingSetup.name}
        industry={industry}
        accent={accent}
        chosenAideId={chosenAideId}
        onComplete={completeSetup}
      />
    );
  }

  // Show Old Master origin modal
  if (showOrigin && oldMaster) {
    return <OldMasterOriginModal master={oldMaster} onComplete={handleOriginComplete} />;
  }

  return (
    <div
      style={{ ['--accent' as string]: accent }}
      className="max-w-[480px] mx-auto min-h-screen relative px-4 pt-8 pb-28 animate-fade-in"
    >
      <HomeBg accent={accent} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)',
        }}
      />

      {/* Header */}
      <header className="text-center mb-7">
        <div className="text-[11px] uppercase tracking-[0.28em] text-muted mb-2">
          Found your
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-[var(--accent)]">Empire</span> Engine
        </h1>
        <p className="text-muted text-sm mt-2">
          Build an industrial dynasty from a single spark.
        </p>
      </header>

      {/* 1. Company name */}
      <Section index={1} title="Name your company">
        <div className="relative">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={28}
            placeholder={selectedIndustry?.name ?? 'Acme Industries'}
            className="w-full rounded-xl bg-[#0e1420] border border-[#232c3e] px-4 py-3 text-base
                       text-[#e7ecf5] placeholder:text-[#54607a] outline-none transition-colors
                       focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            aria-label="Company name"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted">
            {trimmedName.length}/28
          </span>
        </div>
      </Section>

      {/* 2. Industry */}
      <Section index={2} title="Choose your industry">
        <div className="grid grid-cols-2 gap-2.5">
          {INDUSTRY_LIST.map((cfg) => (
            <IndustryCard
              key={cfg.id}
              cfg={cfg}
              selected={industry === cfg.id}
              onPick={() => pickIndustry(cfg.id)}
            />
          ))}
        </div>
      </Section>

      {/* 3. Game Mode */}
      <Section index={3} title="Choose your play style">
        <div className="space-y-3">
          <ModeCard mode="inheritance" selected={gameMode === 'inheritance'} accent={accent} onPick={() => pickMode('inheritance')} />
          <ModeCard mode="empire_run" selected={gameMode === 'empire_run'} accent={accent} onPick={() => pickMode('empire_run')} />
        </div>
        {industry && gameMode === 'inheritance' && !originSeen && (
          <button
            type="button"
            onClick={() => setShowOrigin(true)}
            className="mt-3 w-full text-center text-[11px] py-2 rounded-lg transition-colors"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
            }}
          >
            {oldMaster ? `Meet ${oldMaster.name} →` : 'View Old Master origin →'}
          </button>
        )}
        {originSeen && oldMaster && (
          <div className="mt-2 text-center text-[11px] text-muted flex items-center justify-center gap-1.5">
            <span style={{ color: accent }}>✓</span>
            <span>Origin seen — {oldMaster.name}'s legacy is yours</span>
          </div>
        )}
      </Section>

      {/* 4. Choose your aide */}
      <Section index={4} title={gameMode === 'inheritance' ? "Choose your starting aide" : "Your inner circle"}>
        {gameMode === 'inheritance' ? (
          <p className="text-[11px] text-muted leading-snug mb-3 -mt-1">
            The Old Master's inner circle. Each brings a unique mechanic — not a simple bonus. Choose the one whose approach matches yours.
          </p>
        ) : (
          <p className="text-[11px] text-muted leading-snug mb-3 -mt-1">
            All six come with the empire. They start neutral — earn their loyalty.
          </p>
        )}
        <div className="grid grid-cols-1 gap-2.5">
          {AIDE_CONFIGS.map((cfg) => (
            <AideCard
              key={cfg.id}
              cfg={cfg}
              selected={chosenAideId === cfg.id}
              accent={accent}
              onPick={() => setChosenAideId(cfg.id)}
            />
          ))}
        </div>
        {gameMode === 'inheritance' && (
          <div className="mt-2.5 rounded-lg px-3 py-2 text-[11px] text-muted"
               style={{ background: `color-mix(in srgb, ${accent} 6%, #0a0f1a)`, border: `1px solid color-mix(in srgb, ${accent} 15%, transparent)` }}>
            Your chosen aide starts at loyalty 80 — already bonded through years in the Old Master's circle. The others join at 50.
          </div>
        )}
      </Section>

      {/* 5→6. Accent color */}
      <Section index={6} title="Pick your signature color">
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_SWATCHES.map((hex) => {
            const isSel = accent === hex;
            return (
              <button
                key={hex}
                type="button"
                aria-label={`Accent ${hex}`}
                onClick={() => pickAccent(hex)}
                className="h-10 w-10 rounded-full transition-transform active:scale-90 relative"
                style={{
                  background: hex,
                  boxShadow: isSel
                    ? `0 0 0 2px #070b12, 0 0 0 4px ${hex}, 0 0 16px -2px ${hex}`
                    : '0 0 0 1px rgba(255,255,255,0.08)',
                }}
              >
                {isSel && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm drop-shadow">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span>Preview:</span>
          <span className="rounded-md px-2 py-1 font-semibold text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border border-[var(--accent)]">
            {trimmedName || selectedIndustry?.name || 'Your Empire'}
          </span>
        </div>
      </Section>

      {/* 6→7. Philosophy */}
      <Section index={7} title="Choose a founding philosophy">
        <div className="grid grid-cols-1 gap-2.5">
          {PHILOSOPHIES.map((p) => {
            const isSel = philosophy === p.id;
            return (
              <Card
                key={p.id}
                pad="sm"
                active={isSel}
                onClick={() => setPhilosophy(p.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px]">{p.name}</span>
                      {isSel && (
                        <span className="ml-auto text-[var(--accent)] text-sm">✓</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted leading-snug mt-0.5">
                      {p.desc}
                    </div>
                    <div className="mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold text-good bg-[color-mix(in_srgb,var(--good,#34d399)_14%,transparent)] border border-[color-mix(in_srgb,#34d399_45%,transparent)]">
                      {p.bonus}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* Found button */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="max-w-[480px] mx-auto px-4 pb-5 pt-3 bg-gradient-to-t from-[#070b12] via-[#070b12] to-transparent">
          {!ready && (
            <div className="text-center text-[11px] text-muted mb-2">
              {missingHint(trimmedName, industry, philosophy)}
            </div>
          )}
          <button
            type="button"
            disabled={!ready}
            onClick={found}
            className="w-full rounded-xl py-3.5 font-bold text-[15px] transition-transform
                       active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                       text-[#070b12]"
            style={{
              background: ready
                ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, white 8%), var(--accent))'
                : '#1b2334',
              color: ready ? '#070b12' : '#8a94a8',
              boxShadow: ready
                ? '0 8px 30px -8px color-mix(in srgb, var(--accent) 70%, transparent)'
                : 'none',
            }}
          >
            {ready ? `🏭  Found ${trimmedName}` : 'Found Company'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function missingHint(
  name: string,
  industry: IndustryType | null,
  philosophy: Philosophy | null
): string {
  if (!name) return 'Give your company a name to begin';
  if (!industry) return 'Pick an industry';
  if (!philosophy) return 'Choose a philosophy';
  return '';
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[10px] font-bold text-[var(--accent)]">
          {index}
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-[#e7ecf5]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
