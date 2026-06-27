// ============================================================================
// LiveEmpireView  -  8 industry-specific animated SVG micro-worlds.
// Each industry renders a distinct scene with unique micro-detail.
// Performance contract: all animation via CSS keyframes, no per-tick setState.
// ============================================================================

import { useMemo } from 'react';
import { useGame } from '../../game/GameContext';
import {
  getIndustry, incomePerSec, marketPrice, reachPerSec,
  tierUnlocked, getChannel,
} from '../../game/GameContext';
import type { GameState } from '../../game/types';

// ---- Constants ---------------------------------------------------------------
const VB_W = 380;
const VB_H = 300;
const GY = 232; // ground y-baseline
const MAX_BPT = 7;
const HQ_X = 40;

// ---- Types -------------------------------------------------------------------
interface TB { tier: number; count: number; owned: number; }
interface SM {
  tiers: TB[]; totalBuildings: number;
  workerCount: number; coinCount: number; waveCount: number; heartCount: number;
  mood: 'boom' | 'crash' | 'normal';
  prestige: number; socialActive: boolean; hasEmpire: boolean;
}
interface SP { model: SM; accent: string; }

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
  if (owned <= 0) return 0;
  return Math.max(1, Math.min(MAX_BPT, Math.round(Math.sqrt(owned) * 1.3)));
}
function h(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

// Shared building slot positions (left-to-right after HQ zone)
function slots(model: SM): Array<{ cx: number; w: number; tier: number; idx: number }> {
  const startX = 72, endX = VB_W - 14, span = endX - startX;
  const total = model.totalBuildings;
  if (!total) return [];
  const sw = span / total;
  const out: ReturnType<typeof slots> = [];
  let drawn = 0;
  for (const tb of model.tiers) {
    for (let b = 0; b < tb.count; b++) {
      const w = Math.min(32, 12 + tb.tier * 4);
      out.push({ cx: startX + sw * (drawn + 0.5), w, tier: tb.tier, idx: drawn });
      drawn++;
    }
  }
  return out;
}

// ---- Main component ----------------------------------------------------------

export default function LiveEmpireView({ className = '' }: { className?: string }) {
  const { state } = useGame();
  const industry = getIndustry(state);
  const income = incomePerSec(state);
  const reach = reachPerSec(state);
  const price = marketPrice(state);
  const accent = state.setup?.accent ?? '#34d399';

  const model = useMemo<SM>(() => {
    const id = industry?.id ?? '';
    const tiers = [1,2,3,4,5].map(tier => {
      const owned = id ? ownedInTier(state, id, tier) : 0;
      return { tier, count: tierUnlocked(state, tier) ? bfo(owned) : 0, owned };
    });
    const total = tiers.reduce((s, t) => s + t.count, 0);
    const mood: SM['mood'] = price >= 1.12 ? 'boom' : price <= 0.9 ? 'crash' : 'normal';
    const social = getChannel(state, 'social');
    return {
      tiers, totalBuildings: total,
      workerCount: Math.min(12, Math.max(total > 0 ? 2 : 0, Math.round(total * 0.9))),
      coinCount: density(income, 10),
      waveCount: Math.min(4, density(reach, 4)),
      heartCount: social.level > 0 ? density(reach + 5, 6) : 0,
      mood, prestige: state.prestigeCount,
      socialActive: social.level > 0,
      hasEmpire: total > 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry?.id, state.facilities, state.prestigeCount,
      price >= 1.12, price <= 0.9,
      getChannel(state, 'social').level,
      density(income, 10), Math.min(4, density(reach, 4))]);

  type SceneFn = (p: SP) => JSX.Element | null;
  const SCENES: Record<string, SceneFn> = {
    tech: TechScene, space: SpaceScene, culinary: CulinaryScene,
    energy: EnergyScene, fashion: FashionScene, biotech: BiotechScene,
    media: MediaScene, agri: AgriScene,
  };
  const Scene: SceneFn = (industry?.id && SCENES[industry.id]) ? SCENES[industry.id] : GenericScene;
  const moodIcon = model.mood === 'boom' ? '🌅' : model.mood === 'crash' ? '🌑' : '🌆';
  const moodLabel = model.mood === 'boom' ? 'Boom' : model.mood === 'crash' ? 'Downturn' : 'Steady';

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-[#232c3e] bg-[#0e1420] ${className}`}
         style={{ ['--lev-accent' as string]: accent }}>
      <LiveStyles />
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block"
           role="img" aria-label="Live view of your empire" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="lev-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <filter id="lev-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>
        <Scene model={model} accent={accent} />
      </svg>
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#070b12]/70 px-2 py-0.5 text-[10px] font-mono text-muted backdrop-blur">
        <span>{moodIcon}</span>
        <span>{moodLabel}</span>
        {model.prestige > 0 && <span className="text-[var(--lev-accent)]">· ✦{model.prestige}</span>}
      </div>
    </div>
  );
}

// =============================================================================
// TECH  -  server rooms, circuit traces, data packets, satellite dish
// =============================================================================
function TechScene({ model, accent }: SP) {
  const bld = slots(model);
  const sky = model.mood === 'boom' ? { t: '#0d1035', b: '#0a0e22' }
            : model.mood === 'crash' ? { t: '#100818', b: '#0b0b1a' }
            : { t: '#0b0f22', b: '#080c18' };
  return (
    <g>
      {/* Sky */}
      <defs>
        <linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky.t}/><stop offset="100%" stopColor={sky.b}/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#t-sky)"/>

      {/* Floating binary digits */}
      {['0','1','01','10','1','0','11','00','1','0'].map((ch, i) => (
        <text key={i} x={20 + (i * 41) % (VB_W - 30)} y={15 + (i * 23) % 110}
              fill={accent} opacity={0.07 + (i%4)*0.018} fontSize="9"
              fontFamily="monospace" className="lev-bin"
              style={{ animationDelay: `-${i * 1.3}s`, animationDuration: `${14 + (i%5)*3}s` }}>
          {ch}
        </text>
      ))}

      {/* Network nodes in sky (connected dots) */}
      {[[60,40],[130,25],[230,55],[300,30],[350,60],[170,70]].map(([nx,ny],i) => (
        <g key={i}>
          <circle cx={nx} cy={ny} r={2} fill={accent} opacity={0.18}/>
          {i < 5 && <line x1={nx} y1={ny} x2={60+(((i+1)*41)%(VB_W-30))} y2={15+((i+1)*23)%110}
                          stroke={accent} strokeWidth="0.5" opacity="0.07"/>}
        </g>
      ))}

      {/* Prestige glow */}
      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.6} ry={110}
                 fill="url(#lev-glow)" opacity={Math.min(0.7, 0.25 + model.prestige * 0.1)} className="lev-aura"/>
      )}

      {/* Ground */}
      <rect x="0" y={GY} width={VB_W} height={VB_H - GY} fill="#080d14"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.3"/>

      {/* Circuit traces along ground */}
      {[238, 244, 250].map((cy, ri) => (
        <g key={ri}>
          <line x1="72" y1={cy} x2={VB_W-10} y2={cy} stroke={accent} strokeWidth="0.7" opacity={0.12 + ri*0.04}/>
          {[110,170,230,290,340].map((vx, vi) => (
            <circle key={vi} cx={vx} cy={cy} r="2" fill={accent} opacity="0.3"/>
          ))}
        </g>
      ))}
      {/* Electrons on circuit */}
      {Array.from({length: 5}).map((_,i) => (
        <circle key={i} cy={238 + (i%3)*6} r="1.5" fill="#a78bfa" opacity="0.9"
                className="lev-electron" style={{ animationDelay: `-${i*0.55}s`, animationDuration: `${3+i*0.4}s` }}/>
      ))}

      {/* Server rack buildings */}
      {bld.map((s, i) => {
        const bh = 22 + s.tier * 22 + (h(s.idx * 7 + s.tier) - 0.5) * 8;
        const by = GY - bh;
        const rows = Math.max(1, Math.floor(bh / 9));
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin: `${s.cx}px ${GY}px` }}>
            <rect x={s.cx - s.w/2} y={by} width={s.w} height={bh} rx="2"
                  fill="#0d1420" stroke={accent} strokeWidth={s.tier >= 3 ? 1.2 : 0.8} strokeOpacity="0.6"/>
            {s.tier >= 3 && <rect x={s.cx - s.w/2} y={by} width={s.w} height="4" fill={accent} opacity="0.7"/>}
            {Array.from({length: rows}).map((_,r) => {
              if (by + 5 + r*9 > GY - 5) return null;
              const lit = h(s.tier*23 + r*11 + s.idx) > 0.38;
              const col = r%3===0 ? '#10b981' : r%3===1 ? accent : '#3b82f6';
              return <rect key={r} x={s.cx-s.w/2+2} y={by+5+r*9} width={s.w-4} height="3.5" rx="1"
                           fill={lit ? col : '#111827'} opacity={lit ? 0.85 : 0.35}
                           className={lit && r%4===0 ? 'lev-blink' : undefined}/>;
            })}
            {s.tier >= 4 && <line x1={s.cx} y1={by} x2={s.cx} y2={by-10} stroke={accent} strokeWidth="1.3"/>}
          </g>
        );
      })}

      {/* HQ: glass server tower */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin: `${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-13} y={GY-105} width="26" height="105" rx="3"
                fill="#101828" stroke={accent} strokeWidth="1.4"/>
          <rect x={HQ_X-13} y={GY-105} width="26" height="5" fill={accent}/>
          {/* LED facade stripes */}
          {[0,1,2,3,4,5,6,7].map(r => (
            <rect key={r} x={HQ_X-10} y={GY-96+r*12} width="20" height="4" rx="1"
                  fill={r%3===0?'#10b981':r%3===1?accent:'#3b82f6'} opacity="0.7"
                  className="lev-window" style={{ animationDelay: `${r*280}ms` }}/>
          ))}
          {/* Satellite dish */}
          <line x1={HQ_X+3} y1={GY-105} x2={HQ_X+14} y2={GY-116} stroke={accent} strokeWidth="1.5"/>
          <path d={`M${HQ_X+8},${GY-120} A9,9 0 0,1 ${HQ_X+22},${GY-110}`}
                fill="none" stroke={accent} strokeWidth="1.8"/>
          <circle cx={HQ_X+15} cy={GY-115} r="1.8" fill={accent} className="lev-beacon"/>
          <circle cx={HQ_X} cy={GY-108} r="28" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* Workers (engineers) */}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => {
        const wy = GY - 5 - (i%3)*4;
        const dur = 6 + (i%5)*1.6;
        return <circle key={i} cy={wy} r="2.3" fill={i%2===0?accent:'#6b7280'}
                       className={i%3===0?'lev-walk-rev':'lev-walk'}
                       style={{ animationDuration: `${dur}s`, animationDelay: `-${(i/Math.max(1,model.workerCount))*dur}s` }}/>;
      })}

      {/* Data packets (particles) */}
      {Array.from({length: model.coinCount}).map((_,i) => {
        const px = 75 + (i*79)%(VB_W-100);
        const dur = 2.4 + (i%4)*0.5;
        return <rect key={i} x={px} y={GY-20} width="8" height="4" rx="1"
                     fill={accent} opacity="0.9" className="lev-coin"
                     style={{ animationDuration: `${dur}s`, animationDelay: `-${(i/Math.max(1,model.coinCount))*dur}s` }}/>;
      })}

      {/* Network arcs between buildings */}
      {bld.length >= 2 && bld.slice(0,-1).map((s, i) => {
        if (i % 3 !== 0) return null;
        const next = bld[i+1];
        const midX = (s.cx + next.cx)/2;
        const arcH = GY - 80 - (i%2)*20;
        return <path key={i} d={`M${s.cx},${GY-22+s.tier*22} Q${midX},${arcH} ${next.cx},${GY-22+next.tier*22}`}
                     fill="none" stroke={accent} strokeWidth="0.6" strokeOpacity="0.22" strokeDasharray="4 3"
                     className="lev-dash"/>;
      })}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-28} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="monospace">
          Build your first server to boot the grid
        </text>
      )}
    </g>
  );
}

// =============================================================================
// SPACE  -  stars, orbiting satellite, launch pad, rocket exhaust
// =============================================================================
function SpaceScene({ model, accent }: SP) {
  const bld = slots(model);
  return (
    <g>
      <defs>
        <radialGradient id="sp-nebula" cx="70%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#1a0a3a" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#020308" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Deep space sky */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="#020308"/>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#sp-nebula)"/>

      {/* Stars */}
      {Array.from({length:28}).map((_,i) => (
        <circle key={i} cx={(i*53+11)%VB_W} cy={5+((i*37)%145)} r={0.5+(i%4)*0.45}
                fill="#e7ecf5" opacity={0.3+(i%5)*0.13} className="lev-star"
                style={{ animationDelay: `${(i%6)*0.5}s`, animationDuration: `${2.8+(i%4)*0.7}s` }}/>
      ))}

      {/* Moon crescent (upper right) */}
      <circle cx={VB_W-40} cy={38} r={18} fill="#c5cfe8" opacity="0.18"/>
      <circle cx={VB_W-32} cy={34} r={15} fill="#020308"/>

      {/* Saturn-like planet (faint) */}
      <ellipse cx={VB_W-80} cy={90} rx={16} ry={10} fill="#1a2040" opacity="0.5"/>
      <ellipse cx={VB_W-80} cy={90} rx={26} ry={5} fill="none" stroke="#2a3060" strokeWidth="2" opacity="0.35"/>

      {/* Aurora at horizon */}
      {model.mood === 'boom' && (
        <rect x="0" y={GY-40} width={VB_W} height="40"
              fill="none" stroke="#34d399" strokeWidth="0" opacity="0.12"
              style={{ background: 'linear-gradient(transparent, rgba(52,211,153,0.08))' }}/>
      )}

      {/* Prestige aura */}
      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.55} ry={100}
                 fill="url(#lev-glow)" opacity={Math.min(0.7, 0.2+model.prestige*0.1)} className="lev-aura"/>
      )}

      {/* Ground - launch complex concrete */}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#0d1018"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.25"/>
      {/* Concrete markings */}
      {[85,140,200,260,320].map(lx => (
        <line key={lx} x1={lx} y1={GY} x2={lx} y2={GY+12} stroke="#1a2030" strokeWidth="1"/>
      ))}

      {/* Buildings: hangars + VAB-style structures */}
      {bld.map((s, i) => {
        const bh = 20 + s.tier * 24 + (h(s.idx*9+s.tier)-0.5)*10;
        const by = GY - bh;
        const bw = s.w * (s.tier === 1 ? 1.6 : 1);
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin: `${s.cx}px ${GY}px` }}>
            <rect x={s.cx-bw/2} y={by} width={bw} height={bh} rx="2"
                  fill="#0d1525" stroke={accent} strokeWidth="0.8" strokeOpacity="0.5"/>
            {/* Control windows */}
            {Array.from({length: Math.min(3, Math.floor(bh/22))}).map((_,r) => (
              <rect key={r} x={s.cx-bw/2+3} y={by+6+r*18} width={bw-6} height="8" rx="2"
                    fill={accent} opacity={0.12+r*0.06} className="lev-window"
                    style={{ animationDelay: `${r*400+i*200}ms` }}/>
            ))}
            {/* Gantry arm on tall tiers */}
            {s.tier >= 4 && (
              <>
                <line x1={s.cx-bw/2} y1={by+10} x2={s.cx-bw/2-14} y2={by+10} stroke={accent} strokeWidth="1.5" opacity="0.6"/>
                <line x1={s.cx-bw/2-14} y1={by+10} x2={s.cx-bw/2-14} y2={by+30} stroke={accent} strokeWidth="1" opacity="0.5"/>
              </>
            )}
            {s.tier >= 3 && (
              <line x1={s.cx} y1={by} x2={s.cx} y2={by-15} stroke={accent} strokeWidth="1.2"/>
            )}
          </g>
        );
      })}

      {/* HQ: VAB-style tall assembly building */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin: `${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-14} y={GY-115} width="28" height="115" rx="3"
                fill="#0e1a2e" stroke={accent} strokeWidth="1.4"/>
          {/* Hazard stripes */}
          {[0,1,2].map(s => (
            <rect key={s} x={HQ_X-14} y={GY-115+s*18} width="28" height="6"
                  fill={accent} opacity={s===1?0.4:0.15}/>
          ))}
          {/* Launch pad at base */}
          <rect x={HQ_X-22} y={GY-8} width="44" height="8" rx="2" fill="#151e30"/>
          {/* Rocket silhouette on pad */}
          <rect x={HQ_X-4} y={GY-40} width="8" height="32" rx="3" fill="#c5cfe8" opacity="0.55"/>
          <polygon points={`${HQ_X-4},${GY-40} ${HQ_X+4},${GY-40} ${HQ_X},${GY-52}`} fill={accent} opacity="0.6"/>
          {/* Exhaust glow */}
          <ellipse cx={HQ_X} cy={GY-8} rx="6" ry="3" fill="#fb923c" opacity="0.4" className="lev-exhaust"/>
          <circle cx={HQ_X} cy={GY-10} r="26" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* Orbiting satellite (SMIL rotate around sky center) */}
      {model.hasEmpire && (
        <g>
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${VB_W/2} 58`} to={`360 ${VB_W/2} 58`}
            dur="12s" repeatCount="indefinite"/>
          {/* Body centered at (190, 4) — 54 px above orbit center (190, 58) */}
          <rect x={VB_W/2-24} y={0} width="48" height="8" rx="2" fill="#1a2a40" stroke={accent} strokeWidth="1"/>
          <rect x={VB_W/2-6}  y={-2} width="12" height="12" rx="2" fill="#0e1a2e" stroke={accent} strokeWidth="1.2"/>
          {/* Solar panels */}
          <rect x={VB_W/2-22} y={2} width="8" height="4" fill="#fbbf24" opacity="0.8"/>
          <rect x={VB_W/2+14} y={2} width="8" height="4" fill="#fbbf24" opacity="0.8"/>
        </g>
      )}

      {/* Tracking dish */}
      <g className="sp-dish" style={{ transformOrigin: `${VB_W-55}px ${GY}px` }}>
        <line x1={VB_W-55} y1={GY} x2={VB_W-55} y2={GY-18} stroke="#546282" strokeWidth="1.5"/>
        <path d={`M${VB_W-64},${GY-22} A14,14 0 0,1 ${VB_W-46},${GY-22}`} fill="#0d1525" stroke={accent} strokeWidth="1.5"/>
        <circle cx={VB_W-55} cy={GY-22} r="2" fill={accent} opacity="0.6"/>
      </g>

      {/* Exhaust particles from pad */}
      {Array.from({length: model.coinCount}).map((_,i) => {
        const px = HQ_X - 8 + (i*11)%16;
        return <circle key={i} cx={px} cy={GY-8} r="2" fill="#fb923c" opacity="0.7"
                       className="lev-coin" style={{ animationDuration: `${1.8+(i%3)*0.6}s`, animationDelay: `-${(i/Math.max(1,model.coinCount))*2}s` }}/>;
      })}

      {/* Workers (astronauts) */}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => {
        const wy = GY - 7 - (i%3)*3;
        return <circle key={i} cy={wy} r="2.5" fill={i%2===0?accent:'#c5cfe8'}
                       className={i%3===0?'lev-walk-rev':'lev-walk'}
                       style={{ animationDuration: `${7+(i%4)*1.8}s`, animationDelay: `-${i*0.9}s` }}/>;
      })}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-28} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="monospace">
          T-minus waiting for your first launch
        </text>
      )}
    </g>
  );
}

// =============================================================================
// CULINARY  -  warm restaurant district, string lights, steam, scooter
// =============================================================================
function CulinaryScene({ model, accent }: SP) {
  const bld = slots(model);
  const skyT = model.mood === 'boom' ? '#1f0d04' : model.mood === 'crash' ? '#0d0806' : '#160c05';
  const skyB = model.mood === 'boom' ? '#2d160a' : model.mood === 'crash' ? '#100a07' : '#1e1208';
  return (
    <g>
      <defs>
        <linearGradient id="cu-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyT}/><stop offset="100%" stopColor={skyB}/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#cu-sky)"/>

      {/* Evening stars */}
      {Array.from({length:12}).map((_,i) => (
        <circle key={i} cx={(i*67+20)%VB_W} cy={8+(i*29)%90} r={0.6+(i%3)*0.3}
                fill="#ffcc80" opacity="0.25" className="lev-star" style={{ animationDelay:`${i*0.5}s` }}/>
      ))}

      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.6} ry={100}
                 fill="url(#lev-glow)" opacity={Math.min(0.6,0.2+model.prestige*0.1)} className="lev-aura"/>
      )}

      {/* Ground - warm stone street */}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#0e0a06"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.3"/>
      {/* Cobblestone dots */}
      {Array.from({length:18}).map((_,i) => (
        <circle key={i} cx={20+(i*21)%(VB_W-20)} cy={GY+8+(i%3)*7} r="3" fill="#1a1208" opacity="0.6"/>
      ))}

      {/* Restaurant buildings */}
      {bld.map((s, i) => {
        const bh = 28 + s.tier * 18 + (h(s.idx*5+s.tier)-0.5)*8;
        const by = GY - bh;
        const bw = s.w + 4;
        const warmGlow = `rgba(255,${120+s.tier*20},40,0.12)`;
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin: `${s.cx}px ${GY}px` }}>
            {/* Building body */}
            <rect x={s.cx-bw/2} y={by} width={bw} height={bh} rx="2"
                  fill="#160e08" stroke="#3d2410" strokeWidth="1"/>
            {/* Warm window glow */}
            <rect x={s.cx-bw/2+2} y={by+10} width={bw-4} height={bh-18} rx="1" fill={warmGlow}/>
            {/* Large restaurant window */}
            <rect x={s.cx-bw/2+3} y={by+8} width={bw-6} height={bh/2} rx="2"
                  fill="#ff7020" opacity="0.10" className="lev-window" style={{ animationDelay:`${i*300}ms` }}/>
            {/* Awning */}
            <rect x={s.cx-bw/2-3} y={by+bh/2+6} width={bw+6} height="5" rx="1"
                  fill={accent} opacity="0.55"/>
            {/* Door */}
            <rect x={s.cx-4} y={GY-14} width="8" height="14" rx="1.5"
                  fill="#0a0704" stroke={accent} strokeWidth="0.8" opacity="0.7"/>
            {/* Outdoor table */}
            {i%2===0 && <ellipse cx={s.cx+bw/2+8} cy={GY-6} rx="6" ry="2" fill="#3d2410" opacity="0.6"/>}
            {/* Kitchen flame in upper window */}
            {s.tier >= 2 && (
              <text x={s.cx} y={by+18} textAnchor="middle" fontSize="7" className="lev-flame" style={{ animationDelay:`${i*200}ms` }}>🔥</text>
            )}
          </g>
        );
      })}

      {/* HQ: grand restaurant */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin: `${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-16} y={GY-105} width="32" height="105" rx="3"
                fill="#1a0e08" stroke="#5d3418" strokeWidth="1.5"/>
          {/* Warm facade glow */}
          <rect x={HQ_X-14} y={GY-95} width="28" height="80" rx="2" fill="rgba(255,100,20,0.08)"/>
          {/* Neon sign bar */}
          <rect x={HQ_X-14} y={GY-105} width="28" height="6" fill={accent} opacity="0.8"/>
          {/* Large front window */}
          <rect x={HQ_X-10} y={GY-85} width="20" height="30" rx="2"
                fill="#ff7020" opacity="0.14" className="lev-window" style={{ animationDelay:'200ms' }}/>
          {/* Awning */}
          <rect x={HQ_X-20} y={GY-56} width="40" height="6" rx="1" fill={accent} opacity="0.6"/>
          <circle cx={HQ_X} cy={GY-60} r="28" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* String lights between buildings */}
      {model.hasEmpire && (
        <g>
          <line x1="55" y1={GY-50} x2={VB_W-10} y2={GY-50}
                stroke="#3d2410" strokeWidth="0.8" opacity="0.5"/>
          {Array.from({length:16}).map((_,i) => (
            <circle key={i} cx={58+(i*(VB_W-68)/15)} cy={GY-50+(i%3)-1} r="2.2"
                    fill="#fbbf24" opacity="0.7" className="lev-beacon" style={{ animationDelay:`${i*160}ms` }}/>
          ))}
        </g>
      )}

      {/* Steam puffs */}
      {Array.from({length: Math.min(model.coinCount+1, 6)}).map((_,i) => {
        const sx = 90 + (i*63)%(VB_W-120);
        return <text key={i} x={sx} y={GY-25} textAnchor="middle" fontSize="10"
                     className="lev-steam" opacity="0.5"
                     style={{ animationDelay: `-${i*0.9}s`, animationDuration: `${3+i*0.4}s` }}>〇</text>;
      })}

      {/* Delivery scooter */}
      {model.hasEmpire && (
        <g className="lev-scooter">
          <rect x={0} y={GY-11} width="18" height="8" rx="3" fill="#2d1a08"/>
          <circle cx={4} cy={GY-4} r="4" fill="#1a0e06" stroke={accent} strokeWidth="1"/>
          <circle cx={14} cy={GY-4} r="4" fill="#1a0e06" stroke={accent} strokeWidth="1"/>
          <rect x={2} y={GY-18} width="10" height="7" rx="2" fill={accent} opacity="0.7"/>
        </g>
      )}

      {/* Workers (waitstaff with trays) */}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => (
        <circle key={i} cy={GY-6-(i%3)*3} r="2.2" fill={i%2===0?accent:'#8a94a8'}
                className={i%3===0?'lev-walk-rev':'lev-walk'}
                style={{ animationDuration:`${6+(i%5)*1.4}s`, animationDelay:`-${i*0.8}s` }}/>
      ))}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-30} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="sans-serif">
          Open your first stall to light the street
        </text>
      )}
    </g>
  );
}

