// ============================================================================
// StoryBeatPresenter — routes a StoryBeat to the correct character presentation.
//
// dramatic: true  → full CinematicCutscene (location-based SVG bg, camera motion)
// dramatic: false → floating CharacterPresence overlay (lower-third, world stays visible)
//
// Speaker → avatar mapping gives every cast member a fixed procedural face so
// they are recognisable across all beats without requiring external assets.
// ============================================================================

import type { AvatarConfig } from '../../game/types';
import type { Speaker, StoryBeat } from '../../game/types';
import { useGame } from '../../game/GameContext';
import CharacterPresence, { type CharacterPresenceConfig } from './CharacterPresence';
import CinematicCutscene, { type SceneLocation } from './CinematicCutscene';

// ---- Fixed avatar configs per speaker ----------------------------------------
interface SpeakerMeta {
  avatar: AvatarConfig;
  name: string;
  role: string;
  side: 'left' | 'right';
  location: SceneLocation;
}

const SPEAKER_META: Record<Speaker, SpeakerMeta> = {
  mentor: {
    avatar: { skin: 7, hair: 0, hairColor: 6, outfit: 8, accessory: 1, expression: 2, accent: '#fbbf24' },
    name: 'Dossier',
    role: 'The Old Master',
    side: 'left',
    location: 'cabin',
  },
  rival: {
    avatar: { skin: 2, hair: 2, hairColor: 0, outfit: 4, accessory: 5, expression: 1, accent: '#f87171' },
    name: 'Cassara Voss',
    role: 'Rival CEO',
    side: 'right',
    location: 'versus',
  },
  partner: {
    avatar: { skin: 1, hair: 3, hairColor: 2, outfit: 0, accessory: 0, expression: 0, accent: '#34d399' },
    name: 'Theo',
    role: 'Co-Founder',
    side: 'left',
    location: 'hq',
  },
  consortium: {
    avatar: { skin: 6, hair: 0, hairColor: 0, outfit: 8, accessory: 2, expression: 2, accent: '#a78bfa' },
    name: 'The Quorum',
    role: 'Consortium',
    side: 'right',
    location: 'rival_domain',
  },
  narrator: {
    avatar: { skin: 3, hair: 1, hairColor: 5, outfit: 7, accessory: 0, expression: 4, accent: '#8a94a8' },
    name: 'Narrator',
    role: 'The World',
    side: 'left',
    location: 'open_world',
  },
  player: {
    avatar: { skin: 0, hair: 2, hairColor: 3, outfit: 2, accessory: 0, expression: 1, accent: '#6366f1' },
    name: 'You',
    role: 'Founder',
    side: 'left',
    location: 'open_world',
  },
};

// ---- Camera / transition picks per speaker -----------------------------------
function cameraFor(speaker: Speaker): 'push' | 'pull' | 'pan' | 'hold' {
  if (speaker === 'rival' || speaker === 'consortium') return 'hold';
  if (speaker === 'narrator') return 'pan';
  return 'push';
}

function transitionFor(speaker: Speaker): 'iris' | 'wipe' | 'fade' {
  if (speaker === 'rival') return 'iris';
  if (speaker === 'consortium') return 'wipe';
  return 'fade';
}

// ---- Main component ----------------------------------------------------------

export interface StoryBeatPresenterProps {
  beat: StoryBeat;
  onClose: () => void;
}

export default function StoryBeatPresenter({ beat, onClose }: StoryBeatPresenterProps) {
  const { dispatch } = useGame();
  const meta = SPEAKER_META[beat.speaker] ?? SPEAKER_META.narrator;

  function handleComplete() {
    dispatch({ type: 'STORY_SEEN', id: beat.id });
    onClose();
  }

  function handleChoice(choiceId: string) {
    dispatch({ type: 'STORY_CHOICE', beatId: beat.id, optionIndex: Number(choiceId) });
    onClose();
  }

  const choices = beat.choice?.options.map((opt, i) => ({
    id: String(i),
    text: opt.text,
  }));

  const characterConfig: CharacterPresenceConfig = {
    avatar: meta.avatar,
    name: meta.name,
    role: meta.role,
    side: meta.side,
    lines: beat.lines,
    choices,
    onComplete: handleComplete,
    onChoice: handleChoice,
  };

  // ---- Dramatic beats: full cinematic cutscene --------------------------------
  if (beat.dramatic) {
    return (
      <CinematicCutscene
        location={meta.location}
        camera={cameraFor(beat.speaker)}
        transition={transitionFor(beat.speaker)}
        character={characterConfig}
        accent={meta.avatar.accent ?? '#6366f1'}
        onComplete={handleComplete}
        skippable
      />
    );
  }

  // ---- Non-dramatic: lower-third overlay, world visible behind ----------------
  // pointer-events-none on outer so the upper part of the game is still clickable;
  // pointer-events-auto on the character region.
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col pointer-events-none"
      aria-label="story dialogue"
    >
      {/* Gradient scrim rising from the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-72 pointer-events-none"
           style={{ background: 'linear-gradient(to top, rgba(7,11,18,0.92) 0%, rgba(7,11,18,0.5) 60%, transparent 100%)' }} />
      {/* Character in lower third */}
      <div className="mt-auto pointer-events-auto max-w-[480px] mx-auto w-full px-3 pb-28">
        <CharacterPresence {...characterConfig} />
      </div>
    </div>
  );
}
