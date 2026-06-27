// ============================================================================
// MultiCharacterScene — dual-portrait dialogue, ensemble gathering,
// coalition of rivals, and celebratory group moments.
//
// Two-character dialogue:
//   Ally left, rival right. Active speaker: full opacity + 102% scale.
//   Listener: 85% opacity + 98% scale. 180ms cross-fade on role switch.
//
// Ensemble gathering (3+):
//   Staggered entry 200ms apart from left. Overlapping stack, all faces
//   readable. Heart emotes cascade upward in sequence.
//
// Coalition of rivals:
//   Same stagger from right. Screen dims fractionally with each arrival.
//   Confrontation framing between the two groups when all are present.
//
// Celebratory:
//   Full width lower-third. Co-founder + companions. Aurora sweep behind.
//   Music-note + starburst emotes cascade upward, screen palette warms.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import CharacterPortrait from './CharacterPortrait';
import type { AvatarConfig } from '../../game/types';

export type MultiCharSceneKind =
  | 'dialogue'      // two characters speaking to each other
  | 'ensemble'      // 3+ allies gathering (from left)
  | 'coalition'     // 3+ rivals assembling (from right)
  | 'celebration';  // group celebration full lower-third

export interface SceneCharacter {
  avatar:  AvatarConfig;
  name:    string;
  role?:   string;
  side:    'left' | 'right';
  emotes?: string[];    // emoji strings to cascade; used in ensemble/celebration
}

export interface MultiCharSceneProps {
  kind:        MultiCharSceneKind;
  characters:  SceneCharacter[];
  /** Index of the currently speaking character (for dialogue kind). */
  speakerIdx?: number;
  /** Show the aurora sweep behind group moments. */
  showAurora?: boolean;
  accent:      string;
  className?:  string;
  onComplete?: () => void;
}

// ---- Small avatar chip for stacked groups -----------------------------------
function AvatarChip({
  char,
  active,
  stagger,
  fromRight,
}: {
  char: SceneCharacter;
  active: boolean;
  stagger: number;
  fromRight: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), stagger);
    return () => clearTimeout(t);
  }, [stagger]);

  const accent = char.avatar.accent || '#6366f1';

  return (
    <div
      className={[
        'relative transition-all duration-[180ms] ease-out flex flex-col items-center',
        visible
          ? fromRight ? 'char-enter-right' : 'char-enter-left'
          : 'opacity-0',
      ].join(' ')}
      style={{
        opacity:   active ? 1 : 0.82,
        transform: active ? 'scale(1.04)' : 'scale(0.97)',
      }}
    >
      {/* Glow behind active speaker */}
      {active && (
        <div
          className="absolute -inset-2 rounded-full blur-lg opacity-35"
          style={{ background: `radial-gradient(closest-side, ${accent}, transparent)` }}
          aria-hidden
        />
      )}
      <CharacterPortrait avatar={char.avatar} size={72} ring className="relative z-10" />
      <div className="mt-1 text-center z-10">
        <div
          className="text-[9px] font-bold leading-tight"
          style={{ color: active ? accent : 'rgba(231,236,245,0.6)' }}
        >
          {char.name}
        </div>
        {char.role && (
          <div className="text-[8px] text-muted opacity-60">{char.role}</div>
        )}
      </div>
    </div>
  );
}

// ---- Emote cascade for ensemble / celebration moments -----------------------
function EmoteCascade({
  emotes,
  stagger,
  x,
}: {
  emotes: string[];
  stagger: number;
  x: number;
}) {
  return (
    <>
      {emotes.map((e, i) => (
        <div
          key={i}
          className="pointer-events-none absolute emote-pop text-xl leading-none z-30"
          style={{
            left:           x,
            bottom:         '110%',
            animationDelay: `${stagger + i * 280}ms`,
          }}
        >
          {e}
        </div>
      ))}
    </>
  );
}

// ---- Aurora sweep overlay ---------------------------------------------------
function AuroraSweep({ accent }: { accent: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      aria-hidden
    >
      <div
        className="aurora-sweep absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(105deg, transparent 0%, ${accent} 40%, ${accent}80 60%, transparent 100%)`,
        }}
      />
    </div>
  );
}

