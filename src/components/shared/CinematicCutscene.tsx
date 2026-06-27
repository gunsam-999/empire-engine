// ============================================================================
// CinematicCutscene — cinematic sequences for critical story arc events.
// Distinct from gameplay: different camera grammar, specific locations,
// character staging, transition types.
//
// Six scene locations:
//   'cabin'       — founder's personal office (intimate, revelatory)
//   'hq'          — HQ floor (team moments, coalition rallying)
//   'rival_domain'— rival's domain (cold boardroom, power imbalance)
//   'street'      — candid street level (encounters outside the business world)
//   'open_world'  — empire at scale (scale-journey milestone moments)
//   'versus'      — adversarial confrontation stage (duel frame, two sides)
//
// Four camera behaviors (applied to the scene via CSS):
//   'push'        — slow push-in (revelatory; camera moves toward speaker)
//   'pull'        — slow pull-back (defeat, loss, departure)
//   'pan'         — slow left-to-right pan (ensemble moments)
//   'hold'        — fully static (heaviest moments — a rare and powerful choice)
//
// Three transition types:
//   'iris'        — iris-in from center point
//   'wipe'        — horizontal wipe left-to-right
//   'fade'        — simple fade from black
// ============================================================================

import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { AvatarConfig } from '../../game/types';
import CharacterPresence, { type CharacterPresenceConfig } from './CharacterPresence';
import MultiCharacterScene, { type SceneCharacter } from './MultiCharacterScene';

// ---- Types ------------------------------------------------------------------

export type SceneLocation =
  | 'cabin'
  | 'hq'
  | 'rival_domain'
  | 'street'
  | 'open_world'
  | 'versus';

export type CameraMode = 'push' | 'pull' | 'pan' | 'hold';
export type TransitionType = 'iris' | 'wipe' | 'fade';

export interface CinematicCutsceneProps {
  location:       SceneLocation;
  camera?:        CameraMode;
  transition?:    TransitionType;
  /** Single-character dialogue. Takes precedence over multiChar. */
  character?:     CharacterPresenceConfig;
  /** Multi-character scene. */
  multiChar?: {
    kind:        'dialogue' | 'ensemble' | 'coalition' | 'celebration';
    characters:  SceneCharacter[];
    speakerIdx?: number;
  };
  accent:         string;
  /** Called when the scene fully completes. */
  onComplete?:    () => void;
  /** Player may skip after 2 seconds. */
  skippable?:     boolean;
}

// ---- Scene location backgrounds ---------------------------------------------
// Each is an SVG/div composition. The accent bleeds into every location.

function CabinScene({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 380 300" width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="cabin-lamp" cx="35%" cy="65%" r="45%">
            <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="cabin-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#06080e"/>
            <stop offset="100%" stopColor="#030507"/>
          </linearGradient>
          <linearGradient id="cabin-window" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={accent} stopOpacity="0.08"/>
            <stop offset="100%" stopColor="#060a14" stopOpacity="0.9"/>
          </linearGradient>
          <radialGradient id="cabin-vignette" cx="35%" cy="60%" r="55%">
            <stop offset="0%"   stopColor="#000000" stopOpacity="0"/>
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="380" height="300" fill="url(#cabin-bg)"/>
        {/* Room walls */}
        <rect x="0" y="20" width="380" height="280" fill="#090d18"/>
        {/* Wood floor */}
        <rect x="0" y="210" width="380" height="90" fill="#0d0a07"/>
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x={0} y={212+i*10} width={380} height={1} fill="#1a1209" opacity={0.8}/>
        ))}
        {/* Desk */}
        <rect x="40" y="195" width="180" height="18" rx="2" fill="#1a1008"/>
        <rect x="45" y="213" width="8" height="40" rx="1" fill="#130d06"/>
        <rect x="207" y="213" width="8" height="40" rx="1" fill="#130d06"/>
        {/* Lamp on desk */}
        <rect x="68" y="165" width="3" height="34" fill="#2a2010"/>
        <path d="M58 165 L84 165 L78 158 L64 158 Z" fill="#3a3018"/>
        <circle cx="71" cy="165" r="8" fill="url(#cabin-lamp)"/>
        {/* Stack of papers */}
        {[0,1,2].map(i => <rect key={i} x={110+i*2} y={192-i*1.5} width={55} height={4} rx={0.5} fill="#e7ecf5" opacity={0.06+i*0.02}/>)}
        {/* Window top-right — empire visible behind it */}
        <rect x="230" y="30" width="130" height="110" rx="2" fill="#030810"/>
        <rect x="230" y="30" width="130" height="110" rx="2" fill="url(#cabin-window)"/>
        {/* Window frame */}
        <rect x="230" y="30" width="130" height="2" fill="#1a2030" opacity="0.6"/>
        <rect x="230" y="138" width="130" height="2" fill="#1a2030" opacity="0.6"/>
        <rect x="230" y="30" width="2" height="110" fill="#1a2030" opacity="0.6"/>
        <rect x="358" y="30" width="2" height="110" fill="#1a2030" opacity="0.6"/>
        {/* Cross bar */}
        <rect x="230" y="82" width="130" height="2" fill="#1a2030" opacity="0.5"/>
        <rect x="293" y="30" width="2" height="110" fill="#1a2030" opacity="0.5"/>
        {/* Distant empire glow through window */}
        <rect x="232" y="32" width="126" height="106" fill={accent} opacity="0.04"/>
        {/* City dots through window */}
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <rect key={i} x={234+(i*15)%120} y={58+(i*19)%50} width={2+hs(i)*4} height={20+hs(i+5)*30} rx="0.5" fill={accent} opacity="0.08"/>
        ))}
        {/* Bookshelf */}
        <rect x="0" y="40" width="30" height="170" fill="#0c0904"/>
        {[0,1,2,3,4,5,6].map(i => (
          <rect key={i} x={3} y={46+i*22} width={24} height={18} rx={0.5} fill={['#1a0a08','#081a0a','#08081a','#1a1208','#0a081a','#1a0a14','#081418'][i]} opacity={0.8}/>
        ))}
        {/* Warm lamp glow on floor */}
        <ellipse cx="73" cy="240" rx="60" ry="24" fill="url(#cabin-lamp)" opacity="0.6"/>
        {/* Ambient darkness vignette */}
        <rect x="0" y="0" width="380" height="300" fill="url(#cabin-vignette)"/>
      </svg>
    </div>
  );
}

