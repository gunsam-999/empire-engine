// ============================================================================
// LiveEmpireView — Isometric city world.
// Wider/flatter isometric projection with subtle CSS perspective transform.
// Buildings are silhouette-accurate per industry and tier. World is never still.
// ============================================================================

import { useMemo } from 'react';
import {
  useGame, getIndustry, incomePerSec, marketPrice, reachPerSec,
  tierUnlocked, getChannel,
} from '../../game/GameContext';
import { withAlpha } from '../../utils/palette';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { GameState, IndustryType } from '../../game/types';

// ---- Constants ---------------------------------------------------------------
const VB_W  = 380;
const VB_H  = 300;
const GY    = 226;   // ground baseline y
const MAX_BPT = 7;

// Tier building dimensions (w=face width, h=height, d=iso top-depth)
const TD = [
  { w: 22, h: 22, d:  9 },
  { w: 30, h: 34, d: 11 },
  { w: 38, h: 52, d: 13 },
  { w: 28, h: 72, d: 12 },
  { w: 40, h: 94, d: 16 },
] as const;

// ---- Types -------------------------------------------------------------------
interface TB { tier: number; count: number; owned: number; }
interface SM {
  tiers: TB[]; totalBuildings: number;
  workerCount: number; coinCount: number; waveCount: number; heartCount: number;
  mood: 'boom' | 'crash' | 'normal';
  prestige: number; socialActive: boolean; hasEmpire: boolean;
}
interface SP { model: SM; accent: string; industry: IndustryType | ''; }

// ---- Helpers -----------------------------------------------------------------
function ownedInTier(s: GameState, id: string, tier: number) {
  let n = 0;
  const p = `${id}-t${tier}-`;
  for (const [k, v] of Object.entries(s.facilities)) if (k.startsWith(p)) n += v;
  return n;
}
function density(rate: number, max: number) {
  if (!isFinite(rate) || rate <= 0) return 0;
  return Math.max(1, Math.min(max, Math.round(Math.log10(1 + rate) * 2.2)));
}
function bfo(owned: number) {
  return Math.max(0, Math.min(MAX_BPT, owned > 0 ? Math.max(1, Math.round(Math.sqrt(owned) * 1.3)) : 0));
}
function hs(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

// ---- ISO BUILDING HELPERS ---------------------------------------------------

// Color helpers for isometric faces
function darken(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amt)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amt)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amt)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
function lighten(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amt));
  const g = Math.min(255, Math.round(((n >> 8) & 255)  + (255 - ((n >> 8) & 255))  * amt));
  const b = Math.min(255, Math.round((n & 255)          + (255 - (n & 255))          * amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface BoxProps {
  cx: number; by: number; w: number; h: number; d?: number;
  fc?: string; tc?: string; rc?: string;
  children?: React.ReactNode;
}

// Isometric 3-face building box.
// cx=center-x, by=base-y (bottom), w=face-width, h=height, d=iso depth
// Uses wider/flatter 3:1 ratio: top face extends d right and d/3 up.
function IsoBox({ cx, by, w, h, d = 11, fc = '#151c2b', tc = '#1a2232', rc = '#0c1119', children }: BoxProps) {
  const L  = cx - w / 2, R  = cx + w / 2;
  const T  = by - h;
  const TY = T - d / 3;  // top-back y

  const topPts  = `${L},${T} ${R},${T} ${R + d},${TY} ${L + d},${TY}`;
  const sidePts = `${R},${T} ${R + d},${TY} ${R + d},${by - d / 3} ${R},${by}`;

  return (
    <g>
      <polygon points={topPts}  fill={tc} />
      <rect    x={L} y={T} width={w} height={h} fill={fc} />
      <polygon points={sidePts} fill={rc} />
      {children}
    </g>
  );
}

// ---- BUILDING DETAIL RENDERERS per industry/tier ----------------------------
// Each returns SVG children drawn on top of an IsoBox.
// (cx, by, w, h, d) match the box. ac = accent color.

function TechDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      {/* Server rows */}
      {[0,1,2].map(i => <rect key={i} x={L+3} y={T+4+i*5} width={w-6} height={2.5} rx={0.5} fill={ac} opacity={0.25+i*0.05}/>)}
      {/* Blinking LED */}
      <circle cx={R-4} cy={T+6} r={1.5} fill={ac} opacity={0.9} className="lev-blink"/>
    </>;
    case 2: return <>
      {[0,1,2,3].map(i => <rect key={i} x={L+3} y={T+5+i*6} width={w-6} height={3} rx={0.5} fill={ac} opacity={0.2+i*0.04}/>)}
      {/* Cooling unit on top */}
      <rect x={cx-7} y={T-d/3-6} width={14} height={5} rx={1} fill={darken(ac,0.4)}/>
      <rect x={cx-5} y={T-d/3-8} width={3} height={3} rx={0.5} fill={darken(ac,0.3)}/>
      <rect x={cx+2} y={T-d/3-8} width={3} height={3} rx={0.5} fill={darken(ac,0.3)}/>
      <circle cx={R-4} cy={T+8} r={1.5} fill={ac} opacity={0.9} className="lev-blink"/>
    </>;
    case 3: return <>
      {/* LED strip vertical */}
      <rect x={L+2} y={T+4} width={2} height={h-8} rx={1} fill={ac} opacity={0.4}/>
      {/* Server racks as horizontal bars */}
      {[0,1,2,3,4].map(i => <rect key={i} x={L+6} y={T+4+i*8} width={w-10} height={4} rx={0.5} fill={darken(ac,0.35)} opacity={0.7}/>)}
      {/* Satellite dish on top-right */}
      <path d={`M${cx+d/2+2},${T-d/3-2} Q${cx+d/2+8},${T-d/3-12} ${cx+d/2+12},${T-d/3-8}`} stroke={ac} strokeWidth="2" fill="none" opacity="0.8"/>
      <circle cx={cx+d/2+12} cy={T-d/3-8} r={3} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.7"/>
      {/* Cooling towers */}
      <rect x={cx-8} y={T-d/3-10} width={6} height={8} rx={1} fill={darken(ac,0.45)}/>
      <rect x={cx+2} y={T-d/3-10} width={6} height={8} rx={1} fill={darken(ac,0.45)}/>
    </>;
    case 4: return <>
      {/* Glass curtain wall — repeated window grid */}
      {[0,1,2,3,4,5,6,7,8].map(row => [0,1].map(col => (
        <rect key={`${row}-${col}`} x={L+4+col*11} y={T+4+row*7} width={8} height={5} rx={0.5}
              fill={ac} opacity={0.08+hs(row*3+col)*0.06} className="window-night"/>
      )))}
      {/* LED stripe up the edge */}
      <rect x={L+1} y={T+2} width={1.5} height={h-4} rx={0.7} fill={ac} opacity={0.55}/>
      {/* Antenna array on top */}
      <rect x={cx-1} y={T-d/3-18} width={2} height={16} fill={ac} opacity={0.9}/>
      <rect x={cx-6} y={T-d/3-12} width={12} height={1} fill={ac} opacity={0.6}/>
      <rect x={cx-4} y={T-d/3-16} width={8} height={1} fill={ac} opacity={0.6}/>
      <circle cx={cx} cy={T-d/3-19} r={2} fill={ac} opacity={0.9} className="lev-blink"/>
    </>;
    default: return <>
      {/* Mega data center: curtain wall + ring structure */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*11} y={T+4+row*6} width={8} height={4} rx={0.5}
              fill={ac} opacity={0.06+hs(row+col)*0.07} className="window-night"/>
      )))}
      {/* Holographic ring at top */}
      <ellipse cx={cx+d/2} cy={T-d/3-10} rx={18} ry={6} fill="none" stroke={ac} strokeWidth="2" opacity="0.7"/>
      <ellipse cx={cx+d/2} cy={T-d/3-10} rx={14} ry={4} fill="none" stroke={ac} strokeWidth="1" opacity="0.4"/>
      {/* Triple antenna */}
      <rect x={cx-8} y={T-d/3-26} width={1.5} height={22} fill={ac} opacity={0.8}/>
      <rect x={cx-1} y={T-d/3-30} width={2} height={26} fill={ac} opacity={0.95}/>
      <rect x={cx+6} y={T-d/3-22} width={1.5} height={18} fill={ac} opacity={0.7}/>
      <circle cx={cx-1} cy={T-d/3-31} r={2.5} fill={ac} className="lev-blink"/>
      {/* Adjacent processing wing shadow */}
      <rect x={R+d+2} y={by-38} width={16} height={36} rx={1} fill={darken(ac,0.6)} opacity={0.6}/>
    </>;
  }
}

function SpaceDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      {/* Small launch pad slab */}
      <rect x={L+2} y={by-4} width={w-4} height={3} fill={darken(ac,0.2)} opacity={0.8}/>
      {/* Tiny rocket on pad */}
      <path d={`M${cx},${T-4} L${cx-4},${T+8} L${cx+4},${T+8} Z`} fill={ac} opacity={0.8}/>
      <circle cx={cx} cy={T-5} r={2} fill={lighten(ac,0.3)}/>
    </>;
    case 2: return <>
      {/* Launch gantry */}
      <rect x={L-2} y={T-20} width={3} height={h+16} fill={darken(ac,0.3)} opacity={0.9}/>
      <rect x={L-2} y={T-20} width={w/2+4} height={2} fill={darken(ac,0.3)} opacity={0.7}/>
      {/* Medium rocket */}
      <path d={`M${cx+4},${T-18} L${cx},${T-24} L${cx-1},${T-24} Z`} fill={lighten(ac,0.2)}/>
      <rect x={cx+1} y={T-18} width={5} height={16} rx={1} fill={ac} opacity={0.9}/>
      {/* Exhaust nozzle */}
      <path d={`M${cx+1},${T-2} L${cx-1},${T-2} L${cx},${T+4}`} fill={darken(ac,0.2)}/>
    </>;
    case 3: return <>
      {/* 2 gantry towers */}
      <rect x={L-3} y={T-30} width={3} height={h+26} fill={darken(ac,0.3)}/>
      <rect x={cx+8} y={T-20} width={3} height={h+16} fill={darken(ac,0.3)} opacity={0.7}/>
      <rect x={L-3} y={T-30} width={w+12} height={2} fill={darken(ac,0.3)} opacity={0.7}/>
      {/* Rocket */}
      <path d={`M${cx-3},${T-22} L${cx},${T-30} L${cx+3},${T-22}`} fill={lighten(ac,0.3)}/>
      <rect x={cx-3} y={T-22} width={6} height={22} rx={1} fill={ac} opacity={0.9}/>
      {/* Exhaust flames (tiny animated) */}
      <path d={`M${cx-3},${T} Q${cx},${T+8} ${cx+3},${T}`} fill="none" stroke="#ff8c42" strokeWidth="2" opacity="0.7" className="lev-flame"/>
    </>;
    case 4: return <>
      {/* Orbital launch facility */}
      <rect x={L-4} y={T-45} width={3} height={h+40} fill={darken(ac,0.3)}/>
      <rect x={cx+12} y={T-35} width={3} height={h+30} fill={darken(ac,0.3)} opacity={0.8}/>
      {/* Big rocket */}
      <path d={`M${cx-5},${T-35} L${cx},${T-48} L${cx+5},${T-35}`} fill={lighten(ac,0.35)}/>
      <rect x={cx-5} y={T-35} width={10} height={36} rx={2} fill={ac} opacity={0.9}/>
      {/* Side boosters */}
      <rect x={cx-10} y={T-28} width={4} height={26} rx={1} fill={darken(ac,0.2)} opacity={0.8}/>
      <rect x={cx+6} y={T-28} width={4} height={26} rx={1} fill={darken(ac,0.2)} opacity={0.8}/>
      {/* Control room windows */}
      {[0,1,2].map(i => <rect key={i} x={L+3+i*7} y={T+6} width={5} height={4} rx={0.5} fill={ac} opacity={0.35} className="window-night"/>)}
    </>;
    default: return <>
      {/* Starport: massive structure */}
      <rect x={L-6} y={T-60} width={4} height={h+55} fill={darken(ac,0.3)}/>
      <rect x={cx+15} y={T-50} width={4} height={h+45} fill={darken(ac,0.3)} opacity={0.8}/>
      {/* Huge rocket */}
      <path d={`M${cx-6},${T-50} L${cx},${T-66} L${cx+6},${T-50}`} fill={lighten(ac,0.4)}/>
      <rect x={cx-6} y={T-50} width={12} height={52} rx={2} fill={ac} opacity={0.9}/>
      {/* Side boosters */}
      <rect x={cx-13} y={T-40} width={5} height={38} rx={1.5} fill={darken(ac,0.15)} opacity={0.85}/>
      <rect x={cx+8} y={T-40} width={5} height={38} rx={1.5} fill={darken(ac,0.15)} opacity={0.85}/>
      {/* Orbital ring */}
      <ellipse cx={cx+d/2} cy={T-d/3-8} rx={22} ry={5} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.7"/>
      {/* Control complex windows */}
      {[0,1,2,3].map(i => <rect key={i} x={L+3+i*7} y={T+6} width={5} height={4} rx={0.5} fill={ac} opacity={0.3} className="window-night"/>)}
      {[0,1,2,3].map(i => <rect key={i} x={L+3+i*7} y={T+14} width={5} height={4} rx={0.5} fill={ac} opacity={0.2} className="window-night"/>)}
      <circle cx={cx} cy={T-d/3-68} r={3} fill={ac} opacity={0.9} className="lev-blink"/>
    </>;
  }
}

function CulinaryDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      {/* Awning */}
      <path d={`M${L-2},${T+8} L${R+2},${T+8} L${R},${T+14} L${L},${T+14} Z`} fill={ac} opacity={0.6}/>
      {/* Sign */}
      <rect x={L+3} y={T+2} width={w-6} height={5} rx={1} fill={darken(ac,0.2)} opacity={0.8}/>
    </>;
    case 2: return <>
      <path d={`M${L-3},${T+10} L${R+3},${T+10} L${R+1},${T+17} L${L-1},${T+17} Z`} fill={ac} opacity={0.55}/>
      {/* Windows */}
      <rect x={L+3} y={T+4} width={8} height={6} rx={0.5} fill={ac} opacity={0.3} className="window-night"/>
      <rect x={R-11} y={T+4} width={8} height={6} rx={0.5} fill={ac} opacity={0.3} className="window-night"/>
      {/* Chimney */}
      <rect x={cx-2} y={T-d/3-10} width={4} height={8} fill={darken(ac,0.3)}/>
      <circle cx={cx} cy={T-d/3-11} r={2.5} fill={darken(ac,0.5)} opacity={0.6}/>
    </>;
    case 3: return <>
      {/* Multi-window restaurant */}
      {[0,1].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*11} y={T+5+row*12} width={8} height={8} rx={1}
              fill={ac} opacity={0.25+hs(row+col)*0.1} className="window-night"/>
      )))}
      {/* Grand awning */}
      <path d={`M${L-4},${T+h/2+2} L${R+4+d},${T+h/2+2} L${R+d},${T+h/2+9} L${L},${T+h/2+9} Z`} fill={ac} opacity={0.5}/>
      {/* Chimney stack */}
      <rect x={cx-3} y={T-d/3-14} width={5} height={12} rx={1} fill={darken(ac,0.3)}/>
    </>;
    case 4: return <>
      {[0,1,2,3].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*8} y={T+3+row*14} width={6} height={10} rx={1}
              fill={ac} opacity={0.2+hs(row*2+col)*0.1} className="window-night"/>
      )))}
      {/* Terrace railing on top */}
      <rect x={L+d/2} y={T-d/3-4} width={w-2} height={2} fill={darken(ac,0.2)} opacity={0.8}/>
      {[0,1,2,3].map(i => <rect key={i} x={L+d/2+3+i*((w-6)/3)} y={T-d/3-8} width={1.5} height={4} fill={darken(ac,0.2)} opacity={0.7}/>)}
      <rect x={cx-6} y={T-d/3-16} width={2} height={14} fill={darken(ac,0.35)}/>
      <rect x={cx+4} y={T-d/3-16} width={2} height={14} fill={darken(ac,0.35)}/>
    </>;
    default: return <>
      {/* Flagship: curtain wall with rooftop dome */}
      {[0,1,2,3,4,5].map(row => [0,1,2,3].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*8} y={T+3+row*12} width={6} height={9} rx={1}
              fill={ac} opacity={0.18+hs(row*3+col)*0.08} className="window-night"/>
      )))}
      {/* Glass dome roof */}
      <path d={`M${L+d/2+2},${T-d/3} Q${cx+d/2},${T-d/3-28} ${R+d-2},${T-d/3}`} fill="none" stroke={ac} strokeWidth="2" opacity="0.7"/>
      <path d={`M${L+d/2+6},${T-d/3} Q${cx+d/2},${T-d/3-18} ${R+d-6},${T-d/3}`} fill={withAlpha(ac,0.1)}/>
      {/* Vertical garden stripes on right face */}
      {[0,1].map(i => <rect key={i} x={R+2+i*4} y={T+8} width={2} height={h-14} rx={1} fill={darken(ac,0.1)} opacity={0.4}/>)}
      {/* Chimney pair */}
      <rect x={cx-10} y={T-d/3-18} width={5} height={16} rx={1} fill={darken(ac,0.35)}/>
      <rect x={cx+5} y={T-d/3-14} width={4} height={12} rx={1} fill={darken(ac,0.35)}/>
    </>;
  }
}

function EnergyDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      {/* Wind turbine mast */}
      <rect x={cx-1} y={T} width={2} height={h} fill={darken(ac,0.2)} opacity={0.9}/>
      {/* Blades */}
      <line x1={cx} y1={T+4} x2={cx-10} y2={T-2} stroke={ac} strokeWidth="2.5" opacity="0.8" className="lev-spin"/>
      <line x1={cx} y1={T+4} x2={cx+9} y2={T+10} stroke={ac} strokeWidth="2.5" opacity="0.8" className="lev-spin"/>
      <line x1={cx} y1={T+4} x2={cx+2} y2={T+14} stroke={ac} strokeWidth="2.5" opacity="0.8" className="lev-spin"/>
      <circle cx={cx} cy={T+4} r={2} fill={ac}/>
    </>;
    case 2: return <>
      {/* Solar panels on roof */}
      {[0,1,2].map(i => <rect key={i} x={L+d/2+2+i*9} y={T-d/3-5} width={7} height={4} rx={0.5} fill={ac} opacity={0.5}/>)}
      {/* Building details */}
      <rect x={L+3} y={T+5} width={12} height={8} rx={1} fill={darken(ac,0.2)} opacity={0.6}/>
      <rect x={R-15} y={T+5} width={12} height={8} rx={1} fill={darken(ac,0.2)} opacity={0.6}/>
      {/* Pylon */}
      <line x1={R+d+6} y1={T-10} x2={R+d+6} y2={by} stroke={darken(ac,0.2)} strokeWidth="2" opacity="0.7"/>
      <line x1={R+d+2} y1={T-8} x2={R+d+10} y2={T-8} stroke={darken(ac,0.2)} strokeWidth="1.5" opacity="0.6"/>
    </>;
    case 3: return <>
      {[0,1,2,3].map(i => <rect key={i} x={L+d/2+1+i*8} y={T-d/3-7} width={6} height={5} rx={0.5} fill={ac} opacity={0.5}/>)}
      {/* Chimney */}
      <rect x={L-6} y={T-24} width={8} height={h+20} rx={1} fill={darken(ac,0.3)}/>
      {/* Smoke (animated) */}
      <circle cx={L-2} cy={T-26} r={3} fill="#888" opacity={0.2} className="lev-smoke"/>
      {/* Power meter windows */}
      {[0,1,2].map(i => <rect key={i} x={L+4} y={T+5+i*14} width={10} height={10} rx={1} fill={ac} opacity={0.25} className="window-night"/>)}
    </>;
    case 4: return <>
      {/* Clean energy tower */}
      {[0,1,2,3,4].map(i => <rect key={i} x={L+d/2+1+i*7} y={T-d/3-8} width={5} height={6} rx={0.5} fill={ac} opacity={0.55}/>)}
      {/* Ring on building top */}
      <ellipse cx={cx+d/2} cy={T-d/3-12} rx={15} ry={4} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.6"/>
      {/* Window grid */}
      {[0,1,2,3].map(row => [0,1].map(col => (
        <rect key={`${row}-${col}`} x={L+4+col*13} y={T+5+row*12} width={10} height={9} rx={1}
              fill={ac} opacity={0.2} className="window-night"/>
      )))}
    </>;
    default: return <>
      {/* Mega energy campus */}
      {[0,1,2,3,4].map(i => <rect key={i} x={L+d/2+1+i*7} y={T-d/3-10} width={5} height={8} rx={0.5} fill={ac} opacity={0.6}/>)}
      {/* Fusion-style circular ring */}
      <ellipse cx={cx+d/2} cy={T-d/3-20} rx={20} ry={7} fill="none" stroke={ac} strokeWidth="2.5" opacity="0.7"/>
      <ellipse cx={cx+d/2} cy={T-d/3-20} rx={14} ry={5} fill="none" stroke={ac} strokeWidth="1" opacity="0.4"/>
      {/* Glowing core */}
      <circle cx={cx+d/2} cy={T-d/3-20} r={4} fill={ac} opacity={0.6} className="lev-aura"/>
      {/* Curtain wall windows */}
      {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*11} y={T+4+row*11} width={8} height={8} rx={1}
              fill={ac} opacity={0.15+hs(row+col)*0.08} className="window-night"/>
      )))}
    </>;
  }
}

function FashionDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      <path d={`M${L-2},${T+12} L${R+2},${T+12} L${R},${T+18} L${L},${T+18} Z`} fill={ac} opacity={0.6}/>
      <rect x={L+3} y={T+3} width={w-6} height={4} rx={0.5} fill={lighten(ac,0.2)} opacity={0.5}/>
    </>;
    case 2: return <>
      {/* Display window */}
      <rect x={L+2} y={T+6} width={w-4} height={h/2} rx={0.5} fill={ac} opacity={0.12}/>
      {/* Mannequin silhouette */}
      <circle cx={cx} cy={T+12} r={3} fill={ac} opacity={0.5}/>
      <path d={`M${cx-4},${T+15} L${cx+4},${T+15} L${cx+5},${T+h/2+3} L${cx-5},${T+h/2+3} Z`} fill={ac} opacity={0.35}/>
    </>;
    case 3: return <>
      {/* Boutique windows */}
      {[0,1].map(col => (
        <g key={col}>
          <rect x={L+4+col*(w/2-2)} y={T+4} width={w/2-6} height={h/3} rx={1} fill={ac} opacity={0.12}/>
          <circle cx={L+4+col*(w/2-2)+(w/2-6)/2} cy={T+10} r={3} fill={ac} opacity={0.4}/>
        </g>
      ))}
      {/* Top sign */}
      <rect x={L+2} y={T+1} width={w-4} height={4} rx={1} fill={darken(ac,0.1)} opacity={0.8}/>
      <circle cx={R-4} cy={T-d/3-6} r={2} fill={ac} opacity={0.7} className="lev-blink"/>
    </>;
    case 4: return <>
      {[0,1,2,3].map(row => [0,1].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*(w/2)} y={T+4+row*14} width={w/2-4} height={10} rx={1}
              fill={ac} opacity={0.15+hs(row+col)*0.06} className="window-night"/>
      )))}
      {/* Runway strip on roof */}
      <rect x={L+d/2} y={T-d/3-3} width={w} height={2} fill={ac} opacity={0.7}/>
      {[0,1,2,3].map(i => <circle key={i} cx={L+d/2+4+i*8} cy={T-d/3-7} r={1.5} fill={ac} opacity={0.8} className="lev-blink"/>)}
    </>;
    default: return <>
      {/* Fashion empire: floor-to-ceiling glass */}
      {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*12} y={T+3+row*12} width={9} height={9} rx={0.5}
              fill={ac} opacity={0.14+hs(row*2+col)*0.07} className="window-night"/>
      )))}
      {/* Iconic spire */}
      <path d={`M${cx+d/2-2},${T-d/3} L${cx+d/2},${T-d/3-28} L${cx+d/2+2},${T-d/3} Z`} fill={ac} opacity={0.9}/>
      <circle cx={cx+d/2} cy={T-d/3-29} r={2.5} fill={ac} opacity={0.95} className="lev-blink"/>
      {/* Camera flashes (circle sparkles) */}
      <circle cx={L-8} cy={by-20} r={1.5} fill="white" opacity={0.5} className="lev-flash"/>
      <circle cx={L-14} cy={by-12} r={1} fill="white" opacity={0.4} className="lev-flash"/>
    </>;
  }
}

function BiotechDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      <rect x={L+3} y={T+4} width={w-6} height={3} rx={0.5} fill={ac} opacity={0.4}/>
      <text x={cx} y={T+h/2+4} fill={ac} fontSize="8" textAnchor="middle" opacity={0.6}>+</text>
    </>;
    case 2: return <>
      {/* Bio-cross on building */}
      <rect x={cx-6} y={T+5} width={12} height={3} rx={0.5} fill={ac} opacity={0.5}/>
      <rect x={cx-1.5} y={T+2} width={3} height={9} rx={0.5} fill={ac} opacity={0.5}/>
      {/* Small dome greenhouse */}
      <path d={`M${R+d+2},${by-16} Q${R+d+11},${by-26} ${R+d+20},${by-16}`} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.6"/>
      <rect x={R+d+2} y={by-17} width={18} height={1.5} fill={ac} opacity={0.4}/>
    </>;
    case 3: return <>
      {[0,1].map(row => [0,1].map(col => (
        <rect key={`${row}-${col}`} x={L+4+col*13} y={T+5+row*16} width={11} height={13} rx={1}
              fill={ac} opacity={0.2} className="window-night"/>
      )))}
      {/* DNA helix motif */}
      <path d={`M${R+d+3},${T+h/2} Q${R+d+12},${T+h/2-8} ${R+d+20},${T+h/2-4}`} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.7"/>
      <path d={`M${R+d+3},${T+h/2+8} Q${R+d+12},${T+h/2+2} ${R+d+20},${T+h/2+4}`} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.5"/>
      {/* Bio-dome */}
      <path d={`M${cx-12+d/2},${T-d/3} Q${cx+d/2},${T-d/3-18} ${cx+12+d/2},${T-d/3}`} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.6"/>
    </>;
    case 4: return <>
      {[0,1,2,3].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*8} y={T+4+row*14} width={6} height={10} rx={0.5}
              fill={ac} opacity={0.18+hs(row+col)*0.06} className="window-night"/>
      )))}
      {/* Full dome */}
      <path d={`M${L+d/2+4},${T-d/3} Q${cx+d/2},${T-d/3-20} ${R+d-4},${T-d/3}`} fill={withAlpha(ac,0.12)} stroke={ac} strokeWidth="1.5" opacity="0.6"/>
      {/* Molecule float */}
      <circle cx={cx+d/2+8} cy={T-d/3-14} r={4} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.5" className="lev-spin"/>
      <circle cx={cx+d/2+14} cy={T-d/3-10} r={2.5} fill={ac} opacity={0.4}/>
    </>;
    default: return <>
      {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*11} y={T+3+row*11} width={8} height={8} rx={0.5}
              fill={ac} opacity={0.14+hs(row*2+col)*0.07} className="window-night"/>
      )))}
      {/* Grand bio-dome center */}
      <path d={`M${L+d/2},${T-d/3} Q${cx+d/2},${T-d/3-32} ${R+d},${T-d/3}`} fill={withAlpha(ac,0.14)} stroke={ac} strokeWidth="2" opacity="0.7"/>
      {/* Helix towers flanking */}
      <rect x={L-8} y={T-20} width={6} height={h+16} rx={1} fill={darken(ac,0.3)} opacity={0.7}/>
      {/* DNA helix motif on side */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <circle cx={L-5} cy={T+4+i*18} r={2.5} fill={ac} opacity={0.4}/>
          <circle cx={L-5} cy={T+10+i*18} r={2} fill={ac} opacity={0.3}/>
          <line x1={L-5} y1={T+4+i*18} x2={L-5} y2={T+10+i*18} stroke={ac} strokeWidth="1" opacity="0.3"/>
        </g>
      ))}
      <circle cx={cx+d/2} cy={T-d/3-34} r={3.5} fill={ac} opacity={0.9} className="lev-blink"/>
    </>;
  }
}

function MediaDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      <rect x={L+3} y={T+3} width={w-6} height={4} rx={1} fill={ac} opacity={0.6}/>
      <circle cx={cx} cy={T-d/3-6} r={2} fill={ac} opacity={0.7} className="lev-blink"/>
    </>;
    case 2: return <>
      {/* Broadcast antenna */}
      <rect x={cx-1} y={T-d/3-20} width={2} height={18} fill={ac} opacity={0.8}/>
      {[0,1,2].map(i => <ellipse key={i} cx={cx} cy={T-d/3-18+i*5} rx={4+i*3} ry={1+i} fill="none" stroke={ac} strokeWidth="0.8" opacity={0.5-i*0.1}/>)}
      {/* ON AIR sign */}
      <rect x={L+3} y={T+3} width={w-6} height={5} rx={0.5} fill={darken(ac,0.1)} opacity={0.6}/>
      <circle cx={R-5} cy={T+5.5} r={1.5} fill="#f87171" opacity={0.9} className="lev-blink"/>
    </>;
    case 3: return <>
      {/* Media house: large screen facade */}
      <rect x={L+3} y={T+2} width={w-6} height={h/2} rx={1} fill={darken(ac,0.15)} opacity={0.5}/>
      <rect x={L+5} y={T+4} width={w-10} height={h/2-4} rx={0.5} fill={ac} opacity={0.15} className="window-night"/>
      {/* Broadcast tower */}
      <rect x={cx-1} y={T-d/3-28} width={2} height={26} fill={ac} opacity={0.9}/>
      {[0,1,2,3].map(i => <ellipse key={i} cx={cx} cy={T-d/3-26+i*6} rx={5+i*4} ry={1.5+i*0.5} fill="none" stroke={ac} strokeWidth="1" opacity={0.6-i*0.1}/>)}
    </>;
    case 4: return <>
      {/* LED facade */}
      {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*10} y={T+3+row*9} width={8} height={7} rx={0.5}
              fill={ac} opacity={0.12+hs(row*3+col)*0.08} className="window-night"/>
      )))}
      {/* Antenna cluster */}
      <rect x={cx-1.5} y={T-d/3-36} width={3} height={34} fill={ac} opacity={0.9}/>
      <rect x={cx-10} y={T-d/3-28} width={2} height={24} fill={ac} opacity={0.6}/>
      <rect x={cx+8} y={T-d/3-24} width={2} height={20} fill={ac} opacity={0.6}/>
      {/* Signal rings */}
      {[0,1,2,3].map(i => <ellipse key={i} cx={cx} cy={T-d/3-34+i*7} rx={6+i*5} ry={1.5+i*0.5} fill="none" stroke={ac} strokeWidth="1" opacity={0.7-i*0.15}/>)}
    </>;
    default: return <>
      {/* Skyscraper LED facade */}
      {[0,1,2,3,4,5,6,7].map(row => [0,1,2,3].map(col => (
        <rect key={`${row}-${col}`} x={L+1+col*9} y={T+2+row*9} width={7} height={7} rx={0.4}
              fill={ac} opacity={0.10+hs(row*4+col)*0.10} className="window-night"/>
      )))}
      {/* Massive broadcast tower */}
      <rect x={cx-2} y={T-d/3-50} width={4} height={48} fill={ac} opacity={0.9}/>
      {[0,1,2,3,4].map(i => <ellipse key={i} cx={cx} cy={T-d/3-48+i*9} rx={7+i*6} ry={2+i*0.6} fill="none" stroke={ac} strokeWidth="1.2" opacity={0.75-i*0.12}/>)}
      <circle cx={cx} cy={T-d/3-51} r={3} fill={ac} opacity={0.95} className="lev-blink"/>
    </>;
  }
}

function AgriDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      {/* Tiny barn roof */}
      <path d={`M${L},${T+6} L${cx},${T} L${L+w},${T+6}`} fill={darken(ac,0.1)} opacity={0.7}/>
    </>;
    case 2: return <>
      {/* Barn with silo */}
      <path d={`M${L},${T+8} L${cx},${T} L${L+w},${T+8}`} fill={darken(ac,0.1)} opacity={0.7}/>
      <rect x={L-8} y={T-10} width={8} height={h+8} rx={4} fill={darken(ac,0.25)} opacity={0.8}/>
      {/* Windmill */}
      <rect x={L-20} y={T+8} width={2} height={h-10} fill={darken(ac,0.3)} opacity={0.7}/>
      <circle cx={L-19} cy={T+8} r={2} fill={darken(ac,0.3)}/>
      {[0,1,2].map(i => <line key={i} x1={L-19} y1={T+8} x2={L-19+Math.cos(i*2.09)*10} y2={T+8+Math.sin(i*2.09)*10}
                               stroke={ac} strokeWidth="2" opacity="0.7" className="lev-spin"/>)}
    </>;
    case 3: return <>
      <path d={`M${L},${T+8} L${cx},${T} L${L+w},${T+8}`} fill={darken(ac,0.1)} opacity={0.7}/>
      {[0,1].map(i => <rect key={i} x={L-10-i*10} y={T-8+i*2} width={8} height={h+6-i*2} rx={4} fill={darken(ac,0.25)} opacity={0.8}/>)}
      {/* Greenhouse arc */}
      <path d={`M${L-28},${by-12} Q${L-22},${by-26} ${L-14},${by-12}`} fill={withAlpha(ac,0.2)} stroke={ac} strokeWidth="1.2" opacity="0.6"/>
    </>;
    case 4: return <>
      <path d={`M${L},${T+8} L${cx},${T} L${L+w},${T+8}`} fill={darken(ac,0.1)} opacity={0.8}/>
      {/* Greenhouse row */}
      {[0,1,2].map(i => (
        <path key={i} d={`M${L-38+i*12},${by-10} Q${L-32+i*12},${by-22} ${L-26+i*12},${by-10}`}
              fill={withAlpha(ac,0.18)} stroke={ac} strokeWidth="1" opacity="0.6"/>
      ))}
      {/* Silo cluster */}
      {[0,1].map(i => <rect key={i} x={L-12-i*9} y={T-12+i*2} width={8} height={h+10-i*2} rx={4} fill={darken(ac,0.22)} opacity={0.8}/>)}
      {/* Processing building */}
      <rect x={L-32} y={T+h/3} width={22} height={h*2/3} rx={1} fill={darken(ac,0.3)} opacity={0.7}/>
    </>;
    default: return <>
      {/* Vertical farm tower */}
      <path d={`M${L},${T+8} L${cx},${T} L${L+w},${T+8}`} fill={darken(ac,0.1)} opacity={0.8}/>
      {/* Vertical farm stripes (crop levels) */}
      {[0,1,2,3,4,5,6].map(row => (
        <rect key={row} x={L+2} y={T+10+row*10} width={w-4} height={6} rx={0.5} fill={ac} opacity={0.1+hs(row)*0.08}/>
      ))}
      {/* Large greenhouse cluster */}
      {[0,1,2,3].map(i => (
        <path key={i} d={`M${L-46+i*12},${by-10} Q${L-40+i*12},${by-26} ${L-34+i*12},${by-10}`}
              fill={withAlpha(ac,0.2)} stroke={ac} strokeWidth="1.2" opacity="0.65"/>
      ))}
      {/* 3 silo towers */}
      {[0,1,2].map(i => <rect key={i} x={L-18-i*10} y={T-14+i*2} width={8} height={h+12-i*2} rx={4} fill={darken(ac,0.20+i*0.05)} opacity={0.85}/>)}
    </>;
  }
}

function FinanceDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      <rect x={L+3} y={T+3} width={w-6} height={h-6} rx={0.5} fill={ac} opacity={0.08}/>
      <rect x={L+3} y={T+3} width={w-6} height={4} rx={0.5} fill={ac} opacity={0.3}/>
    </>;
    case 2: return <>
      {/* Classical columns */}
      {[0,1,2,3].map(i => <rect key={i} x={L+3+i*6} y={T+4} width={3} height={h-6} rx={0.5} fill={darken(ac,0.1)} opacity={0.5}/>)}
      <rect x={L+1} y={T+3} width={w-2} height={3} fill={darken(ac,0.05)} opacity={0.7}/>
    </>;
    case 3: return <>
      {[0,1,2].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*9} y={T+4+row*13} width={7} height={10} rx={0.5}
              fill={ac} opacity={0.18} className="window-night"/>
      )))}
      {/* Candlestick chart on top */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={cx-14+i*11} y={T-d/3-10+hs(i)*8} width={4} height={8-hs(i)*4} rx={0.5} fill={i===1?ac:darken(ac,0.1)} opacity={0.8}/>
          <line x1={cx-12+i*11} y1={T-d/3-12+hs(i)*8} x2={cx-12+i*11} y2={T-d/3} stroke={i===1?ac:darken(ac,0.1)} strokeWidth="1" opacity="0.7"/>
        </g>
      ))}
    </>;
    case 4: return <>
      {[0,1,2,3].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*8} y={T+3+row*14} width={6} height={11} rx={0.5}
              fill={ac} opacity={0.16+hs(row+col)*0.06} className="window-night"/>
      )))}
      {/* Glass tip */}
      <path d={`M${L+d/2+w/4},${T-d/3} L${cx+d/2},${T-d/3-22} L${R+d-w/4},${T-d/3} Z`} fill={ac} opacity={0.25}/>
      <line x1={cx+d/2} y1={T-d/3} x2={cx+d/2} y2={T-d/3-22} stroke={ac} strokeWidth="1.5" opacity="0.7"/>
    </>;
    default: return <>
      {[0,1,2,3,4,5,6].map(row => [0,1,2,3].map(col => (
        <rect key={`${row}-${col}`} x={L+1+col*8} y={T+2+row*10} width={6} height={8} rx={0.4}
              fill={ac} opacity={0.13+hs(row*4+col)*0.08} className="window-night"/>
      )))}
      {/* Iconic spire top */}
      <path d={`M${L+d/2+w/4},${T-d/3} L${cx+d/2},${T-d/3-38} L${R+d-w/4},${T-d/3} Z`} fill={ac} opacity={0.22}/>
      <line x1={cx+d/2} y1={T-d/3} x2={cx+d/2} y2={T-d/3-38} stroke={ac} strokeWidth="2" opacity="0.8"/>
      {/* Ticker tape on side */}
      <rect x={R+2} y={T+10} width={d-2} height={h-18} rx={0.5} fill={darken(ac,0.1)} opacity={0.6}/>
      {[0,1,2,3,4,5].map(i => <rect key={i} x={R+3} y={T+13+i*12} width={d-4} height={1.5} rx={0.5} fill={ac} opacity={0.3}/>)}
      <circle cx={cx+d/2} cy={T-d/3-39} r={3} fill={ac} opacity={0.9} className="lev-blink"/>
    </>;
  }
}

function RealestateDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      {/* House shape */}
      <path d={`M${L},${T+8} L${cx},${T} L${L+w},${T+8}`} fill={darken(ac,0.1)} opacity={0.8}/>
      <rect x={cx-3} y={T+8} width={6} height={h-8} rx={0.5} fill={darken(ac,0.2)} opacity={0.6}/>
    </>;
    case 2: return <>
      {[0,1,2].map(row => [0,1].map(col => (
        <rect key={`${row}-${col}`} x={L+4+col*(w/2-2)} y={T+4+row*10} width={w/2-6} height={7} rx={0.5}
              fill={ac} opacity={0.2} className="window-night"/>
      )))}
      {/* Balcony railing strips */}
      {[1,2].map(row => <rect key={row} x={L+2} y={T+3+row*10} width={w-4} height={1} fill={darken(ac,0.1)} opacity={0.4}/>)}
    </>;
    case 3: return <>
      {[0,1,2,3,4].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*10} y={T+4+row*8} width={7} height={6} rx={0.5}
              fill={ac} opacity={0.18} className="window-night"/>
      )))}
      {/* Balconies */}
      {[1,2,3].map(row => <rect key={row} x={L-1} y={T+3+row*8} width={w+2} height={1.5} fill={darken(ac,0.1)} opacity={0.5}/>)}
    </>;
    case 4: return <>
      {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*9} y={T+3+row*9} width={7} height={7} rx={0.5}
              fill={ac} opacity={0.16+hs(row+col)*0.06} className="window-night"/>
      )))}
      {/* Rooftop pool hint */}
      <rect x={L+d/2+2} y={T-d/3-5} width={w/2} height={4} rx={1} fill={ac} opacity={0.3}/>
      {/* Garden stripes */}
      {[0,1].map(i => <rect key={i} x={L+d/2+w/2+4+i*6} y={T-d/3-5} width={4} height={4} rx={1} fill={darken(ac,0.1)} opacity={0.4}/>)}
    </>;
    default: return <>
      {[0,1,2,3,4,5,6,7].map(row => [0,1,2,3].map(col => (
        <rect key={`${row}-${col}`} x={L+1+col*8} y={T+2+row*9} width={6} height={7} rx={0.4}
              fill={ac} opacity={0.14+hs(row*3+col)*0.07} className="window-night"/>
      )))}
      {/* Twin tower crown effect */}
      <path d={`M${L+d/2},${T-d/3} L${L+d/2+4},${T-d/3-18} L${L+d/2+8},${T-d/3}`} fill={ac} opacity={0.3}/>
      <path d={`M${L+d/2+w-8},${T-d/3} L${L+d/2+w-4},${T-d/3-14} L${L+d/2+w},${T-d/3}`} fill={ac} opacity={0.3}/>
      {/* Full balcony rails across each floor */}
      {[1,2,3,4,5,6,7].map(row => <rect key={row} x={L-1} y={T+1+row*9} width={w+2} height={1} fill={darken(ac,0.1)} opacity={0.35}/>)}
    </>;
  }
}

function EntertainmentDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      <path d={`M${L},${T+6} L${cx},${T} L${R},${T+6}`} fill={ac} opacity={0.5}/>
      {/* Stage footlights */}
      {[0,1,2,3].map(i => <circle key={i} cx={L+4+i*7} cy={by-3} r={1.5} fill={ac} opacity={0.6} className="lev-blink"/>)}
    </>;
    case 2: return <>
      {/* Theater arch */}
      <path d={`M${L+4},${T+h/2} Q${cx},${T+h/4} ${R-4},${T+h/2}`} fill="none" stroke={ac} strokeWidth="2" opacity="0.7"/>
      <rect x={L+3} y={T+4} width={w-6} height={4} rx={0.5} fill={ac} opacity={0.35}/>
      {/* Marquee lights */}
      {[0,1,2,3,4].map(i => <circle key={i} cx={L+3+i*((w-6)/4)} cy={T+2} r={1.2} fill={ac} opacity={0.7} className="lev-blink"/>)}
    </>;
    case 3: return <>
      {/* Cinema facade */}
      <rect x={L+2} y={T+4} width={w-4} height={h/3} rx={0.5} fill={darken(ac,0.15)} opacity={0.6}/>
      {/* Marquee sign */}
      <rect x={L+4} y={T+6} width={w-8} height={5} rx={0.5} fill={ac} opacity={0.4}/>
      {[0,1,2,3,4,5].map(i => <circle key={i} cx={L+5+i*((w-10)/5)} cy={T+9} r={1} fill="white" opacity={0.5} className="lev-blink"/>)}
      {/* Spotlight */}
      <path d={`M${cx},${T+2} L${cx-12},${T-d/3-14} L${cx+12},${T-d/3-14} Z`} fill={ac} opacity={0.12}/>
      <circle cx={cx} cy={T+2} r={2} fill={ac} opacity={0.7} className="lev-blink"/>
    </>;
    case 4: return <>
      {[0,1,2,3].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+3+col*10} y={T+4+row*12} width={8} height={9} rx={0.5}
              fill={ac} opacity={0.2+hs(row+col)*0.07} className="window-night"/>
      )))}
      {/* Rooftop bar awning */}
      <path d={`M${L+d/2},${T-d/3} L${R+d},${T-d/3} L${R+d},${T-d/3+6} L${L+d/2},${T-d/3+6} Z`} fill={ac} opacity={0.35}/>
      {/* Spotlight pair */}
      <path d={`M${L+d/2+4},${T-d/3-2} L${L+d/2-10},${T-d/3-22}`} stroke={ac} strokeWidth="1" opacity="0.4"/>
      <path d={`M${R+d-4},${T-d/3-2} L${R+d+10},${T-d/3-22}`} stroke={ac} strokeWidth="1" opacity="0.4"/>
    </>;
    default: return <>
      {/* Mega arena: curved facade */}
      {[0,1,2,3,4,5].map(row => [0,1,2,3].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*9} y={T+3+row*12} width={7} height={9} rx={0.4}
              fill={ac} opacity={0.13+hs(row*4+col)*0.09} className="window-night"/>
      )))}
      {/* Arena arc roof */}
      <path d={`M${L+d/2+2},${T-d/3} Q${cx+d/2},${T-d/3-30} ${R+d-2},${T-d/3}`} fill={withAlpha(ac,0.15)} stroke={ac} strokeWidth="2" opacity="0.7"/>
      {/* Spotlights sweeping */}
      <path d={`M${L+d/2+4},${T-d/3-2} L${L+d/2-20},${T-d/3-40}`} stroke={ac} strokeWidth="1.5" opacity="0.3"/>
      <path d={`M${R+d-4},${T-d/3-2} L${R+d+20},${T-d/3-40}`} stroke={ac} strokeWidth="1.5" opacity="0.3"/>
      {/* Marquee star */}
      <circle cx={cx+d/2} cy={T-d/3-32} r={3.5} fill={ac} opacity={0.9} className="lev-blink"/>
      {/* Camera flash */}
      <circle cx={L-10} cy={by-18} r={1.5} fill="white" opacity={0.5} className="lev-flash"/>
    </>;
  }
}

function HospitalityDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, R = cx + w/2, T = by - h;
  switch (tier) {
    case 1: return <>
      <path d={`M${L},${T+8} L${cx},${T} L${L+w},${T+8}`} fill={darken(ac,0.1)} opacity={0.7}/>
      <rect x={cx-3} y={T+8} width={6} height={h-8} rx={0.5} fill={darken(ac,0.3)} opacity={0.6}/>
      <rect x={L+3} y={T+12} width={8} height={6} rx={0.5} fill={ac} opacity={0.25} className="window-night"/>
    </>;
    case 2: return <>
      {[0,1,2].map(row => [0,1].map(col => (
        <rect key={`${row}-${col}`} x={L+4+col*(w/2)} y={T+5+row*9} width={w/2-6} height={7} rx={0.5}
              fill={ac} opacity={0.2} className="window-night"/>
      )))}
      <rect x={L+2} y={T+3} width={w-4} height={3} rx={0.5} fill={darken(ac,0.05)} opacity={0.7}/>
    </>;
    case 3: return <>
      {[0,1,2,3,4].map(row => [0,1].map(col => (
        <rect key={`${row}-${col}`} x={L+4+col*(w/2)} y={T+4+row*8} width={w/2-6} height={6} rx={0.5}
              fill={ac} opacity={0.18} className="window-night"/>
      )))}
      {/* Balconies */}
      {[1,2,3,4].map(row => <rect key={row} x={L-2} y={T+3+row*8} width={w+4} height={1} fill={darken(ac,0.1)} opacity={0.5}/>)}
      {/* Pool hint on roof */}
      <rect x={L+d/2+3} y={T-d/3-5} width={12} height={4} rx={1} fill={ac} opacity={0.35}/>
    </>;
    case 4: return <>
      {[0,1,2,3,4,5].map(row => [0,1,2].map(col => (
        <rect key={`${row}-${col}`} x={L+2+col*8} y={T+3+row*10} width={6} height={8} rx={0.5}
              fill={ac} opacity={0.17+hs(row+col)*0.06} className="window-night"/>
      )))}
      {/* Lantern strings */}
      <path d={`M${L-5},${T+h/3} Q${cx},${T+h/4} ${L+w+5},${T+h/3}`} fill="none" stroke={ac} strokeWidth="1" opacity="0.4"/>
      {[0,1,2,3,4].map(i => <circle key={i} cx={L-5+i*((w+10)/4)} cy={T+h/3+2} r={1.5} fill={ac} opacity={0.6} className="lev-blink"/>)}
      {/* Spa dome hint */}
      <path d={`M${L+d/2+2},${T-d/3} Q${cx+d/2},${T-d/3-14} ${R+d-2},${T-d/3}`} fill={withAlpha(ac,0.2)} stroke={ac} strokeWidth="1.2" opacity="0.5"/>
    </>;
    default: return <>
      {[0,1,2,3,4,5,6,7].map(row => [0,1,2,3].map(col => (
        <rect key={`${row}-${col}`} x={L+1+col*8} y={T+2+row*9} width={6} height={7} rx={0.4}
              fill={ac} opacity={0.13+hs(row*3+col)*0.07} className="window-night"/>
      )))}
      {/* Grand hotel crown */}
      <path d={`M${L+d/2+4},${T-d/3} L${cx+d/2},${T-d/3-24} L${R+d-4},${T-d/3}`} fill={ac} opacity={0.22}/>
      {/* Japanese lantern strings at each floor */}
      {[1,2,3,4].map(row => (
        <g key={row}>
          <path d={`M${L-3},${T+row*18} Q${cx},${T+row*18-8} ${L+w+3},${T+row*18}`} fill="none" stroke={ac} strokeWidth="0.8" opacity="0.35"/>
          {[0,1,2,3].map(i => <circle key={i} cx={L-3+i*((w+6)/3)} cy={T+row*18-2} r={1.2} fill={ac} opacity={0.55} className="lev-blink"/>)}
        </g>
      ))}
      <circle cx={cx+d/2} cy={T-d/3-25} r={3} fill={ac} opacity={0.9} className="lev-blink"/>
    </>;
  }
}

// Generic fallback details
function GenericDetails({ tier, cx, by, w, h, d, ac }: { tier:number; cx:number; by:number; w:number; h:number; d:number; ac:string; }) {
  const L = cx - w/2, T = by - h;
  return <>
    {[0,1,2].map(row => [0,1].map(col => (
      <rect key={`${row}-${col}`} x={L+4+col*(w/2-2)} y={T+4+row*(h/4)} width={w/2-6} height={h/4-3} rx={0.5}
            fill={ac} opacity={0.15+hs(row+col+tier)*0.08} className="window-night"/>
    )))}
    {tier >= 3 && <circle cx={cx+d/2} cy={T-d/3-8} r={3} fill={ac} opacity={0.7} className="lev-blink"/>}
  </>;
}