// =============================================================================
// ENERGY  -  wind turbines, power lines, solar panels, energy flow
// =============================================================================
function EnergyScene({ model, accent }: SP) {
  const bld = slots(model);
  const skyT = model.mood === 'boom' ? '#0c1a30' : model.mood === 'crash' ? '#12161e' : '#0a1428';
  const skyB = model.mood === 'boom' ? '#162840' : model.mood === 'crash' ? '#191c24' : '#101e38';
  const sunR = model.mood === 'boom' ? 52 : model.mood === 'crash' ? 28 : 40;
  const sunC = model.mood === 'crash' ? '#546282' : model.mood === 'boom' ? '#fbbf24' : '#fde68a';
  return (
    <g>
      <defs>
        <linearGradient id="en-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyT}/><stop offset="100%" stopColor={skyB}/>
        </linearGradient>
        <radialGradient id="en-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={sunC} stopOpacity="0.8"/>
          <stop offset="100%" stopColor={sunC} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#en-sky)"/>

      {/* Sun */}
      <circle cx={VB_W-70} cy={50} r={sunR} fill="url(#en-sun)" className={model.mood==='boom'?'lev-hqpulse':undefined}/>
      <circle cx={VB_W-70} cy={50} r={sunR*0.4} fill={sunC} opacity="0.35"/>

      {/* Sun rays (boom only) */}
      {model.mood === 'boom' && Array.from({length:8}).map((_,i) => {
        const a = (i*45)*Math.PI/180;
        const r1=sunR+8, r2=sunR+22;
        return <line key={i} x1={VB_W-70+Math.cos(a)*r1} y1={50+Math.sin(a)*r1}
                     x2={VB_W-70+Math.cos(a)*r2} y2={50+Math.sin(a)*r2}
                     stroke={sunC} strokeWidth="1.5" opacity="0.35"/>;
      })}

      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.58} ry={100}
                 fill="url(#lev-glow)" opacity={Math.min(0.65,0.2+model.prestige*0.1)} className="lev-aura"/>
      )}

      {/* Ground */}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#0b1018"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.25"/>

      {/* Solar panel array (ground level, left zone) */}
      {Array.from({length: Math.min(6, model.totalBuildings+1)}).map((_,i) => (
        <g key={i} transform={`translate(${76+i*18},${GY-14})`}>
          <rect x="0" y="0" width="14" height="10" rx="1"
                fill="#0a1828" stroke={accent} strokeWidth="0.8" opacity="0.8"/>
          <line x1="7" y1="0" x2="7" y2="10" stroke={accent} strokeWidth="0.5" opacity="0.4"/>
          <rect x="1" y="1" width="12" height="3.5" rx="0.5" fill={accent} opacity="0.08"
                className="lev-shimmer" style={{ animationDelay:`${i*220}ms` }}/>
        </g>
      ))}

      {/* Industrial buildings */}
      {bld.map((s, i) => {
        const bh = 25 + s.tier * 20 + (h(s.idx*11+s.tier)-0.5)*10;
        const by = GY - bh;
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin: `${s.cx}px ${GY}px` }}>
            <rect x={s.cx-s.w/2} y={by} width={s.w} height={bh} rx="2"
                  fill="#0e1620" stroke="#1e2e42" strokeWidth="1"/>
            {/* Stack/chimney */}
            {s.tier >= 2 && (
              <>
                <rect x={s.cx-3} y={by-15} width="6" height="15" rx="1" fill="#0e1620" stroke="#1e2e42" strokeWidth="0.8"/>
                <ellipse cx={s.cx} cy={by-15} rx="5" ry="2.5" fill="#1e2e42" className="lev-exhaust"/>
              </>
            )}
            {/* Control windows */}
            {s.tier >= 3 && Array.from({length:2}).map((_,r) => (
              <rect key={r} x={s.cx-s.w/2+2} y={by+8+r*14} width={s.w-4} height="8" rx="1"
                    fill={accent} opacity="0.18" className="lev-window" style={{ animationDelay:`${r*350+i*200}ms` }}/>
            ))}
            {s.tier >= 4 && (
              <line x1={s.cx} y1={by} x2={s.cx} y2={by-12} stroke={accent} strokeWidth="1.2"/>
            )}
          </g>
        );
      })}

      {/* HQ control tower */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin: `${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-13} y={GY-100} width="26" height="100" rx="2"
                fill="#0e1620" stroke={accent} strokeWidth="1.3"/>
          <rect x={HQ_X-13} y={GY-100} width="26" height="5" fill={accent}/>
          {/* Grid display windows */}
          {[0,1,2,3].map(r => (
            <rect key={r} x={HQ_X-9} y={GY-90+r*18} width="18" height="10" rx="1"
                  fill={r%2===0?accent:'#1e3a5a'} opacity="0.22" className="lev-window"
                  style={{ animationDelay:`${r*300}ms` }}/>
          ))}
          <circle cx={HQ_X} cy={GY-102} r="2.5" fill={accent} className="lev-beacon"/>
          <circle cx={HQ_X} cy={GY-60} r="28" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* Wind turbines (right side) */}
      {Array.from({length: Math.min(3, model.totalBuildings+1)}).map((_,i) => {
        const tx = VB_W - 35 - i*44;
        const th = 45 + i*15;
        const spd = model.mood==='boom' ? 1.8 : model.mood==='crash' ? 5 : 3;
        return (
          <g key={i}>
            {/* Pole */}
            <line x1={tx} y1={GY} x2={tx} y2={GY-th} stroke="#1e2e42" strokeWidth="2.5"/>
            {/* Hub */}
            <circle cx={tx} cy={GY-th} r="4" fill="#0e1620" stroke={accent} strokeWidth="1"/>
            {/* Blades - rotating group */}
            <g className="lev-spin" style={{ transformOrigin:`${tx}px ${GY-th}px`, animationDuration:`${spd}s` }}>
              <line x1={tx} y1={GY-th} x2={tx} y2={GY-th-18-i*4} stroke="#1e2e42" strokeWidth="3"/>
              <line x1={tx} y1={GY-th} x2={tx-15-i*3} y2={GY-th+10+i*2} stroke="#1e2e42" strokeWidth="3"/>
              <line x1={tx} y1={GY-th} x2={tx+15+i*3} y2={GY-th+10+i*2} stroke="#1e2e42" strokeWidth="3"/>
            </g>
          </g>
        );
      })}

      {/* Power line pylons + catenary */}
      {model.totalBuildings >= 3 && (
        <g>
          {[125, 225].map((px, pi) => (
            <g key={pi}>
              <line x1={px} y1={GY} x2={px-6} y2={GY-55} stroke="#1e2e42" strokeWidth="1.5"/>
              <line x1={px} y1={GY} x2={px+6} y2={GY-55} stroke="#1e2e42" strokeWidth="1.5"/>
              <line x1={px-10} y1={GY-52} x2={px+10} y2={GY-52} stroke="#1e2e42" strokeWidth="1"/>
            </g>
          ))}
          {/* Power wire */}
          <path d="M60,175 Q130,195 190,178 Q250,162 310,178" fill="none" stroke="#1e2e42" strokeWidth="0.8"/>
          {/* Energy particles on wire */}
          {Array.from({length: model.coinCount}).map((_,i) => (
            <circle key={i} cy="178" r="2.5" fill={accent} opacity="0.8"
                    className="lev-electron" style={{ animationDelay:`-${i*0.6}s`, animationDuration:`${4+i*0.3}s` }}/>
          ))}
        </g>
      )}

      {/* Workers */}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => (
        <circle key={i} cy={GY-6-(i%3)*4} r="2.2" fill={i%2===0?accent:'#546282'}
                className={i%3===0?'lev-walk-rev':'lev-walk'}
                style={{ animationDuration:`${7+(i%5)*1.6}s`, animationDelay:`-${i*0.9}s` }}/>
      ))}

      {/* Spark particles */}
      {Array.from({length: model.coinCount}).map((_,i) => {
        const px = 80 + (i*73)%(VB_W-100);
        return <text key={i} x={px} y={GY-20} textAnchor="middle" fontSize="9"
                     fill={accent} className="lev-coin"
                     style={{ animationDuration:`${2.2+(i%4)*0.5}s`, animationDelay:`-${i*0.6}s` }}>⚡</text>;
      })}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-30} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="sans-serif">
          Connect your first generator to the grid
        </text>
      )}
    </g>
  );
}

// =============================================================================
// FASHION  -  runway, boutique facades, model silhouettes, camera flashes
// =============================================================================
function FashionScene({ model, accent }: SP) {
  const bld = slots(model);
  return (
    <g>
      <defs>
        <linearGradient id="fa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#180d20"/><stop offset="100%" stopColor="#22122e"/>
        </linearGradient>
        <radialGradient id="fa-spot1" cx="30%" cy="0%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="fa-spot2" cx="70%" cy="0%" r="45%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.08"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#fa-sky)"/>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#fa-spot1)"/>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#fa-spot2)"/>

      {/* Stars / bokeh */}
      {Array.from({length:16}).map((_,i) => (
        <circle key={i} cx={(i*59+15)%VB_W} cy={5+(i*31)%110} r={0.6+(i%4)*0.35}
                fill={i%3===0?accent:'white'} opacity="0.2" className="lev-star" style={{ animationDelay:`${i*0.4}s` }}/>
      ))}

      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.58} ry={90}
                 fill="url(#lev-glow)" opacity={Math.min(0.65,0.2+model.prestige*0.1)} className="lev-aura"/>
      )}

      {/* Runway strip */}
      {model.hasEmpire && (
        <>
          <rect x={VB_W/2-22} y={GY-40} width="44" height="40" fill="#0d0810" opacity="0.7"/>
          {/* Runway footlights */}
          {Array.from({length:8}).map((_,i) => (
            <g key={i}>
              <circle cx={VB_W/2-18} cy={GY-6-i*4} r="1.5" fill={accent} opacity="0.6"
                      className="lev-beacon" style={{ animationDelay:`${i*120}ms` }}/>
              <circle cx={VB_W/2+18} cy={GY-6-i*4} r="1.5" fill={accent} opacity="0.6"
                      className="lev-beacon" style={{ animationDelay:`${i*120+80}ms` }}/>
            </g>
          ))}
        </>
      )}

      {/* Ground */}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#0d080e"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.4"/>

      {/* Boutique buildings */}
      {bld.map((s, i) => {
        const bh = 30 + s.tier * 18 + (h(s.idx*7+s.tier)-0.5)*8;
        const by = GY - bh;
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin: `${s.cx}px ${GY}px` }}>
            <rect x={s.cx-s.w/2} y={by} width={s.w} height={bh} rx="2"
                  fill="#160b1e" stroke="#3d1a50" strokeWidth="1"/>
            {/* Large display window */}
            <rect x={s.cx-s.w/2+2} y={by+8} width={s.w-4} height={bh*0.5} rx="2"
                  fill={accent} opacity="0.10" className="lev-window" style={{ animationDelay:`${i*280}ms` }}/>
            {/* Awning */}
            <rect x={s.cx-s.w/2-2} y={by+bh*0.6} width={s.w+4} height="5" rx="1"
                  fill={accent} opacity="0.45"/>
            {/* Mannequin silhouette in window */}
            {s.tier >= 2 && (
              <>
                <ellipse cx={s.cx} cy={by+16} rx="3" ry="3.5" fill={accent} opacity="0.18"/>
                <rect x={s.cx-2} y={by+19} width="4" height="8" rx="1" fill={accent} opacity="0.14"/>
              </>
            )}
            {s.tier >= 4 && (
              <rect x={s.cx-s.w/2} y={by} width={s.w} height="3" fill={accent} opacity="0.7"/>
            )}
          </g>
        );
      })}

      {/* HQ: grand atelier */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin: `${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-14} y={GY-110} width="28" height="110" rx="3"
                fill="#160b1e" stroke={accent} strokeWidth="1.4"/>
          {/* Neon sign */}
          <rect x={HQ_X-14} y={GY-110} width="28" height="6" fill={accent} opacity="0.9"/>
          {/* Large atelier window */}
          <rect x={HQ_X-10} y={GY-98} width="20" height="35" rx="2"
                fill={accent} opacity="0.12" className="lev-window"/>
          {/* Awning */}
          <rect x={HQ_X-18} y={GY-65} width="36" height="6" rx="1" fill={accent} opacity="0.55"/>
          <circle cx={HQ_X} cy={GY-55} r="28" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* String lights across scene */}
      {model.hasEmpire && (
        <>
          <path d={`M52,${GY-56} Q${VB_W/2},${GY-44} ${VB_W-8},${GY-58}`}
                fill="none" stroke="#3d1a50" strokeWidth="0.7"/>
          {Array.from({length:14}).map((_,i) => {
            const t = i/13;
            const cx = 52+t*(VB_W-60);
            const cy = GY-56+Math.sin(t*Math.PI)*12;
            return <circle key={i} cx={cx} cy={cy} r="2" fill="#fbbf24" opacity="0.7"
                           className="lev-beacon" style={{ animationDelay:`${i*180}ms` }}/>;
          })}
        </>
      )}

      {/* Model silhouettes on runway */}
      {model.hasEmpire && Array.from({length: Math.min(3, model.workerCount)}).map((_,i) => (
        <g key={i}>
          <ellipse cx={0} cy={GY-26} rx="3" ry="3.5" fill="white" opacity="0.4"
                   className={i%2===0?'lev-walk':'lev-walk-rev'}
                   style={{ animationDuration:`${8+i*2}s`, animationDelay:`-${i*2.5}s` }}/>
          <rect x={-2} y={GY-23} width="4" height="12" rx="1" fill="white" opacity="0.3"
                className={i%2===0?'lev-walk':'lev-walk-rev'}
                style={{ animationDuration:`${8+i*2}s`, animationDelay:`-${i*2.5}s` }}/>
        </g>
      ))}

      {/* Camera flashes */}
      {model.coinCount > 0 && Array.from({length: Math.min(3, model.coinCount)}).map((_,i) => (
        <circle key={i} cx={60+(i*130)%(VB_W-80)} cy={GY-80-(i%3)*20} r="18"
                fill="white" opacity="0" className="lev-flash"
                style={{ animationDelay:`${i*1.8}s`, animationDuration:`${4+i}s` }}/>
      ))}

      {/* Sparkle particles */}
      {Array.from({length: model.coinCount}).map((_,i) => {
        const px = 70 + (i*83)%(VB_W-100);
        return <text key={i} x={px} y={GY-22} textAnchor="middle" fontSize="10"
                     fill={accent} className="lev-heart"
                     style={{ animationDuration:`${3.2+(i%4)*0.6}s`, animationDelay:`-${i*0.7}s` }}>✦</text>;
      })}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-30} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="sans-serif">
          Open your atelier to dress the runway
        </text>
      )}
    </g>
  );
}