function HQScene({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 380 300" width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hq-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#080d18"/>
            <stop offset="100%" stopColor="#05080f"/>
          </linearGradient>
          <linearGradient id="hq-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0c1220"/>
            <stop offset="100%" stopColor="#070b14"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="380" height="300" fill="url(#hq-bg)"/>
        {/* Floor */}
        <rect x="0" y="220" width="380" height="80" fill="#06090e"/>
        {[0,1,2,3].map(i => <rect key={i} x={0} y={225+i*18} width={380} height={1} fill={accent} opacity={0.04}/>)}
        {/* Far wall with windows */}
        <rect x="0" y="0" width="380" height="160" fill="url(#hq-wall)"/>
        {/* Accent stripe on wall */}
        <rect x="0" y="60" width="380" height="2" fill={accent} opacity="0.12"/>
        {/* Window panels */}
        {[0,1,2,3,4].map(i => (
          <g key={i}>
            <rect x={8+i*74} y={10} width={66} height={48} rx="1" fill={accent} opacity="0.04"/>
            <rect x={8+i*74} y={10} width={66} height={2} fill={accent} opacity="0.1"/>
            <rect x={8+i*74} y={10} width={2} height={48} fill={accent} opacity="0.07"/>
          </g>
        ))}
        {/* Team wall mural (abstract) */}
        <rect x="140" y="72" width="100" height="60" rx="2" fill={accent} opacity="0.06"/>
        <path d={`M155 100 L190 80 L225 95 L225 130 L155 130 Z`} fill={accent} opacity="0.04"/>
        {/* Hanging lights */}
        {[0,1,2,3,4,5,6].map(i => (
          <g key={i}>
            <line x1={20+i*56} y1={0} x2={20+i*56} y2={22} stroke={accent} strokeWidth="0.5" opacity="0.3"/>
            <circle cx={20+i*56} cy={22} r={3} fill={accent} opacity="0.6"/>
            <circle cx={20+i*56} cy={22} r={7} fill={accent} opacity="0.1"/>
          </g>
        ))}
        {/* Reception desk */}
        <rect x="130" y="205" width="120" height="18" rx="2" fill="#0e1828"/>
        <rect x="130" y="200" width="120" height="8" rx="1" fill="#142030"/>
        {/* Ambient glow from ceiling lights */}
        {[0,1,2,3,4,5,6].map(i => (
          <ellipse key={i} cx={20+i*56} cy={40} rx={28} ry={14} fill={accent} opacity="0.04"/>
        ))}
      </svg>
    </div>
  );
}

