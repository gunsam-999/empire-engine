// ============================================================================
// IndustrySelect  -  premium onboarding / company-founding flow.
//   1. Name your company (validated non-empty).
//   2. Pick one of 8 industries (accent ring on select).
//   3. Choose an accent color (live-previews across the whole screen).
//   4. Pick a founding philosophy (shows its bonus).
//   5. Found Company -> dispatch SETUP.
// The whole screen reacts to the chosen accent in real time via a local
// CSS var on the root element of this screen (GameContext owns the global one
// once SETUP fires).
// ============================================================================

import { useMemo, useState } from 'react';

import { useGame } from '../../game/GameContext';
import {
  ACCENT_SWATCHES,
  INDUSTRY_LIST,
  PHILOSOPHIES,
} from '../../data/industries';
import type { CompanySetup, IndustryType, Philosophy } from '../../game/types';
import Card from '../shared/Card';
import CofounderCustomizer from './CofounderCustomizer';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';
import { celebrate } from '../shared/CelebrationHost';

export default function IndustrySelect() {
  const { state, dispatch } = useGame();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<IndustryType | null>(null);
  const [philosophy, setPhilosophy] = useState<Philosophy | null>(null);
  const [accentTouched, setAccentTouched] = useState(false);
  const [accent, setAccent] = useState<string>(ACCENT_SWATCHES[0]);

  const selectedIndustry = useMemo(
    () => INDUSTRY_LIST.find((i) => i.id === industry) ?? null,
    [industry]
  );

  // Picking an industry seeds a matching accent until the player overrides it.
  function pickIndustry(id: IndustryType) {
    setIndustry(id);
    if (!accentTouched) {
      const cfg = INDUSTRY_LIST.find((i) => i.id === id);
      if (cfg) setAccent(cfg.accent);
    }
  }

  function pickAccent(hex: string) {
    setAccent(hex);
    setAccentTouched(true);
  }

  const trimmedName = name.trim();
  const ready = trimmedName.length > 0 && !!industry && !!philosophy;

  function found() {
    if (!ready || !industry || !philosophy) return;
    // First gesture: this click satisfies autoplay policy, so the founding
    // fanfare is audible. A celebration kicks off the journey.
    sfx.play('milestone');
    haptic('heavy');
    celebrate({
      kind: 'milestone',
      icon: '🏛️',
      title: trimmedName,
      subtitle: 'Your empire begins. Build something legendary.',
      color: accent,
    });
    const setup: CompanySetup = {
      name: trimmedName,
      industry,
      accent,
      philosophy,
      foundedAt: Date.now(),
    };
    // Capture any co-founder customization the player made during onboarding  - 
    // SETUP rebuilds state (and re-seeds the default co-founder with the chosen
    // accent), so we re-apply the player's edits + accent right after.
    const customized = state.cofounder;
    dispatch({ type: 'SETUP', payload: setup });
    dispatch({
      type: 'CHARACTER_CUSTOMIZE',
      payload: {
        name: customized.name,
        role: customized.role,
        avatar: { ...customized.avatar, accent },
      },
    });
  }

  return (
    // Local accent var so the entire onboarding previews the chosen color live.
    <div
      style={{ ['--accent' as string]: accent }}
      className="max-w-[480px] mx-auto min-h-screen relative px-4 pt-8 pb-28 animate-fade-in"
    >
      {/* Ambient accent glow behind the header */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)',
        }}
      />

      {/* ---------------- Header ---------------- */}
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

      {/* ---------------- 1. Company name ---------------- */}
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

      {/* ---------------- 2. Industry ---------------- */}
      <Section index={2} title="Choose your industry">
        <div className="grid grid-cols-2 gap-2.5">
          {INDUSTRY_LIST.map((cfg) => {
            const isSel = industry === cfg.id;
            return (
              <Card
                key={cfg.id}
                pad="sm"
                active={isSel}
                onClick={() => pickIndustry(cfg.id)}
                className="relative overflow-hidden"
              >
                {/* per-card faint tint of its own brand accent */}
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-[0.10]"
                  style={{
                    background: `radial-gradient(90% 80% at 0% 0%, ${cfg.accent}, transparent 70%)`,
                  }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{cfg.emoji}</span>
                    {isSel && (
                      <span className="ml-auto text-[var(--accent)] text-sm">✓</span>
                    )}
                  </div>
                  <div className="mt-2 font-semibold text-[15px] leading-tight">
                    {cfg.name}
                  </div>
                  <div className="text-[11px] text-muted leading-snug mt-0.5 line-clamp-2">
                    {cfg.tagline}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#0e1420] border border-[#232c3e] px-1.5 py-0.5">
                    <span className="text-[10px]">⚙️</span>
                    <span className="text-[10px] font-medium text-[var(--accent)]">
                      {cfg.mechanicName}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* ---------------- 3. Accent color ---------------- */}
      <Section index={3} title="Pick your signature color">
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
        {/* live preview chip */}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span>Preview:</span>
          <span className="rounded-md px-2 py-1 font-semibold text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border border-[var(--accent)]">
            {trimmedName || selectedIndustry?.name || 'Your Empire'}
          </span>
        </div>
      </Section>

      {/* ---------------- 4. Philosophy ---------------- */}
      <Section index={4} title="Choose a founding philosophy">
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

      {/* ---------------- 5. Meet your co-founder ---------------- */}
      <Section index={5} title="Meet your co-founder">
        <p className="text-[11px] text-muted leading-snug mb-3 -mt-1">
          Your right hand  -  they'll coach you, hype your wins, and run ops while
          you build. Make them yours (or skip  -  we'll seed a great default).
        </p>
        <CofounderCustomizer compact />
      </Section>

      {/* ---------------- Found button (sticky) ---------------- */}
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
// Local helpers
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