// =============================================================================
// BIOTECH  -  DNA helix, molecules, lab buildings, bio-dome, cell particles
// =============================================================================
function BiotechScene({ model, accent }: SP) {
  const bld = slots(model);
  return (
    <g>
      <defs>
        <linearGradient id="bt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060e14"/><stop offset="100%" stopColor="#0a161e"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#bt-sky)"/>

      {/* Clinical grid overlay (very subtle) */}
      {Array.from({length:8}).map((_,i) => (
        <line key={i} x1={0} y1={i*30} x2={VB_W} y2={i*30}
              stroke={accent} strokeWidth="0.3" opacity="0.04"/>
      ))}

      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.58} ry={95}
                 fill="url(#lev-glow)" opacity={Math.min(0.65,0.2+model.prestige*0.1)} className="lev-aura"/>
      )}

      {/* Ground */}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#060d10"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.4"/>
      {/* Clean tile lines */}
      {[90,160,230,300].map(tx => (
        <line key={tx} x1={tx} y1={GY} x2={tx} y2={VB_H} stroke="#0d1a20" strokeWidth="0.8"/>
      ))}

      {/* DNA helix rising (background) */}
      {model.hasEmpire && Array.from({length:6}).map((_,i) => {
        const baseY = GY - 20 - i*22;
        const ox1 = Math.sin(i * 1.2) * 12;
        const ox2 = Math.sin(i * 1.2 + Math.PI) * 12;
        return (
          <g key={i} className="lev-dna" style={{ animationDelay:`-${i*0.5}s` }}>
            {/* Two strands */}
            <circle cx={VB_W-38+ox1} cy={baseY} r="3.5" fill={accent} opacity="0.35"/>
            <circle cx={VB_W-38+ox2} cy={baseY} r="3.5" fill="#34d399" opacity="0.3"/>
            {/* Bond line */}
            <line x1={VB_W-38+ox1} y1={baseY} x2={VB_W-38+ox2} y2={baseY}
                  stroke="#2a4a3e" strokeWidth="1" opacity="0.35"/>
          </g>
        );
      })}

      {/* Floating molecule */}
      {model.totalBuildings >= 2 && (
        <g className="lev-spin" style={{ transformOrigin:`${VB_W-90}px 80px`, animationDuration:'12s' }}>
          <circle cx={VB_W-90} cy={80} r="5" fill={accent} opacity="0.35"/>
          {[0,1,2].map(mi => {
            const a = mi*(2*Math.PI/3);
            return (
              <g key={mi}>
                <line x1={VB_W-90} y1={80} x2={VB_W-90+Math.cos(a)*16} y2={80+Math.sin(a)*16}
                      stroke={accent} strokeWidth="1" opacity="0.25"/>
                <circle cx={VB_W-90+Math.cos(a)*16} cy={80+Math.sin(a)*16} r="3.5"
                        fill="#34d399" opacity="0.3"/>
              </g>
            );
          })}
        </g>
      )}

      {/* Lab buildings */}
      {bld.map((s, i) => {
        const bh = 28 + s.tier * 20 + (h(s.idx*9+s.tier)-0.5)*8;
        const by = GY - bh;
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin:`${s.cx}px ${GY}px` }}>
            <rect x={s.cx-s.w/2} y={by} width={s.w} height={bh} rx="2"
                  fill="#0a1620" stroke={accent} strokeWidth="0.9" strokeOpacity="0.55"/>
            {/* Large lab windows */}
            {Array.from({length: Math.min(3, Math.floor(bh/20))}).map((_,r) => (
              <rect key={r} x={s.cx-s.w/2+2} y={by+5+r*18} width={s.w-4} height="12" rx="1"
                    fill={accent} opacity={0.08+(r%2)*0.05} className="lev-window"
                    style={{ animationDelay:`${r*350+i*200}ms` }}/>
            ))}
            {/* Cross symbol on medical buildings */}
            {s.tier >= 2 && i%2===0 && (
              <g opacity="0.35">
                <rect x={s.cx-1.5} y={by+6} width="3" height="9" rx="0.5" fill={accent}/>
                <rect x={s.cx-4.5} y={by+9.5} width="9" height="3" rx="0.5" fill={accent}/>
              </g>
            )}
            {/* Bio-glow on high tiers */}
            {s.tier >= 4 && (
              <rect x={s.cx-s.w/2} y={by} width={s.w} height="3" fill={accent} opacity="0.55"/>
            )}
          </g>
        );
      })}

      {/* Bio-dome (special structure) */}
      {model.totalBuildings >= 3 && (
        <g>
          <path d={`M${VB_W-30},${GY} A25,28 0 0,1 ${VB_W-80},${GY}`}
                fill="#061610" stroke={accent} strokeWidth="1" opacity="0.7"/>
          <path d={`M${VB_W-35},${GY} A20,23 0 0,1 ${VB_W-75},${GY}`}
                fill="none" stroke={accent} strokeWidth="0.6" opacity="0.25"/>
          {/* Glowing specimens inside */}
          <circle cx={VB_W-55} cy={GY-14} r="5" fill={accent} opacity="0.12" className="lev-hqpulse"/>
          <circle cx={VB_W-55} cy={GY-14} r="2.5" fill="#34d399" opacity="0.5" className="lev-beacon"/>
        </g>
      )}

      {/* HQ: helix tower */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin:`${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-13} y={GY-108} width="26" height="108" rx="3"
                fill="#0a1620" stroke={accent} strokeWidth="1.4"/>
          <rect x={HQ_X-13} y={GY-108} width="26" height="5" fill={accent}/>
          {/* Helix decoration on facade */}
          {Array.from({length:5}).map((_,r) => {
            const ox = Math.sin(r*1.3)*4;
            return <circle key={r} cx={HQ_X+ox} cy={GY-95+r*16} r="2.5"
                           fill={r%2===0?accent:'#34d399'} opacity="0.55"
                           className="lev-beacon" style={{ animationDelay:`${r*250}ms` }}/>;
          })}
          {/* Large window */}
          <rect x={HQ_X-9} y={GY-85} width="18" height="20" rx="2"
                fill={accent} opacity="0.1" className="lev-window"/>
          <circle cx={HQ_X} cy={GY-55} r="28" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* Workers (lab coats) */}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => (
        <g key={i} className={i%3===0?'lev-walk-rev':'lev-walk'}
           style={{ animationDuration:`${6+(i%5)*1.5}s`, animationDelay:`-${i*0.8}s` }}>
          <circle cy={GY-10} r="2.2" fill="white" opacity="0.5"/>
          <rect x={-2} y={GY-8} width="4" height="6" rx="1" fill="white" opacity="0.35"/>
        </g>
      ))}

      {/* Cell particles */}
      {Array.from({length: model.coinCount}).map((_,i) => {
        const px = 75 + (i*71)%(VB_W-100);
        return <circle key={i} cx={px} cy={GY-18} r="3.5" fill={accent} opacity="0.45"
                       className="lev-coin" style={{ animationDuration:`${2.8+(i%4)*0.5}s`, animationDelay:`-${i*0.7}s` }}/>;
      })}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-30} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="monospace">
          Seed your first culture to begin the research
        </text>
      )}
    </g>
  );
}

// =============================================================================
// MEDIA  -  broadcast tower rings, billboard, ON AIR, social particles
// =============================================================================
function MediaScene({ model, accent }: SP) {
  const bld = slots(model);
  return (
    <g>
      <defs>
        <linearGradient id="me-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06040f"/><stop offset="100%" stopColor="#0c0a1a"/>
        </linearGradient>
        <radialGradient id="me-neon" cx="75%" cy="85%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#me-sky)"/>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#me-neon)"/>

      {/* City light haze at horizon */}
      <rect x="0" y={GY-30} width={VB_W} height="30"
            fill="url(#me-neon)" opacity="0.6"/>

      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.58} ry={95}
                 fill="url(#lev-glow)" opacity={Math.min(0.65,0.2+model.prestige*0.1)} className="lev-aura"/>
      )}

      {/* Ground - city street */}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#06040a"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.4"/>
      {/* Neon reflections on street */}
      {[[80,'#f472b6'],[160,accent],[260,'#38bdf8']].map(([rx,rc],ri) => (
        <line key={ri} x1={Number(rx)-5} y1={GY+4} x2={Number(rx)+5} y2={GY+16}
              stroke={String(rc)} strokeWidth="1.5" opacity="0.15"/>
      ))}

      {/* Media buildings (screen facades) */}
      {bld.map((s, i) => {
        const bh = 30 + s.tier * 22 + (h(s.idx*8+s.tier)-0.5)*10;
        const by = GY - bh;
        const screenH = Math.min(bh * 0.45, 30);
        const screenColors = ['#f472b6', accent, '#38bdf8', '#fbbf24'];
        const sc = screenColors[i % 4];
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin:`${s.cx}px ${GY}px` }}>
            <rect x={s.cx-s.w/2} y={by} width={s.w} height={bh} rx="2"
                  fill="#0d0a18" stroke="#2d1a4a" strokeWidth="1"/>
            {/* Screen facade */}
            <rect x={s.cx-s.w/2+1} y={by+5} width={s.w-2} height={screenH} rx="1"
                  fill={sc} opacity="0.12" className="lev-window" style={{ animationDelay:`${i*250}ms` }}/>
            {/* Screen frame */}
            <rect x={s.cx-s.w/2+1} y={by+5} width={s.w-2} height={screenH} rx="1"
                  fill="none" stroke={sc} strokeWidth="0.7" opacity="0.4"/>
            {s.tier >= 3 && (
              <line x1={s.cx} y1={by} x2={s.cx} y2={by-12} stroke={sc} strokeWidth="1.2"/>
            )}
            {/* Ticker line at base */}
            {s.tier >= 2 && (
              <rect x={s.cx-s.w/2} y={GY-5} width={s.w} height="3" rx="0" fill={sc} opacity="0.25"/>
            )}
          </g>
        );
      })}

      {/* Billboard (large screen structure) */}
      {model.totalBuildings >= 2 && (
        <g>
          <rect x={VB_W-68} y={GY-88} width="58" height="35" rx="3"
                fill="#0d0a18" stroke={accent} strokeWidth="1.2"/>
          <rect x={VB_W-66} y={GY-86} width="54" height="31" rx="2"
                fill={accent} opacity="0.10" className="lev-window"/>
          {/* LIVE indicator */}
          <circle cx={VB_W-54} cy={GY-72} r="3.5" fill="#f87171" className="lev-beacon"/>
          <text x={VB_W-47} y={GY-69} fill="#e7ecf5" fontSize="8" fontFamily="monospace" opacity="0.7">LIVE</text>
          {/* Billboard pole */}
          <line x1={VB_W-39} y1={GY-53} x2={VB_W-39} y2={GY} stroke="#2d1a4a" strokeWidth="2"/>
        </g>
      )}

      {/* HQ: broadcast tower */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin:`${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-12} y={GY-115} width="24" height="115" rx="3"
                fill="#0d0a18" stroke={accent} strokeWidth="1.4"/>
          <rect x={HQ_X-12} y={GY-115} width="24" height="5" fill={accent}/>
          {/* Broadcast tower mast */}
          <line x1={HQ_X} y1={GY-115} x2={HQ_X} y2={GY-135} stroke={accent} strokeWidth="1.5"/>
          <circle cx={HQ_X} cy={GY-136} r="2.5" fill="#f87171" className="lev-beacon"/>
          {/* Signal rings from tower */}
          {Array.from({length: model.waveCount}).map((_,i) => (
            <circle key={i} cx={HQ_X} cy={GY-130} r={5} fill="none"
                    stroke={accent} strokeWidth="1.2" className="lev-wave"
                    style={{ animationDelay:`${(i/Math.max(1,model.waveCount))*2.4}s` }}/>
          ))}
          {/* Screen facade on HQ */}
          {[0,1,2].map(r => (
            <rect key={r} x={HQ_X-8} y={GY-105+r*22} width="16" height="14" rx="1"
                  fill={r%2===0?accent:'#f472b6'} opacity="0.14" className="lev-window"
                  style={{ animationDelay:`${r*320}ms` }}/>
          ))}
          <circle cx={HQ_X} cy={GY-60} r="28" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* ON AIR indicator */}
      {model.hasEmpire && (
        <g>
          <circle cx={VB_W/2} cy={GY-220<0?10:GY-220} r="4.5" fill="#f87171" className="lev-beacon"/>
          <text x={VB_W/2+8} y={15} fill="#f87171" fontSize="8" fontFamily="monospace" opacity="0.65">ON AIR</text>
        </g>
      )}

      {/* Workers (camera operators) */}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => (
        <circle key={i} cy={GY-6-(i%3)*4} r="2.2" fill={i%2===0?accent:'#8a94a8'}
                className={i%3===0?'lev-walk-rev':'lev-walk'}
                style={{ animationDuration:`${6+(i%5)*1.5}s`, animationDelay:`-${i*0.8}s` }}/>
      ))}

      {/* Social engagement particles */}
      {Array.from({length: model.coinCount}).map((_,i) => {
        const px = 70 + (i*83)%(VB_W-100);
        const g = ['♥','✦','★','▲'][i%4];
        const fc = ['#f472b6',accent,'#fbbf24','#34d399'][i%4];
        return <text key={i} x={px} y={GY-20} textAnchor="middle" fontSize="11"
                     fill={fc} className="lev-heart"
                     style={{ animationDuration:`${3+(i%4)*0.7}s`, animationDelay:`-${i*0.6}s` }}>{g}</text>;
      })}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-30} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="sans-serif">
          Start your first channel to go live
        </text>
      )}
    </g>
  );
}