// Master building renderer — picks the right detail function
function Building({ tier, industry, cx, by, accent }: {
  tier: number; industry: IndustryType | ''; cx: number; by: number; accent: string;
}) {
  const ti = Math.min(4, Math.max(0, tier - 1));
  const { w, h, d } = TD[ti];

  // Isometric face colors based on accent
  const fc = darken(accent, 0.72);   // front: darkest
  const tc = darken(accent, 0.62);   // top: slightly lighter
  const rc = darken(accent, 0.80);   // right: darkest

  const props = { tier, cx, by, w, h, d, ac: accent };

  return (
    <IsoBox cx={cx} by={by} w={w} h={h} d={d} fc={fc} tc={tc} rc={rc}>
      {industry === 'tech'          && <TechDetails {...props}/>}
      {industry === 'space'         && <SpaceDetails {...props}/>}
      {industry === 'culinary'      && <CulinaryDetails {...props}/>}
      {industry === 'energy'        && <EnergyDetails {...props}/>}
      {industry === 'fashion'       && <FashionDetails {...props}/>}
      {industry === 'biotech'       && <BiotechDetails {...props}/>}
      {industry === 'media'         && <MediaDetails {...props}/>}
      {industry === 'agri'          && <AgriDetails {...props}/>}
      {industry === 'finance'       && <FinanceDetails {...props}/>}
      {industry === 'realestate'    && <RealestateDetails {...props}/>}
      {industry === 'entertainment' && <EntertainmentDetails {...props}/>}
      {industry === 'hospitality'   && <HospitalityDetails {...props}/>}
      {!industry                    && <GenericDetails {...props}/>}
    </IsoBox>
  );
}

// ---- ANIMATED SCENE ELEMENTS -----------------------------------------------

function WorkerSilhouette({ cx, by, delay, dir = 1, ac }: { cx:number; by:number; delay:number; dir?:number; ac:string; }) {
  return (
    <g className={dir > 0 ? 'walk-right' : 'walk-left'} style={{ animationDelay: `-${delay}s`, animationDuration: '7s', transformOrigin: `${cx}px ${by}px` }}>
      {/* Head */}
      <circle cx={cx} cy={by - 10} r={2.8} fill={ac} opacity={0.6}/>
      {/* Body */}
      <path d={`M${cx-2.5},${by-7} L${cx+2.5},${by-7} L${cx+1.5},${by} L${cx-1.5},${by} Z`} fill={ac} opacity={0.5}/>
      {/* Legs (stride) */}
      <line x1={cx-1} y1={by} x2={cx-3} y2={by+5} stroke={ac} strokeWidth="1.5" opacity={0.45}/>
      <line x1={cx+1} y1={by} x2={cx+3} y2={by+5} stroke={ac} strokeWidth="1.5" opacity={0.45}/>
    </g>
  );
}

function MoneyParticle({ x, y, delay, ac }: { x:number; y:number; delay:number; ac:string; }) {
  return (
    <g className="particle-float" style={{ animationDelay: `-${delay}s`, animationDuration: `${2.4 + hs(delay)*1.2}s` }}>
      <circle cx={x} cy={y} r={2.5} fill={ac} opacity={0.8}/>
      <circle cx={x} cy={y} r={4} fill={ac} opacity={0.2}/>
    </g>
  );
}

function CraneShape({ cx, by, ac }: { cx:number; by:number; ac:string; }) {
  return (
    <g>
      {/* Mast */}
      <rect x={cx-1.5} y={by-48} width={3} height={46} fill={darken(ac,0.3)} opacity={0.9}/>
      {/* Jib */}
      <rect x={cx-1.5} y={by-48} width={32} height={2} fill={darken(ac,0.25)} opacity={0.8}/>
      {/* Counter-jib */}
      <rect x={cx-12} y={by-48} width={12} height={2} fill={darken(ac,0.25)} opacity={0.7}/>
      {/* Hook line (swinging) */}
      <g className="crane-swing" style={{ transformOrigin: `${cx+24}px ${by-48}px` }}>
        <line x1={cx+24} y1={by-46} x2={cx+24} y2={by-28} stroke={darken(ac,0.2)} strokeWidth="1" opacity={0.7}/>
        <rect x={cx+21} y={by-30} width={6} height={4} rx={0.5} fill={darken(ac,0.25)} opacity={0.7}/>
      </g>
    </g>
  );
}

// ---- GROUND PLANE RENDERER -------------------------------------------------
// Receding road grid in perspective — wider at bottom, narrower at top.

function GroundPlane({ accent }: { accent: string; }) {
  // Road surfaces
  const roads = [
    { y: GY + 18, xPad: 20 },
    { y: GY + 38, xPad: 10 },
    { y: GY + 58, xPad:  0 },
  ];
  return (
    <g>
      {/* Earth */}
      <rect x={0} y={GY} width={VB_W} height={VB_H - GY} fill="#060a10"/>
      {/* Ground horizon glow line */}
      <rect x={0} y={GY} width={VB_W} height={2} fill={accent} opacity={0.25}/>
      {/* Receding grid roads */}
      {roads.map((r, i) => (
        <g key={i}>
          <rect x={r.xPad} y={r.y} width={VB_W - r.xPad * 2} height={10 + i * 4} fill="#0a0e16" opacity={0.7}/>
          {/* Road markings */}
          {[40,80,140,200,260,320].map(rx => (
            <rect key={rx} x={rx} y={r.y+4+i*2} width={20} height={1.5} rx={0.5} fill={accent} opacity={0.12}/>
          ))}
        </g>
      ))}
      {/* Sidewalk accents */}
      <line x1={0} y1={GY+17} x2={VB_W} y2={GY+17} stroke={accent} strokeWidth="0.5" opacity="0.1"/>
      <line x1={0} y1={GY+37} x2={VB_W} y2={GY+37} stroke={accent} strokeWidth="0.5" opacity="0.08"/>
    </g>
  );
}

// ---- SKY & ATMOSPHERE -------------------------------------------------------

function SkyLayer({ model, accent }: { model: SM; accent: string; }) {
  const skyColors =
    model.mood === 'boom'  ? { t: '#0b1028', b: '#08111e' } :
    model.mood === 'crash' ? { t: '#110916', b: '#0a0810' } :
                             { t: '#090d1e', b: '#060a14' };

  return (
    <g>
      <defs>
        <linearGradient id="iso-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={skyColors.t}/>
          <stop offset="100%" stopColor={skyColors.b}/>
        </linearGradient>
        {/* Night overlay */}
        <linearGradient id="iso-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#010204" stopOpacity="0.92"/>
          <stop offset="100%" stopColor="#010204" stopOpacity="0.7"/>
        </linearGradient>
        {/* Accent glow radial */}
        <radialGradient id="iso-glow" cx="50%" cy="100%" r="60%">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={VB_W} height={GY} fill="url(#iso-sky)"/>

      {/* Distant city silhouette on horizon */}
      <path
        d={`M0,${GY} L0,${GY-22} L14,${GY-22} L14,${GY-30} L22,${GY-30} L22,${GY-22} L40,${GY-22} L40,${GY-38} L50,${GY-38} L50,${GY-28} L62,${GY-28} L62,${GY-44} L68,${GY-44} L68,${GY-36} L80,${GY-36} L80,${GY-52} L86,${GY-52} L86,${GY-42} L100,${GY-42} L100,${GY-28} L114,${GY-28} L114,${GY-48} L120,${GY-48} L120,${GY-60} L126,${GY-60} L126,${GY-48} L140,${GY-48} L140,${GY-32} L156,${GY-32} L156,${GY-42} L162,${GY-42} L162,${GY-54} L168,${GY-54} L168,${GY-44} L182,${GY-44} L182,${GY-62} L188,${GY-62} L188,${GY-72} L196,${GY-72} L196,${GY-62} L210,${GY-62} L210,${GY-42} L226,${GY-42} L226,${GY-58} L232,${GY-58} L232,${GY-66} L238,${GY-66} L238,${GY-56} L254,${GY-56} L254,${GY-40} L270,${GY-40} L270,${GY-52} L278,${GY-52} L278,${GY-44} L292,${GY-44} L292,${GY-30} L308,${GY-30} L308,${GY-40} L316,${GY-40} L316,${GY-28} L330,${GY-28} L330,${GY-36} L340,${GY-36} L340,${GY-22} L354,${GY-22} L354,${GY-30} L368,${GY-30} L368,${GY-22} L380,${GY-22} L380,${GY} Z`}
        fill={darken(accent, 0.82)}
        opacity={0.55}
      />

      {/* Far horizon glow */}
      <rect x={0} y={GY-3} width={VB_W} height={6} fill={accent} opacity={0.12}/>

      {/* Stars (static — visible at night via CSS) */}
      {Array.from({ length: 28 }, (_, i) => (
        <circle key={i} cx={hs(i*7)*VB_W} cy={hs(i*13)*GY*0.7} r={hs(i*3)*0.8+0.4}
                fill="white" opacity={0.4+hs(i*9)*0.4} className="world-daynight"/>
      ))}

      {/* Day-night overlay */}
      <rect x={0} y={0} width={VB_W} height={GY} fill="url(#iso-night)" className="world-daynight" opacity={0}/>

      {/* Prestige era glow pool under buildings */}
      {model.prestige > 0 && (
        <rect x={0} y={GY - 8} width={VB_W} height={30} fill="url(#iso-glow)"
              opacity={Math.min(0.7, 0.2 + model.prestige * 0.1)}/>
      )}
    </g>
  );
}

