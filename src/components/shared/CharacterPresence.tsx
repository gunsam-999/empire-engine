// ============================================================================
// CharacterPresence — Cinematic character avatar system.
//
// Characters are presences that enter the player's world, occupy space within
// it, and exit with intention. This component governs the entire lifecycle:
//
//   • Entry from designated side (left=ally, right=rival) — iron convention
//   • Breathing idle animation — alive from the first frame
//   • Dialogue box attached to the character (not floating independently)
//   • Text reveal at natural reading pace with optional cursor
//   • Emote bubbles above the portrait on emotional beats
//   • Expression swap — face responds before numbers follow
//   • Choice cards as clean glass surfaces below the dialogue box
//
// The world keeps running behind the character. The avatar floats above the
// living world as a character genuinely standing in the player's empire.
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import CharacterPortrait from './CharacterPortrait';
import type { AvatarConfig } from '../../game/types';

// ---- Types ------------------------------------------------------------------

export type CharacterSide = 'left' | 'right';

export interface EmoteKind {
  kind: 'anger' | 'heart' | 'sweat' | 'ellipsis' | 'star' | 'money' | 'question';
  delay?: number;
}

export interface DialogueChoice {
  id: string;
  text: string;
}

export interface CharacterPresenceConfig {
  /** Avatar visual config. */
  avatar: AvatarConfig;
  /** Name shown above dialogue. */
  name: string;
  /** Subtitle / role. */
  role?: string;
  /** left = ally/companion (warm entry). right = rival/threat (sharp entry). */
  side: CharacterSide;
  /** Dialogue lines. Progress through them on tap. */
  lines: string[];
  /** Emote to show on the beat of a specific line index. */
  emotes?: Record<number, EmoteKind>;
  /** Choices offered after the last line (optional). */
  choices?: DialogueChoice[];
  /** Characters per second for text reveal. Default 40. */
  revealRate?: number;
  /** Called when all lines complete and no choices remain. */
  onComplete?: () => void;
  /** Called when a choice is selected. */
  onChoice?: (choiceId: string) => void;
}

// Stable empty object for the emotes default — avoids a new {} reference each
// render which would cause useTextReveal's effect to reset on every tick.
const EMPTY_EMOTES: Record<number, EmoteKind> = {};

// ---- Emote bubble glyphs & colors -------------------------------------------
const EMOTE_GLYPH: Record<EmoteKind['kind'], string> = {
  anger:    '💢',
  heart:    '💛',
  sweat:    '💦',
  ellipsis: '…',
  star:     '✦',
  money:    '💰',
  question: '？',
};

// ---- Text reveal hook -------------------------------------------------------
function useTextReveal(
  text: string,
  revealRate: number,
  onComplete?: () => void
): { displayed: string; isDone: boolean; skip: () => void } {
  const [displayed, setDisplayed] = useState('');
  const [isDone, setIsDone]       = useState(false);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef                  = useRef(0);
  // Keep a ref to onComplete so changing it never restarts the reveal interval.
  const onCompleteRef             = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayed(text);
    setIsDone(true);
    onCompleteRef.current?.();
  }, [text]);

  useEffect(() => {
    setDisplayed('');
    setIsDone(false);
    indexRef.current = 0;

    if (!text) return;

    const msPerChar = 1000 / revealRate;
    intervalRef.current = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsDone(true);
        onCompleteRef.current?.();
      }
    }, msPerChar);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, revealRate]); // onComplete intentionally excluded — tracked via ref

  return { displayed, isDone, skip };
}

// ---- Emote bubble -----------------------------------------------------------
function EmoteBubble({ kind, visible }: { kind: EmoteKind; visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      key={`${kind.kind}-${Date.now()}`}
      className="emote-pop pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-20"
      style={{ animationDelay: `${kind.delay ?? 0}ms` }}
    >
      <div className="glass rounded-2xl px-2.5 py-1.5 text-2xl leading-none shadow-glow-sm">
        {EMOTE_GLYPH[kind.kind]}
      </div>
    </div>
  );
}