// =============================================================================
// AGRI  -  crop rows, tractor, farmhouse, windmill, clouds, birds
// =============================================================================
function AgriScene({ model, accent }: SP) {
  const bld = slots(model);
  const skyT = model.mood === 'boom' ? '#0a1e38' : model.mood === 'crash' ? '#101418' : '#0c1a30';
  const skyB = model.mood === 'boom' ? '#1a3850' : model.mood === 'crash' ? '#151c22' : '#162840';
  const fieldC = model.mood === 'boom' ? '#1a3018' : model.mood === 'crash' ? '#141a10' : '#141e12';
  const cropC = model.mood === 'boom' ? '#84cc16' : model.mood === 'crash' ? '#4a5e2e' : '#5a8c2a';
  return (
    <g>
      <defs>
        <linearGradient id="ag-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyT}/><stop offset="100%" stopColor={skyB}/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#ag-sky)"/>

      {/* Sun */}
      <circle cx={VB_W-55} cy={45} r={model.mood==='boom'?38:28} fill="#fde68a"
              opacity={model.mood==='crash'?0.08:0.14} className={model.mood==='boom'?'lev-hqpulse':undefined}/>

      {/* Clouds */}
      {[[55,35,model.mood==='crash'?0.08:0.14],[140,22,model.mood==='crash'?0.06:0.11],[250,40,model.mood==='crash'?0.07:0.12],[320,18,model.mood==='crash'?0.05:0.09]].map(([cx,cy,op],i) => (
        <g key={i} className="lev-cloud" style={{ animationDelay:`-${i*4}s`, animationDuration:`${22+i*6}s` }}>
          <ellipse cx={Number(cx)} cy={Number(cy)} rx={22+i*5} ry={10} fill="white" opacity={Number(op)}/>
          <ellipse cx={Number(cx)-8} cy={Number(cy)+2} rx={14} ry={8} fill="white" opacity={Number(op)}/>
          <ellipse cx={Number(cx)+8} cy={Number(cy)+2} rx={16} ry={8} fill="white" opacity={Number(op)}/>
        </g>
      ))}

      {/* Birds */}
      {model.hasEmpire && Array.from({length:3}).map((_,i) => (
        <g key={i} className="lev-bird" style={{ animationDelay:`-${i*4}s`, animationDuration:`${16+i*4}s` }}>
          <line x1={0} y1={50+i*15} x2={-8} y2={44+i*15} stroke="white" strokeWidth="1" opacity="0.25"/>
          <line x1={0} y1={50+i*15} x2={8}  y2={44+i*15} stroke="white" strokeWidth="1" opacity="0.25"/>
        </g>
      ))}

      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.58} ry={95}
                 fill="url(#lev-glow)" opacity={Math.min(0.6,0.2+model.prestige*0.1)} className="lev-aura"/>
      )}

      {/* Field rows (behind buildings) */}
      <rect x="65" y={GY-35} width={VB_W-75} height="35" fill={fieldC} opacity="0.8"/>
      {Array.from({length:8}).map((_,i) => (
        <path key={i}
              d={`M65,${GY-4-i*4} Q${VB_W/2},${GY-4-i*4+(i%2===0?2:-2)} ${VB_W-10},${GY-4-i*4}`}
              fill="none" stroke={cropC} strokeWidth="1" opacity={0.4+i*0.05}/>
      ))}

      {/* Ground */}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#0c1208"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.3"/>

      {/* Farm buildings */}
      {bld.map((s, i) => {
        const bh = 24 + s.tier * 16 + (h(s.idx*7+s.tier)-0.5)*8;
        const by = GY - bh;
        const isBarn = i % 3 === 0;
        const isSilo = i % 4 === 1;
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin:`${s.cx}px ${GY}px` }}>
            {isSilo ? (
              <>
                <rect x={s.cx-s.w/2+2} y={by} width={s.w-4} height={bh} rx="3" fill="#14200e" stroke="#2a3a18" strokeWidth="1"/>
                <path d={`M${s.cx-s.w/2+2},${by} Q${s.cx},${by-8} ${s.cx+s.w/2-2},${by}`} fill="#1a2a12" stroke="#2a3a18" strokeWidth="1"/>
              </>
            ) : isBarn ? (
              <>
                <rect x={s.cx-s.w/2} y={by+bh*0.35} width={s.w} height={bh*0.65} rx="1" fill="#1e1208" stroke="#3d2010" strokeWidth="1"/>
                <polygon points={`${s.cx-s.w/2-2},${by+bh*0.35} ${s.cx+s.w/2+2},${by+bh*0.35} ${s.cx},${by}`}
                         fill="#2a1a0a" stroke="#3d2010" strokeWidth="0.8"/>
                {/* Barn door */}
                <rect x={s.cx-4} y={GY-14} width="8" height="14" rx="0.5"
                      fill="#14100a" stroke="#3d2010" strokeWidth="0.7"/>
              </>
            ) : (
              <>
                <rect x={s.cx-s.w/2} y={by+bh*0.3} width={s.w} height={bh*0.7} rx="1"
                      fill="#161210" stroke="#2a2015" strokeWidth="1"/>
                <polygon points={`${s.cx-s.w/2-1},${by+bh*0.3} ${s.cx+s.w/2+1},${by+bh*0.3} ${s.cx},${by}`}
                         fill="#201a14" stroke="#2a2015" strokeWidth="0.8"/>
                {/* Window */}
                <rect x={s.cx-3} y={by+bh*0.45} width="6" height="7" rx="1"
                      fill={accent} opacity="0.2" className="lev-window" style={{ animationDelay:`${i*300}ms` }}/>
              </>
            )}
          </g>
        );
      })}

      {/* HQ: main farmhouse with water tower */}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin:`${HQ_X}px ${GY}px` }}>
          {/* Farmhouse body */}
          <rect x={HQ_X-16} y={GY-65} width="32" height="65" rx="2"
                fill="#1a1510" stroke="#3a2810" strokeWidth="1.5"/>
          {/* Roof */}
          <polygon points={`${HQ_X-18},${GY-65} ${HQ_X+18},${GY-65} ${HQ_X},${GY-88}`}
                   fill="#221a12" stroke="#3a2810" strokeWidth="1.2"/>
          {/* Door */}
          <rect x={HQ_X-5} y={GY-20} width="10" height="20" rx="2"
                fill="#0e0a06" stroke="#3a2810" strokeWidth="0.8"/>
          {/* Windows */}
          <rect x={HQ_X-12} y={GY-52} width="8" height="9" rx="1"
                fill={accent} opacity="0.22" className="lev-window"/>
          <rect x={HQ_X+4} y={GY-52} width="8" height="9" rx="1"
                fill={accent} opacity="0.22" className="lev-window" style={{ animationDelay:'400ms' }}/>
          {/* Water tower */}
          <line x1={HQ_X+20} y1={GY} x2={HQ_X+20} y2={GY-45} stroke="#2a2015" strokeWidth="2"/>
          <ellipse cx={HQ_X+20} cy={GY-50} rx="9" ry="6" fill="#1a1510" stroke="#2a2015" strokeWidth="1"/>
          <rect x={HQ_X+12} y={GY-50} width="16" height="8" rx="2" fill="#1a1510" stroke="#2a2015" strokeWidth="0.8"/>
          <circle cx={HQ_X} cy={GY-50} r="28" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}

      {/* Windmill (small, right side) */}
      {model.totalBuildings >= 1 && (
        <g>
          <line x1={VB_W-28} y1={GY} x2={VB_W-28} y2={GY-50} stroke="#2a3a18" strokeWidth="2"/>
          <circle cx={VB_W-28} cy={GY-50} r="3.5" fill="#1e2a12" stroke={accent} strokeWidth="0.8"/>
          <g className="lev-spin" style={{ transformOrigin:`${VB_W-28}px ${GY-50}px`, animationDuration:`${model.mood==='boom'?2.5:4}s` }}>
            <line x1={VB_W-28} y1={GY-50} x2={VB_W-28} y2={GY-68} stroke="#2a3a18" strokeWidth="2.5"/>
            <line x1={VB_W-28} y1={GY-50} x2={VB_W-43} y2={GY-41} stroke="#2a3a18" strokeWidth="2.5"/>
            <line x1={VB_W-28} y1={GY-50} x2={VB_W-13} y2={GY-41} stroke="#2a3a18" strokeWidth="2.5"/>
          </g>
        </g>
      )}

      {/* Tractor (moving across scene) */}
      {model.hasEmpire && (
        <g className="lev-tractor">
          <rect x={0} y={GY-14} width="22" height="10" rx="2" fill="#1e3010" stroke={accent} strokeWidth="0.8"/>
          <rect x={14} y={GY-18} width="10" height="8" rx="2" fill="#182808"/>
          <circle cx={4} cy={GY-4} r="5" fill="#0e1208" stroke="#2a3a18" strokeWidth="1.2"/>
          <circle cx={18} cy={GY-4} r="4" fill="#0e1208" stroke="#2a3a18" strokeWidth="1"/>
        </g>
      )}

      {/* Workers (farmers) */}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => (
        <circle key={i} cy={GY-7-(i%2)*4} r="2.2" fill={i%2===0?accent:'#8a94a8'}
                className={i%3===0?'lev-walk-rev':'lev-walk'}
                style={{ animationDuration:`${7+(i%4)*1.8}s`, animationDelay:`-${i*1}s` }}/>
      ))}

      {/* Seed/grain particles */}
      {Array.from({length: model.coinCount}).map((_,i) => {
        const px = 80 + (i*71)%(VB_W-100);
        return <circle key={i} cx={px} cy={GY-18} r="2.5" fill={accent} opacity="0.55"
                       className="lev-coin" style={{ animationDuration:`${2.6+(i%4)*0.5}s`, animationDelay:`-${i*0.65}s` }}/>;
      })}

      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-30} textAnchor="middle" fill="#8a94a8" fontSize="11" fontFamily="sans-serif">
          Plant your first crop to work the land
        </text>
      )}
    </g>
  );
}