function RivalDomainScene({ accent }: { accent: string }) {
  const rivalColor = '#c0392b';
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 380 300" width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="rd-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0a0608"/>
            <stop offset="100%" stopColor="#040306"/>
          </linearGradient>
          <radialGradient id="rd-red" cx="80%" cy="40%" r="50%">
            <stop offset="0%"   stopColor={rivalColor} stopOpacity="0.12"/>
            <stop offset="100%" stopColor={rivalColor} stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="rd-blue" cx="20%" cy="40%" r="40%">
            <stop offset="0%"   stopColor={accent} stopOpacity="0.08"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="380" height="300" fill="url(#rd-bg)"/>
        <rect x="0" y="0" width="380" height="300" fill="url(#rd-red)"/>
        <rect x="0" y="0" width="380" height="300" fill="url(#rd-blue)"/>
        {/* Marble floor */}
        <rect x="0" y="215" width="380" height="85" fill="#060406"/>
        {[0,1,2,3].map(i => <rect key={i} x={0} y={218+i*20} width={380} height={1} fill={rivalColor} opacity={0.04}/>)}
        {/* Board room table */}
        <ellipse cx="190" cy="235" rx="140" ry="22" fill="#0c0809"/>
        <rect x="50" y="220" width="280" height="30" rx="4" fill="#0e0a0a"/>
        {/* Leather chairs (silhouettes) */}
        {[0,1,2,3,4].map(i => (
          <rect key={i} x={55+i*57} y={207} width={36} height={16} rx="3" fill="#080506"/>
        ))}
        {/* Imposing back wall: vertical panels */}
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <rect key={i} x={i*38} y={0} width={36} height={200} rx="0" fill="#0a0709" opacity={i%2===0?1:0.8}/>
        ))}
        {/* Red accent stripe on back wall */}
        <rect x="0" y="198" width="380" height="3" fill={rivalColor} opacity="0.25"/>
        {/* Rival logo / crest placeholder */}
        <rect x="160" y="70" width="60" height="80" rx="2" fill={rivalColor} opacity="0.04"/>
        <path d="M175 110 L190 75 L205 110 L195 110 L195 145 L185 145 L185 110 Z" fill={rivalColor} opacity="0.07"/>
        {/* Window slits at top emitting cold light */}
        {[0,1,2].map(i => (
          <rect key={i} x={40+i*120} y={0} width={60} height={25} fill={rivalColor} opacity="0.04"/>
        ))}
        {/* Vignette corners */}
        <rect x="0" y="0" width="380" height="300" fill="url(#rd-red)" opacity="0.3"/>
      </svg>
    </div>
  );
}

function StreetScene({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 380 300" width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0a0d18"/>
            <stop offset="100%" stopColor="#060810"/>
          </linearGradient>
          <radialGradient id="st-lamp" cx="30%" cy="55%" r="30%">
            <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="380" height="300" fill="url(#st-sky)"/>
        {/* Pavement */}
        <rect x="0" y="200" width="380" height="100" fill="#07080c"/>
        {/* Street line */}
        <rect x="0" y="200" width="380" height="2" fill={accent} opacity="0.15"/>
        {/* Building facades left */}
        <rect x="0" y="20" width="100" height="180" fill="#0c1018"/>
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <rect key={i} x={6+(i%3)*30} y={28+(Math.floor(i/3))*38} width={22} height={28} rx="1" fill={accent} opacity="0.07"/>
        ))}
        {/* Building facades right */}
        <rect x="280" y="0" width="100" height="200" fill="#0a0e16"/>
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={286+(i%2)*44} y={10+(Math.floor(i/2))*44} width={36} height={34} rx="1" fill={accent} opacity="0.06"/>
        ))}
        {/* Street lamps */}
        <rect x="60" y="130" width="3" height="72" fill="#1a1a2a"/>
        <rect x="55" y="130" width="13" height="2" rx="1" fill="#1a1a2a"/>
        <circle cx="62" cy="130" r="5" fill="#f59e0b" opacity="0.7"/>
        <circle cx="62" cy="130" r="12" fill="#f59e0b" opacity="0.15"/>
        <rect x="295" y="140" width="3" height="62" fill="#1a1a2a"/>
        <rect x="290" y="140" width="13" height="2" rx="1" fill="#1a1a2a"/>
        <circle cx="297" cy="140" r="5" fill="#f59e0b" opacity="0.6"/>
        <rect x="0" y="0" width="380" height="300" fill="url(#st-lamp)"/>
        {/* Distant city at night */}
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={104+i*28} y={80+hs(i)*60} width={20+hs(i+3)*10} height={hs(i+7)*80+40} rx="0.5" fill="#090d14"/>
        ))}
        {/* Streetlight glow on pavement */}
        <ellipse cx="62" cy="210" rx="40" ry="12" fill="#f59e0b" opacity="0.08"/>
        {/* Rain-wet reflection on pavement */}
        <ellipse cx="62" cy="218" rx="32" ry="6" fill={accent} opacity="0.04"/>
      </svg>
    </div>
  );
}