// ---- Portrait body silhouette -----------------------------------------------
// Tall portrait: large enough to be a real presence, not just a head.
// Body SVG matches portrait width (96px) and overlaps by -mt-8 so shoulders
// connect seamlessly to the bottom of the portrait circle.
function PortraitBody({ avatar, side, accent }: {
  avatar: AvatarConfig; side: CharacterSide; accent: string;
}) {
  const bodyColor = side === 'right' ? '#1a1022' : '#0e1420';
  // Unique per accent so multiple characters in the same scene don't share defs.
  const gradId = `bg-${accent.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div className="relative flex flex-col items-center">
      {/* Glow ring behind portrait */}
      <div
        className="absolute -inset-3 rounded-full blur-xl opacity-40"
        style={{ background: `radial-gradient(closest-side, ${accent}, transparent)` }}
        aria-hidden
      />
      {/* Portrait head */}
      <CharacterPortrait avatar={avatar} size={96} ring className="relative z-10" />
      {/* Body — same width as portrait, overlaps bottom 32px to close the gap */}
      <svg width={96} height={80} viewBox="0 0 96 80" className="relative z-10 -mt-8" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={accent} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0.04"/>
          </linearGradient>
        </defs>
        {/* Shoulder arch — starts at y=0 so it meets the portrait bottom */}
        <path d="M10 16 Q10 0 48 0 Q86 0 86 16 L84 80 L12 80 Z" fill={bodyColor}/>
        <path d="M10 16 Q10 0 48 0 Q86 0 86 16 L84 80 L12 80 Z" fill={`url(#${gradId})`}/>
        {/* Collar / lapel hint */}
        <path d="M38 6 L48 22 L58 6 L53 4 L48 8 L43 4 Z" fill={accent} opacity="0.3"/>
        {/* Lapels */}
        <path d="M20 10 L48 22 L30 16 Z" fill={accent} opacity="0.1"/>
        <path d="M76 10 L48 22 L66 16 Z" fill={accent} opacity="0.1"/>
      </svg>
    </div>
  );
}

// ---- Main component ---------------------------------------------------------