// =============================================================================
// GENERIC fallback (for any future industry not yet mapped)
// =============================================================================
function GenericScene({ model, accent }: SP) {
  const bld = slots(model);
  const sky = model.mood === 'boom' ? { t: '#241c08', b: '#0e1420', sun: '#fbbf24' }
            : model.mood === 'crash' ? { t: '#1c0d10', b: '#0b0e16', sun: '#f87171' }
            : { t: '#0c1426', b: '#0a0f18', sun: '#3a4a6a' };
  return (
    <g>
      <defs>
        <linearGradient id="gn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky.t}/><stop offset="100%" stopColor={sky.b}/>
        </linearGradient>
        <radialGradient id="gn-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={sky.sun} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={sky.sun} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#gn-sky)"/>
      <circle cx={VB_W-64} cy={56} r={64} fill="url(#gn-sun)"/>
      {model.mood !== 'boom' && Array.from({length:14}).map((_,i) => (
        <circle key={i} cx={(i*53+11)%VB_W} cy={12+(i*37)%90} r={0.6+(i%3)*0.4}
                fill="#e7ecf5" className="lev-star" style={{ animationDelay:`${(i%5)*0.6}s` }}/>
      ))}
      {model.prestige > 0 && (
        <ellipse cx={VB_W/2} cy={GY} rx={VB_W*0.62} ry={120}
                 fill="url(#lev-glow)" opacity={Math.min(0.85,0.28+model.prestige*0.12)} className="lev-aura"/>
      )}
      <rect x="0" y={GY} width={VB_W} height={VB_H-GY} fill="#0b1018"/>
      <rect x="0" y={GY} width={VB_W} height="2" fill={accent} opacity="0.35"/>
      {bld.map((s,i) => {
        const bh = 26+s.tier*22+(h(s.idx*13+s.tier*7)-0.5)*12;
        const by = GY-bh;
        return (
          <g key={i} className="lev-rise" style={{ transformOrigin:`${s.cx}px ${GY}px` }}>
            <rect x={s.cx-s.w/2} y={by} width={s.w} height={bh} rx="2"
                  fill={`color-mix(in srgb, ${accent} ${8+s.tier*14}%, #161d2c)`}
                  stroke={`color-mix(in srgb, ${accent} ${23+s.tier*14}%, #232c3e)`} strokeWidth="1"/>
            {s.tier>=3 && <rect x={s.cx-s.w/2} y={by} width={s.w} height="4" fill={accent} opacity="0.8"/>}
            {s.tier>=4 && <line x1={s.cx} y1={by} x2={s.cx} y2={by-10-s.tier} stroke={accent} strokeWidth="1.4"/>}
            {Array.from({length: Math.max(1,Math.floor(bh/16))}).map((_,r) => {
              const wy = by+6+r*12;
              if (wy>GY-6) return null;
              const on = h(s.tier*31+r*17+s.cx)>0.35;
              return <rect key={r} x={s.cx-s.w/2+3} y={wy} width={s.w-6} height="3.5" rx="1"
                           fill={on?(s.tier>=3?accent:'#9fb4d8'):'#0c1118'} opacity={on?0.9:0.5}
                           className={on?'lev-window':undefined} style={on?{animationDelay:`${(s.cx+r*130)%2600}ms`}:undefined}/>;
            })}
          </g>
        );
      })}
      {model.hasEmpire && (
        <g className="lev-rise" style={{ transformOrigin:`${HQ_X}px ${GY}px` }}>
          <rect x={HQ_X-13} y={GY-92} width="26" height="92" rx="3"
                fill="#1a2336" stroke={accent} strokeWidth="1.4"/>
          <rect x={HQ_X-13} y={GY-92} width="26" height="5" fill={accent}/>
          <circle cx={HQ_X} cy={GY-96} r="2.4" fill={accent} className="lev-beacon"/>
          <line x1={HQ_X} y1={GY-92} x2={HQ_X} y2={GY-104} stroke={accent} strokeWidth="1.4"/>
          <rect x={HQ_X-7} y={GY-78} width="14" height="10" rx="2" fill={accent} opacity="0.85" className="lev-window"/>
          {[0,1,2,3].map(r => (
            <rect key={r} x={HQ_X-7} y={GY-62+r*13} width="14" height="4" rx="1"
                  fill={accent} opacity="0.55" className="lev-window" style={{ animationDelay:`${r*420}ms` }}/>
          ))}
          <circle cx={HQ_X} cy={GY-50} r="30" fill="url(#lev-glow)" className="lev-hqpulse"/>
        </g>
      )}
      {Array.from({length: model.waveCount}).map((_,i) => (
        <circle key={i} cx={HQ_X} cy={GY-28} r={6} fill="none" stroke={accent} strokeWidth="1.5"
                className="lev-wave" style={{ animationDelay:`${(i/Math.max(1,model.waveCount))*2.4}s` }}/>
      ))}
      {model.hasEmpire && Array.from({length: model.workerCount}).map((_,i) => (
        <circle key={i} cy={GY-6-(i%3)*4} r="2.2" fill={i%2===0?accent:'#8a94a8'}
                className={i%3===0?'lev-walk-rev':'lev-walk'}
                style={{ animationDuration:`${6+(i%5)*1.6}s`, animationDelay:`-${(i/Math.max(1,model.workerCount))*(6+(i%5)*1.6)}s` }}/>
      ))}
      {Array.from({length: model.coinCount}).map((_,i) => (
        <text key={i} x={60+((i*97)%(VB_W-90))} y={GY-18} textAnchor="middle" fontSize="11"
              fontFamily="monospace" fontWeight="700" fill="#34d399" className="lev-coin"
              style={{ animationDuration:`${2.6+(i%4)*0.5}s`, animationDelay:`-${(i/Math.max(1,model.coinCount))*(2.6+(i%4)*0.5)}s` }}>+$</text>
      ))}
      {Array.from({length: model.heartCount}).map((_,i) => (
        <text key={i} x={84+((i*131)%(VB_W-120))} y={GY-40} textAnchor="middle" fontSize="12"
              fill={i%2===0?'#f87171':accent} className="lev-heart"
              style={{ animationDuration:`${3.4+(i%3)*0.7}s`, animationDelay:`-${(i/Math.max(1,model.heartCount))*(3.4+(i%3)*0.7)}s` }}>
          {i%2===0?'♥':'✦'}
        </text>
      ))}
      {!model.hasEmpire && (
        <text x={VB_W/2} y={GY-30} textAnchor="middle" fill="#8a94a8" fontSize="12" fontFamily="ui-monospace, monospace">
          Build your first facility to bring the city to life
        </text>
      )}
    </g>
  );
}