function OpenWorldScene({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 380 300" width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ow-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#080c1a"/>
            <stop offset="50%"  stopColor={accent} stopOpacity="0.06"/>
            <stop offset="100%" stopColor="#060810"/>
          </linearGradient>
          <radialGradient id="ow-glow" cx="50%" cy="70%" r="60%">
            <stop offset="0%"   stopColor={accent} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="380" height="300" fill="url(#ow-sky)"/>
        {/* Ground */}
        <rect x="0" y="200" width="380" height="100" fill="#06080e"/>
        <rect x="0" y="198" width="380" height="4" fill={accent} opacity="0.2"/>
        {/* Empire city skyline — wide panorama */}
        <path d={`M0,200 L0,168 L14,168 L14,152 L22,152 L22,138 L28,138 L28,128 L34,128 L34,138 L40,138 L40,120 L46,120 L46,108 L50,108 L50,96 L56,96 L56,82 L62,82 L62,70 L68,70 L68,60 L74,60 L74,70 L80,70 L80,84 L86,84 L86,76 L92,76 L92,66 L98,66 L98,54 L104,54 L104,44 L108,44 L108,36 L114,36 L114,44 L118,44 L118,54 L124,54 L124,68 L130,68 L130,56 L136,56 L136,46 L140,46 L140,38 L146,38 L146,30 L152,30 L152,24 L158,24 L158,18 L164,18 L164,24 L168,24 L168,30 L174,30 L174,38 L178,38 L178,46 L184,46 L184,54 L190,54 L190,46 L196,46 L196,38 L202,38 L202,26 L208,26 L208,18 L212,18 L212,10 L218,10 L218,18 L222,18 L222,26 L228,26 L228,38 L234,38 L234,48 L240,48 L240,56 L246,56 L246,66 L252,66 L252,54 L258,54 L258,44 L262,44 L262,36 L268,36 L268,28 L274,28 L274,20 L278,20 L278,28 L282,28 L282,36 L286,36 L286,46 L292,46 L292,58 L298,58 L298,68 L304,68 L304,80 L310,80 L310,90 L316,90 L316,100 L322,100 L322,112 L328,112 L328,124 L334,124 L334,136 L340,136 L340,150 L346,150 L346,162 L352,162 L352,174 L358,174 L358,185 L364,185 L364,192 L370,192 L370,200 L380,200 L380,200 Z`}
          fill={accent} opacity="0.18"/>
        {/* Glow pool under the empire */}
        <rect x="0" y="196" width="380" height="20" fill="url(#ow-glow)"/>
        {/* Stars */}
        {Array.from({length:30},(_,i) => (
          <circle key={i} cx={hs(i*7)*380} cy={hs(i*11)*140} r={hs(i*3)*0.8+0.3} fill="white" opacity={0.3+hs(i*17)*0.4}/>
        ))}
      </svg>
    </div>
  );
}

function VersusScene({ accent }: { accent: string }) {
  const rivalColor = '#e74c3c';
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 380 300" width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="vs-bg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={accent}      stopOpacity="0.12"/>
            <stop offset="48%"  stopColor="#030507"     stopOpacity="1"/>
            <stop offset="52%"  stopColor="#030507"     stopOpacity="1"/>
            <stop offset="100%" stopColor={rivalColor}  stopOpacity="0.12"/>
          </linearGradient>
          <linearGradient id="vs-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#050809"/>
            <stop offset="100%" stopColor="#020304"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="380" height="300" fill="#020304"/>
        <rect x="0" y="0" width="380" height="300" fill="url(#vs-bg)"/>
        {/* Floor */}
        <rect x="0" y="210" width="380" height="90" fill="url(#vs-floor)"/>
        {/* Center dividing line of chromatic tension */}
        <rect x="188" y="0" width="4" height="300" fill="white" opacity="0.04"/>
        <rect x="190" y="0" width="1" height="300" fill="white" opacity="0.08"/>
        {/* Player side (left) — accent bleed */}
        <rect x="0" y="0" width="190" height="300" fill={accent} opacity="0.025"/>
        {/* Rival side (right) — rival bleed */}
        <rect x="190" y="0" width="190" height="300" fill={rivalColor} opacity="0.025"/>
        {/* Round indicators at top */}
        {[0,1,2].map(i => (
          <circle key={i} cx={160+i*30} cy={18} r={7} fill="none" stroke={i<1?accent:"rgba(255,255,255,0.15)"} strokeWidth="2"/>
        ))}
        <text x="190" y="22" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="sans-serif">ROUND 1</text>
        {/* Ground reflection */}
        <rect x="0" y="210" width="380" height="3" fill="white" opacity="0.03"/>
        <ellipse cx="95" cy="220" rx="80" ry="12" fill={accent} opacity="0.07"/>
        <ellipse cx="285" cy="220" rx="80" ry="12" fill={rivalColor} opacity="0.06"/>
      </svg>
    </div>
  );
}