export default function CharacterPresence({
  avatar,
  name,
  role,
  side,
  lines,
  emotes = EMPTY_EMOTES,
  choices,
  revealRate = 40,
  onComplete,
  onChoice,
}: CharacterPresenceConfig) {
  const [lineIndex,  setLineIndex]  = useState(0);
  const [phase,      setPhase]      = useState<'entering' | 'idle' | 'exiting'>('entering');
  const [emoteVisible, setEmoteVisible] = useState(false);
  const [choicePhase, setChoicePhase]   = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const prevEmoteRef = useRef<EmoteKind | null>(null);

  const accent = avatar.accent || '#6366f1';

  const currentLine = lines[lineIndex] ?? '';
  const isLastLine  = lineIndex >= lines.length - 1;

  const handleLineComplete = useCallback(() => {
    const emote = emotes[lineIndex];
    if (emote) {
      setEmoteVisible(true);
      setTimeout(() => setEmoteVisible(false), 1400);
    }
  }, [lineIndex, emotes]);

  const { displayed, isDone, skip } = useTextReveal(currentLine, revealRate, handleLineComplete);

  // Enter → idle transition
  useEffect(() => {
    const t = setTimeout(() => setPhase('idle'), 600);
    return () => clearTimeout(t);
  }, []);

  const handleTap = useCallback(() => {
    if (!isDone) {
      skip();
      return;
    }
    if (isLastLine) {
      if (choices && choices.length > 0) {
        setChoicePhase(true);
      } else {
        setPhase('exiting');
        setTimeout(() => onComplete?.(), 320);
      }
      return;
    }
    setLineIndex(i => i + 1);
  }, [isDone, isLastLine, choices, skip, onComplete]);

  const handleChoice = useCallback((id: string) => {
    setSelectedChoice(id);
    // Expression swap: face reacts first
    setTimeout(() => {
      onChoice?.(id);
      setPhase('exiting');
      setTimeout(() => onComplete?.(), 320);
    }, 350);
  }, [onChoice, onComplete]);

  const isLeft  = side === 'left';
  const enterClass = phase === 'entering'
    ? (isLeft ? 'char-enter-left' : 'char-enter-right')
    : phase === 'exiting'
    ? (isLeft ? 'char-exit-left' : 'char-exit-right')
    : '';

  const dialogueSide = isLeft ? 'left-full ml-3' : 'right-full mr-3';

  const emote = emotes[lineIndex];

  return (
    <div
      className={[
        'pointer-events-auto',
        'flex items-end gap-0',
        isLeft ? 'flex-row' : 'flex-row-reverse',
        enterClass,
      ].join(' ')}
      onClick={choicePhase ? undefined : handleTap}
      style={{ cursor: choicePhase ? 'default' : 'pointer' }}
    >
      {/* Portrait column */}
      <div className={`relative shrink-0 char-breathe ${selectedChoice ? 'expr-swap' : ''}`}>
        <EmoteBubble kind={emote ?? { kind: 'heart' }} visible={!!(emote && emoteVisible)} />
        <PortraitBody avatar={avatar} side={side} accent={accent} />
      </div>

      {/* Dialogue box — positioned beside the portrait */}
      <div
        className={[
          'relative dialogue-reveal',
          'w-52 max-w-[200px]',
          'glass rounded-2xl p-3',
          isLeft ? 'rounded-tl-sm' : 'rounded-tr-sm',
        ].join(' ')}
        style={{
          // Edge-highlight stronger on speaker side
          boxShadow: isLeft
            ? 'inset 0 1px 0 rgba(255,255,255,0.14), inset 1px 0 0 rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.5)'
            : 'inset 0 1px 0 rgba(255,255,255,0.14), inset -1px 0 0 rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Name + role header */}
        <div className="mb-1.5 flex items-baseline gap-1.5">
          <span className="text-xs font-bold leading-tight" style={{ color: accent }}>
            {name}
          </span>
          {role && (
            <span className="text-[9px] text-muted leading-tight opacity-70">{role}</span>
          )}
        </div>

        {/* Line progress dots */}
        {lines.length > 1 && (
          <div className="mb-2 flex gap-1">
            {lines.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === lineIndex ? '12px' : '4px',
                  background: i <= lineIndex ? accent : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        )}

        {/* Text reveal */}
        <p className="text-[11px] leading-relaxed text-ink min-h-[3em]">
          {displayed}
          {!isDone && (
            <span className="cursor-blink ml-0.5 opacity-70" style={{ color: accent }}>
              |
            </span>
          )}
        </p>

        {/* Tap-to-continue hint */}
        {isDone && !choicePhase && (
          <div className="mt-2 flex justify-end">
            <span
              className="text-[9px] text-muted animate-pulse-accent rounded px-1.5 py-0.5"
              style={{ color: accent, opacity: 0.7 }}
            >
              {isLastLine && !choices ? 'close' : 'tap ▶'}
            </span>
          </div>
        )}

        {/* Choice cards */}
        {choicePhase && choices && choices.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {choices.map(c => (
              <button
                key={c.id}
                onClick={() => handleChoice(c.id)}
                className={[
                  'w-full rounded-xl px-3 py-2 text-left text-[10px] leading-snug',
                  'transition-all duration-150 active:scale-[0.97]',
                  selectedChoice === c.id
                    ? 'glass-active font-semibold'
                    : 'glass hover:brightness-110',
                ].join(' ')}
                style={selectedChoice === c.id ? { color: accent } : {}}
              >
                {c.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