// ---- Confrontation framing (vertical line between two groups) ---------------
function ConfrontationFrame({ accent }: { accent: string }) {
  return (
    <div
      className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
      aria-hidden
    >
      <div className="w-px flex-1" style={{ background: `linear-gradient(to bottom, transparent, ${accent}60, transparent)` }}/>
      <div className="text-[10px] font-bold px-2 py-0.5 glass rounded-full" style={{ color: accent }}>
        VS
      </div>
      <div className="w-px flex-1" style={{ background: `linear-gradient(to top, transparent, ${accent}60, transparent)` }}/>
    </div>
  );
}

// ---- Main component ---------------------------------------------------------

export default function MultiCharacterScene({
  kind,
  characters,
  speakerIdx = 0,
  showAurora = false,
  accent,
  className = '',
  onComplete,
}: MultiCharSceneProps) {
  const [coalitionDim, setCoalitionDim] = useState(0);
  const dimTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leftChars  = characters.filter(c => c.side === 'left');
  const rightChars = characters.filter(c => c.side === 'right');

  // Coalition darkens screen as each rival arrives
  useEffect(() => {
    if (kind !== 'coalition') return;
    rightChars.forEach((_, i) => {
      dimTimeout.current = setTimeout(() => {
        setCoalitionDim(d => Math.min(0.35, d + 0.08));
      }, 200 + i * 220);
    });
    return () => {
      if (dimTimeout.current) clearTimeout(dimTimeout.current);
    };
  }, [kind, rightChars.length]);

  // Celebration celebration emotes
  const celebrationEmotes = ['✦', '🎵', '⭐', '✦', '🎶', '💫'];

  return (
    <div className={`relative w-full flex items-end justify-between gap-2 px-3 pb-4 ${className}`}>
      {/* Coalition dim overlay */}
      {kind === 'coalition' && coalitionDim > 0 && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-700 z-10"
          style={{ background: `rgba(0,0,0,${coalitionDim})` }}
          aria-hidden
        />
      )}

      {/* Aurora for celebratory moments */}
      {(kind === 'celebration' || showAurora) && <AuroraSweep accent={accent} />}

      {/* Confrontation frame when both groups are present */}
      {kind === 'coalition' && leftChars.length > 0 && rightChars.length > 0 && (
        <ConfrontationFrame accent={accent} />
      )}

      {/* Left group */}
      {(leftChars.length > 0 || kind === 'celebration') && (
        <div
          className={[
            'relative flex gap-1 z-20',
            kind === 'celebration' ? 'flex-row items-end' : 'flex-row items-end',
          ].join(' ')}
        >
          {(kind === 'celebration' ? characters : leftChars).map((char, i) => (
            <div key={i} className="relative">
              <AvatarChip
                char={char}
                active={kind === 'dialogue' ? speakerIdx === i : kind === 'celebration'}
                stagger={i * 200}
                fromRight={false}
              />
              {/* Emote cascade on celebration */}
              {(kind === 'celebration' || kind === 'ensemble') && char.emotes && (
                <EmoteCascade
                  emotes={char.emotes}
                  stagger={400 + i * 260}
                  x={-8}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Right group */}
      {rightChars.length > 0 && kind !== 'celebration' && (
        <div className="relative flex flex-row-reverse gap-1 items-end z-20">
          {rightChars.map((char, i) => (
            <div key={i} className="relative">
              <AvatarChip
                char={char}
                active={kind === 'dialogue' ? speakerIdx === leftChars.length + i : false}
                stagger={i * 200}
                fromRight
              />
              {kind === 'coalition' && char.emotes && (
                <EmoteCascade
                  emotes={char.emotes}
                  stagger={300 + i * 250}
                  x={-8}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Celebration cascade emotes above the whole group */}
      {kind === 'celebration' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-30" aria-hidden>
          {celebrationEmotes.map((e, i) => (
            <div
              key={i}
              className="absolute emote-pop text-2xl leading-none"
              style={{
                left:           `${12 + i * 16}%`,
                bottom:         '80%',
                animationDelay: `${200 + i * 200}ms`,
              }}
            >
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