// =============================================================================
// CSS keyframes for all animation classes
// =============================================================================
function LiveStyles() {
  const VBW = VB_W;
  return (
    <style>{`
      /* ---- shared rise-in ---- */
      @keyframes lev-rise-kf { from { transform:scaleY(0); opacity:0; } to { transform:scaleY(1); opacity:1; } }
      .lev-rise { animation: lev-rise-kf 600ms cubic-bezier(.16,1,.3,1) both; transform-box:fill-box; }

      /* ---- reach waves / signal rings ---- */
      @keyframes lev-wave-kf { 0% { r:6; opacity:.55; } 100% { r:120; opacity:0; } }
      .lev-wave { animation: lev-wave-kf 2.4s ease-out infinite; }

      /* ---- money / generic coin particle ---- */
      @keyframes lev-coin-kf { 0% { transform:translateY(0); opacity:0; } 15% { opacity:1; } 100% { transform:translateY(-48px); opacity:0; } }
      .lev-coin { animation: lev-coin-kf linear infinite; }

      /* ---- heart / engagement ---- */
      @keyframes lev-heart-kf { 0% { transform:translateY(0) scale(.7); opacity:0; } 20% { opacity:1; } 100% { transform:translateY(-60px) scale(1.1); opacity:0; } }
      .lev-heart { animation: lev-heart-kf ease-out infinite; }

      /* ---- horizontal walk (left→right) ---- */
      @keyframes lev-walk-kf { from { transform:translateX(68px); } to { transform:translateX(${VBW-12}px); } }
      .lev-walk { animation: lev-walk-kf linear infinite; }
      @keyframes lev-walk-rev-kf { from { transform:translateX(${VBW-12}px); } to { transform:translateX(68px); } }
      .lev-walk-rev { animation: lev-walk-rev-kf linear infinite; }

      /* ---- window flicker ---- */
      @keyframes lev-window-kf { 0%,100% { opacity:.35; } 50% { opacity:.95; } }
      .lev-window { animation: lev-window-kf 2.6s ease-in-out infinite; }

      /* ---- beacon pulse ---- */
      @keyframes lev-beacon-kf { 0%,100% { opacity:.3; } 50% { opacity:1; } }
      .lev-beacon { animation: lev-beacon-kf 1.4s ease-in-out infinite; }

      /* ---- HQ glow pulse ---- */
      @keyframes lev-hqpulse-kf { 0%,100% { opacity:.35; } 50% { opacity:.7; } }
      .lev-hqpulse { animation: lev-hqpulse-kf 3s ease-in-out infinite; }

      /* ---- prestige aura ---- */
      @keyframes lev-aura-kf { 0%,100% { opacity:.25; } 50% { opacity:.55; } }
      .lev-aura { animation: lev-aura-kf 4.5s ease-in-out infinite; }

      /* ---- stars twinkle ---- */
      @keyframes lev-star-kf { 0%,100% { opacity:.25; } 50% { opacity:.9; } }
      .lev-star { animation: lev-star-kf 3.2s ease-in-out infinite; }

      /* ---- LED blink ---- */
      @keyframes lev-blink-kf { 0%,100% { opacity:.2; } 50% { opacity:1; } }
      .lev-blink { animation: lev-blink-kf 0.9s ease-in-out infinite; }

      /* ---- electron / energy particle slide ---- */
      @keyframes lev-electron-kf { from { transform:translateX(72px); } to { transform:translateX(${VBW-10}px); } }
      .lev-electron { animation: lev-electron-kf linear infinite; }

      /* ---- circuit trace dash flow ---- */
      @keyframes lev-dash-kf { from { stroke-dashoffset:20; } to { stroke-dashoffset:0; } }
      .lev-dash { animation: lev-dash-kf 1.2s linear infinite; }

      /* ---- spin (wind turbines, fans, windmill, satellite) ---- */
      @keyframes lev-spin-kf { to { transform:rotate(360deg); } }
      .lev-spin { animation: lev-spin-kf linear infinite; transform-box:fill-box; }

      /* ---- dish oscillate ---- */
      @keyframes sp-dish-kf { 0%,100% { transform:rotate(-12deg); } 50% { transform:rotate(12deg); } }
      .sp-dish { animation: sp-dish-kf 8s ease-in-out infinite; transform-box:fill-box; }

      /* ---- steam puff ---- */
      @keyframes lev-steam-kf { 0% { transform:translateY(0) scale(.5); opacity:0; } 30% { opacity:.7; } 100% { transform:translateY(-36px) scale(1.4); opacity:0; } }
      .lev-steam { animation: lev-steam-kf ease-out infinite; }

      /* ---- delivery scooter ---- */
      @keyframes lev-scooter-kf { from { transform:translateX(-30px); } to { transform:translateX(${VBW+10}px); } }
      .lev-scooter { animation: lev-scooter-kf 14s linear infinite; }

      /* ---- tractor ---- */
      @keyframes lev-tractor-kf { from { transform:translateX(-40px); } to { transform:translateX(${VBW+10}px); } }
      .lev-tractor { animation: lev-tractor-kf 18s linear infinite; }

      /* ---- camera flash ---- */
      @keyframes lev-flash-kf { 0%,100% { opacity:0; } 4% { opacity:0.55; } 12% { opacity:0; } }
      .lev-flash { animation: lev-flash-kf ease-out infinite; }

      /* ---- DNA helix rise ---- */
      @keyframes lev-dna-kf { 0% { transform:translateY(0); opacity:0; } 15% { opacity:.7; } 85% { opacity:.6; } 100% { transform:translateY(-120px); opacity:0; } }
      .lev-dna { animation: lev-dna-kf 7s ease-in-out infinite; }

      /* ---- solar panel shimmer ---- */
      @keyframes lev-shimmer-kf { 0%,100% { opacity:.06; } 50% { opacity:.25; } }
      .lev-shimmer { animation: lev-shimmer-kf 3.5s ease-in-out infinite; }

      /* ---- exhaust glow (rocket pad) ---- */
      @keyframes lev-exhaust-kf { 0%,100% { opacity:.25; transform:scaleX(1); } 50% { opacity:.55; transform:scaleX(1.3); } }
      .lev-exhaust { animation: lev-exhaust-kf 0.8s ease-in-out infinite; transform-box:fill-box; }

      /* ---- binary float ---- */
      @keyframes lev-bin-kf { 0% { transform:translateY(0); opacity:0; } 20% { opacity:1; } 80% { opacity:.5; } 100% { transform:translateY(-80px); opacity:0; } }
      .lev-bin { animation: lev-bin-kf linear infinite; }

      /* ---- kitchen flame ---- */
      @keyframes lev-flame-kf { 0%,100% { transform:scaleY(1) translateY(0); } 50% { transform:scaleY(1.3) translateY(-2px); } }
      .lev-flame { animation: lev-flame-kf 0.6s ease-in-out infinite; transform-box:fill-box; }

      /* ---- cloud drift ---- */
      @keyframes lev-cloud-kf { from { transform:translateX(-80px); } to { transform:translateX(${VBW+80}px); } }
      .lev-cloud { animation: lev-cloud-kf linear infinite; }

      /* ---- bird flight ---- */
      @keyframes lev-bird-kf { from { transform:translateX(-30px); } to { transform:translateX(${VBW+30}px); } }
      .lev-bird { animation: lev-bird-kf linear infinite; }

      @media (prefers-reduced-motion: reduce) {
        .lev-rise, .lev-wave, .lev-coin, .lev-heart, .lev-walk, .lev-walk-rev,
        .lev-window, .lev-beacon, .lev-hqpulse, .lev-aura, .lev-star, .lev-blink,
        .lev-electron, .lev-dash, .lev-spin, .sp-orbit, .sp-dish, .lev-steam,
        .lev-scooter, .lev-tractor, .lev-flash, .lev-dna, .lev-shimmer,
        .lev-exhaust, .lev-bin, .lev-flame, .lev-cloud, .lev-bird,
        .sp-dish {
          animation: none !important;
        }
        .lev-rise { transform: none; opacity: 1; }
      }
    `}</style>
  );
}
