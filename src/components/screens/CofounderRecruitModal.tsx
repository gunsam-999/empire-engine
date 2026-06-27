// ============================================================================
// CofounderRecruitModal — in-game co-founder recruitment.
//
// Shown once after the player's empire gains early traction. Presents 4 NPC
// co-founder candidates with fixed identities, lore, and unique bonuses.
// Player picks one → RECRUIT_COFOUNDER dispatched → modal never shows again.
// ============================================================================

import { useState } from 'react';
import { useGame } from '../../game/GameContext';
import { NPC_COFOUNDERS, type NpcCofounder } from '../../data/characters';
import CharacterPortrait from '../shared/CharacterPortrait';
import { sfx } from '../../systems/AudioEngine';
import { haptic } from '../../utils/haptics';
import { celebrate } from '../shared/CelebrationHost';

interface CofounderRecruitModalProps {
  onClose: () => void;
}

function CandidateCard({
  npc,
  selected,
  accent,
  onPick,
}: {
  npc: NpcCofounder;
  selected: boolean;
  accent: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full text-left rounded-2xl p-3.5 transition-all relative overflow-hidden active:scale-[0.98]"
      style={{
        border: selected
          ? `1px solid ${npc.avatar.accent}`
          : '1px solid rgba(255,255,255,0.07)',
        background: selected
          ? `color-mix(in srgb, ${npc.avatar.accent} 10%, #090d16)`
          : '#090d16',
        boxShadow: selected
          ? `0 0 28px -8px color-mix(in srgb, ${npc.avatar.accent} 45%, transparent)`
          : 'none',
      }}
    >
      {selected && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, ${npc.avatar.accent} 12%, transparent), transparent 70%)`,
          }}
        />
      )}
      <div className="relative flex items-start gap-3">
        <div className="shrink-0">
          <CharacterPortrait
            avatar={{ ...npc.avatar, accent: npc.avatar.accent }}
            size={56}
            ring={selected}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div>
              <div
                className="text-[14px] font-bold leading-tight"
                style={{ color: selected ? npc.avatar.accent : '#e7ecf5' }}
              >
                {npc.name}
              </div>
              <div className="text-[10px] text-muted mt-0.5">{npc.role}</div>
            </div>
            {selected && (
              <div
                className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                style={{ background: npc.avatar.accent }}
              >
                <span className="text-[9px] text-[#050810] font-bold">✓</span>
              </div>
            )}
          </div>

          <p className="mt-1.5 text-[11px] italic leading-snug text-[#9aa8be]">
            "{npc.tagline}"
          </p>

          <div
            className="mt-2 rounded-xl px-2.5 py-1.5 text-[10px] leading-snug"
            style={{
              background: selected
                ? `color-mix(in srgb, ${npc.avatar.accent} 12%, transparent)`
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selected ? `color-mix(in srgb, ${npc.avatar.accent} 25%, transparent)` : 'rgba(255,255,255,0.05)'}`,
              color: selected ? `color-mix(in srgb, ${npc.avatar.accent} 85%, #cde)` : '#606a7c',
            }}
          >
            <span className="font-semibold">{npc.bonusLabel}: </span>{npc.bonusDesc}
          </div>
        </div>
      </div>

      {/* Backstory — only when selected */}
      {selected && (
        <p className="mt-3 text-[10.5px] leading-relaxed text-[#8a98b0] border-l-2 pl-2.5 animate-slide-up"
           style={{ borderColor: `color-mix(in srgb, ${npc.avatar.accent} 50%, transparent)` }}>
          {npc.backstory}
        </p>
      )}
    </button>
  );
}

export default function CofounderRecruitModal({ onClose }: CofounderRecruitModalProps) {
  const { state, dispatch } = useGame();
  const accent = state.setup?.accent ?? '#6366f1';
  const [chosen, setChosen] = useState<string | null>(null);

  function recruit() {
    if (!chosen) return;
    const npc = NPC_COFOUNDERS.find(n => n.id === chosen);
    if (!npc) return;
    sfx.play('milestone');
    haptic('heavy');
    dispatch({ type: 'RECRUIT_COFOUNDER', presetId: chosen });
    celebrate({
      kind: 'milestone',
      icon: '🤝',
      title: `${npc.name} joins the empire`,
      subtitle: `${npc.role} — ${npc.bonusLabel} unlocked.`,
      color: npc.avatar.accent,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center max-w-[480px] mx-auto">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-[#030507]/85 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full rounded-t-3xl bg-[#070b12] border border-[#232c3e] border-b-0 max-h-[92vh] overflow-y-auto no-scrollbar animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#333d52]" />
        </div>

        <div className="px-4 pb-4">
          {/* Header */}
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted mb-1">
              Your empire is ready
            </div>
            <h2 className="text-xl font-bold text-[#e7ecf5]">Recruit a Co-Founder</h2>
            <p className="mt-1 text-[12px] text-[#8a94a8] leading-snug">
              You've built enough to know what you need. Choose the partner who fills the gap — their bonus is permanent.
            </p>
          </div>

          {/* Candidates */}
          <div className="flex flex-col gap-2.5">
            {NPC_COFOUNDERS.map(npc => (
              <CandidateCard
                key={npc.id}
                npc={npc}
                selected={chosen === npc.id}
                accent={accent}
                onPick={() => setChosen(npc.id)}
              />
            ))}
          </div>

          {/* Confirm */}
          <div className="mt-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <button
              type="button"
              disabled={!chosen}
              onClick={recruit}
              className="w-full rounded-xl py-3.5 font-bold text-[15px] transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: chosen
                  ? `linear-gradient(180deg, color-mix(in srgb, ${accent} 92%, white 8%), ${accent})`
                  : '#1b2334',
                color: chosen ? '#070b12' : '#8a94a8',
                boxShadow: chosen
                  ? `0 8px 30px -8px color-mix(in srgb, ${accent} 60%, transparent)`
                  : 'none',
              }}
            >
              {chosen
                ? `🤝 Bring ${NPC_COFOUNDERS.find(n => n.id === chosen)?.name} aboard`
                : 'Select a co-founder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-2 text-sm text-muted text-center"
            >
              Decide later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