// ---- SLOT POSITIONS ---------------------------------------------------------
// Distribute buildings left-to-right, sorted by tier (shorter left, taller right
// for a natural silhouette pyramid). Crowd together as empire grows.

function buildSlots(model: SM): Array<{ cx: number; by: number; tier: number; idx: number }> {
  const startX = 40, endX = VB_W - 28, span = endX - startX;
  const total  = model.totalBuildings;
  if (!total) return [];

  // Expand all tier entries into a flat list
  const entries: { tier: number }[] = [];
  for (const tb of model.tiers) {
    for (let b = 0; b < tb.count; b++) entries.push({ tier: tb.tier });
  }
  // Sort by tier ascending so smaller buildings are on the outer left
  entries.sort((a, b) => a.tier - b.tier);

  const sw = span / total;
  return entries.map((e, i) => {
    const { d } = TD[Math.min(4, e.tier - 1)];
    return {
      cx:   startX + sw * (i + 0.5),
      by:   GY,
      tier: e.tier,
      idx:  i,
    };
  });
}

// ---- CSS KEYFRAMES ----------------------------------------------------------

function LiveStyles() {
  return (
    <style>{`
      @keyframes lev-blink {
        0%,100%{opacity:0.9} 50%{opacity:0.2}
      }
      @keyframes lev-spin {
        to{transform:rotate(360deg)}
      }
      @keyframes lev-flame {
        0%,100%{opacity:0.7;transform:scaleY(1)} 50%{opacity:1;transform:scaleY(1.3)}
      }
      @keyframes lev-flash {
        0%,100%{opacity:0} 5%,15%{opacity:0.9} 10%{opacity:0.4}
      }
      @keyframes lev-smoke {
        0%{transform:translateY(0) scale(1);opacity:0.3}
        100%{transform:translateY(-18px) scale(2.5);opacity:0}
      }
      @keyframes lev-aura {
        0%,100%{opacity:0.55;r:4} 50%{opacity:0.9;r:5.5}
      }
      @keyframes lev-electron {
        0%{transform:translateX(-40px)} 100%{transform:translateX(40px)}
      }
      .lev-blink   { animation: lev-blink  1.6s ease-in-out infinite; }
      .lev-spin    { animation: lev-spin   2.4s linear infinite; transform-box:fill-box; transform-origin:center; }
      .lev-flame   { animation: lev-flame  0.8s ease-in-out infinite; }
      .lev-flash   { animation: lev-flash  3.5s ease-in-out infinite; }
      .lev-smoke   { animation: lev-smoke  2s ease-out infinite; }
      .lev-aura    { animation: lev-aura   2.2s ease-in-out infinite; }
      .walk-right  { animation: walk-right 7s linear infinite; }
      .walk-left   { animation: walk-left  7s linear infinite; }
      .particle-float { animation: particle-float 2.6s ease-out infinite; }
      .crane-swing    { animation: crane-swing 3.5s ease-in-out infinite; }
      .window-night   { animation: window-night 240s ease-in-out infinite; }
      .world-daynight { animation: daynight 240s ease-in-out infinite; }
    `}</style>
  );
}

// ---- MAIN COMPONENT ---------------------------------------------------------

export default function LiveEmpireView({ className = '' }: { className?: string }) {
  const { state } = useGame();
  const industry   = getIndustry(state);
  const income     = incomePerSec(state);
  const reach      = reachPerSec(state);
  const price      = marketPrice(state);
  const accent     = state.setup?.accent ?? '#34d399';
  const reduce     = useReducedMotion();

  const model = useMemo<SM>(() => {
    const id = industry?.id ?? '';
    const tiers = [1, 2, 3, 4, 5].map(tier => {
      const owned = id ? ownedInTier(state, id, tier) : 0;
      return { tier, count: tierUnlocked(state, tier) ? bfo(owned) : 0, owned };
    });
    const total  = tiers.reduce((s, t) => s + t.count, 0);
    const mood: SM['mood'] = price >= 1.12 ? 'boom' : price <= 0.9 ? 'crash' : 'normal';
    const social = getChannel(state, 'social');
    return {
      tiers, totalBuildings: total,
      workerCount: Math.min(12, Math.max(total > 0 ? 2 : 0, Math.round(total * 0.9))),
      coinCount:   density(income, 10),
      waveCount:   Math.min(4, density(reach, 4)),
      heartCount:  social.level > 0 ? density(reach + 5, 6) : 0,
      mood, prestige: state.prestigeCount,
      socialActive: social.level > 0,
      hasEmpire: total > 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    industry?.id, state.facilities, state.prestigeCount,
    price >= 1.12, price <= 0.9,
    getChannel(state, 'social').level,
    density(income, 10), Math.min(4, density(reach, 4)),
  ]);

  const slots  = useMemo(() => buildSlots(model), [model]);
  const moodIcon  = model.mood === 'boom' ? '🌅' : model.mood === 'crash' ? '🌑' : '🌆';
  const moodLabel = model.mood === 'boom' ? 'Boom'  : model.mood === 'crash' ? 'Downturn' : 'Steady';
  const indId  = industry?.id ?? '';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl glass ${className}`}
      style={{
        // CSS perspective transform: top appears fractionally smaller → real aerial depth
        perspective: '700px',
        perspectiveOrigin: '50% 100%',
      }}
    >
      {!reduce && <LiveStyles />}

      <div style={{ transform: 'rotateX(4deg)', transformOrigin: 'center bottom' }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          className="block"
          role="img"
          aria-label="Live isometric view of your empire"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Sky, horizon, stars */}
          <SkyLayer model={model} accent={accent} />

          {/* Ground plane + roads */}
          <GroundPlane accent={accent} />

          {/* Buildings — sorted front-to-back (lower y = further back in iso) */}
          {slots.map((slot, i) => (
            <Building
              key={i}
              tier={slot.tier}
              industry={indId as IndustryType | ''}
              cx={slot.cx}
              by={slot.by}
              accent={accent}
            />
          ))}

          {/* Construction crane on the rightmost-unfinished building */}
          {model.totalBuildings > 0 && !reduce && (
            <CraneShape
              cx={slots.length > 0 ? slots[slots.length - 1].cx + 18 : VB_W - 40}
              by={GY}
              ac={accent}
            />
          )}

          {/* Workers moving along ground */}
          {!reduce && Array.from({ length: model.workerCount }, (_, i) => (
            <WorkerSilhouette
              key={i}
              cx={30 + (hs(i * 7) * (VB_W - 60))}
              by={GY + 12 + (i % 3) * 14}
              delay={hs(i * 11) * 6}
              dir={i % 2 === 0 ? 1 : -1}
              ac={accent}
            />
          ))}

          {/* Money / coin particles rising from buildings */}
          {!reduce && model.coinCount > 0 && slots
            .filter((_, i) => i % Math.max(1, Math.floor(slots.length / model.coinCount)) === 0)
            .slice(0, model.coinCount)
            .map((slot, i) => (
              <MoneyParticle
                key={i}
                x={slot.cx + hs(i * 7) * 10 - 5}
                y={slot.by - TD[Math.min(4, slot.tier - 1)].h - 8}
                delay={hs(i * 13) * 3}
                ac={accent}
              />
            ))}
        </svg>
      </div>

      {/* Mood + prestige badge */}
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px] font-mono text-muted">
        <span>{moodIcon}</span>
        <span>{moodLabel}</span>
        {model.prestige > 0 && (
          <span style={{ color: accent }}>· ✦{model.prestige}</span>
        )}
      </div>
    </div>
  );
}