// ---- Seed for pseudo-random in SVG helper (same as LiveEmpireView) ----------
function hs(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

// ---- Camera motion wrappers -------------------------------------------------
function CameraWrap({ mode, children }: { mode: CameraMode; children: ReactNode }) {
  const cameraClass =
    mode === 'push' ? 'cam-push'  :
    mode === 'pull' ? 'cam-pull'  :
    mode === 'pan'  ? 'cam-pan'   : '';  // hold = no class
  return (
    <div
      className={`relative w-full h-full ${cameraClass}`}
      style={{ transformOrigin: mode === 'pull' ? 'center top' : 'center bottom' }}
    >
      {children}
    </div>
  );
}

// ---- Skip indicator ---------------------------------------------------------
function SkipHint({ visible, onSkip }: { visible: boolean; onSkip: () => void }) {
  if (!visible) return null;
  return (
    <button
      onClick={onSkip}
      className="absolute bottom-4 right-4 z-50 glass rounded-full px-3 py-1.5 text-[10px] text-muted
        animate-fade-in active:scale-95 transition-transform"
      aria-label="Skip scene"
    >
      hold to skip ⟩
    </button>
  );
}

// ---- Main component ---------------------------------------------------------

export default function CinematicCutscene({
  location,
  camera   = 'push',
  transition = 'fade',
  character,
  multiChar,
  accent,
  onComplete,
  skippable = true,
}: CinematicCutsceneProps) {
  const [transitionDone, setTransitionDone] = useState(false);
  const [skipVisible,    setSkipVisible]    = useState(false);
  const [skipping,       setSkipping]       = useState(false);

  // Transition in
  useEffect(() => {
    const t = setTimeout(() => setTransitionDone(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Show skip after 2s
  useEffect(() => {
    if (!skippable) return;
    const t = setTimeout(() => setSkipVisible(true), 2000);
    return () => clearTimeout(t);
  }, [skippable]);

  const handleSkip = () => {
    setSkipping(true);
    setTimeout(() => onComplete?.(), 350);
  };

  const transitionClass =
    transition === 'iris'  ? 'iris-in'    :
    transition === 'wipe'  ? 'wipe-reveal':
    'animate-fade-in';

  const SceneBg =
    location === 'cabin'        ? CabinScene       :
    location === 'hq'           ? HQScene          :
    location === 'rival_domain' ? RivalDomainScene :
    location === 'street'       ? StreetScene      :
    location === 'open_world'   ? OpenWorldScene   :
    VersusScene;

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex flex-col overflow-hidden',
        'max-w-[480px] mx-auto',
        skipping ? 'animate-fade-in' : transitionClass,
      ].join(' ')}
    >
      {/* Scene background with camera motion */}
      <div className="absolute inset-0">
        <CameraWrap mode={camera}>
          <SceneBg accent={accent} />
        </CameraWrap>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Top letterbox bar (cinematic feel) */}
        <div className="h-8 glass-panel opacity-80 shrink-0" />

        {/* Mid area — world keeps running (transparent) */}
        <div className="flex-1" />

        {/* Character presence / multi-char in lower third */}
        <div className="px-3 pb-4">
          {character && (
            <CharacterPresence
              {...character}
              onComplete={onComplete}
            />
          )}
          {multiChar && (
            <MultiCharacterScene
              kind={multiChar.kind}
              characters={multiChar.characters}
              speakerIdx={multiChar.speakerIdx}
              accent={accent}
              showAurora={multiChar.kind === 'celebration'}
              onComplete={onComplete}
            />
          )}
        </div>

        {/* Bottom letterbox bar */}
        <div className="h-6 glass-panel opacity-60 shrink-0" />
      </div>

      {/* Skip control */}
      <SkipHint visible={skipVisible && !skipping} onSkip={handleSkip} />
    </div>
  );
}
