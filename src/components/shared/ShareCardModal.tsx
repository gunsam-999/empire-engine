// ============================================================================
// ShareCardModal — the viral hook. A procedurally-rendered "trading card" that
// captures the state of the player's empire and can be shared, copied, or
// downloaded as a PNG. Everything is drawn from inline SVG (no images, no
// fonts to ship) and rasterized client-side at 2× for crisp social sharing.
//
//   • SVG is authored with presentation attributes + inline styles only, so it
//     survives serialization → <img> → canvas rasterization intact.
//   • Export path: serialize SVG → data URI → Image → canvas → toBlob(PNG).
//   • Share uses the Web Share API with a file when available (mobile), and
//     gracefully degrades to clipboard-copy and a download link.
// ============================================================================

import { useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { useGame, getIndustry } from '../../game/GameContext';
import { getPalette } from '../../utils/palette';
import { formatMoney, formatNumber } from '../../utils/bigNumber';
import { formatDuration } from '../../utils/time';
import { ECHELON_LABELS } from '../../systems/EchelonEngine';
import { sfx } from '../../systems/AudioEngine';
import type { GameState } from '../../game/types';

const ERA_LABEL: Record<string, string> = {
  BOOTSTRAPPING: 'Bootstrapping',
  GROWING: 'Growing',
  SCALING: 'Scaling',
  ESTABLISHED: 'Established',
  TITAN: 'Titan',
};

const PHILOSOPHY_LABEL: Record<string, string> = {
  efficiency: 'Relentless Efficiency',
  innovator: 'Bold Innovation',
  aggressive: 'Aggressive Expansion',
  people_first: 'People First',
};

const W = 600;
const H = 820;

interface CardModel {
  company: string;
  emoji: string;
  accent: string;
  netWorth: string;
  symbol: string;
  tier: string;
  era: string;
  tenure: string;
  philosophy: string;
  stats: { label: string; value: string }[];
}

function buildModel(state: GameState): CardModel {
  const industry = getIndustry(state);
  const facilities = Object.values(state.facilities).reduce((s, n) => s + n, 0);
  const advisors = Object.keys(state.advisors.owned).length;
  const research = state.research.completed.length;
  const tenureSec =
    state.setup?.foundedAt && state.setup.foundedAt > 0
      ? (Date.now() - state.setup.foundedAt) / 1000
      : state.stats.playSeconds;

  return {
    company: state.setup?.name ?? 'My Empire',
    emoji: industry?.emoji ?? '🏭',
    accent: state.setup?.accent ?? '#6366f1',
    netWorth: formatMoney(state.lifetimeEarnings, ''),
    symbol: industry?.currency ?? '$',
    tier: ECHELON_LABELS[state.echelon?.tier ?? 'STARTUP'],
    era: ERA_LABEL[state.director?.currentPhase ?? 'BOOTSTRAPPING'] ?? 'Bootstrapping',
    tenure: formatDuration(tenureSec),
    philosophy: PHILOSOPHY_LABEL[state.setup?.philosophy ?? 'efficiency'] ?? '',
    stats: [
      { label: 'Facilities', value: formatNumber(facilities) },
      { label: 'Advisors', value: String(advisors) },
      { label: 'Research', value: String(research) },
      { label: 'Rebirths', value: String(state.prestigeCount) },
    ],
  };
}

/** The card as a JSX SVG tree (used both for on-screen preview and export). */
function CardSvg({
  m,
  innerRef,
}: {
  m: CardModel;
  innerRef?: React.Ref<SVGSVGElement>;
}) {
  const pal = getPalette(m.accent);
  const font =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

  return (
    <svg
      ref={innerRef}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <defs>
        <linearGradient id="ec-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0c1322" />
          <stop offset="100%" stopColor="#070b12" />
        </linearGradient>
        <radialGradient id="ec-aura1" cx="18%" cy="14%" r="60%">
          <stop offset="0%" stopColor={pal.accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={pal.accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ec-aura2" cx="92%" cy="88%" r="60%">
          <stop offset="0%" stopColor={pal.secondary} stopOpacity="0.42" />
          <stop offset="100%" stopColor={pal.secondary} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ec-net" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={pal.glow} />
          <stop offset="100%" stopColor={pal.accent} />
        </linearGradient>
      </defs>

      {/* Background + auras + frame */}
      <rect x="0" y="0" width={W} height={H} rx="32" fill="url(#ec-bg)" />
      <rect x="0" y="0" width={W} height={H} rx="32" fill="url(#ec-aura1)" />
      <rect x="0" y="0" width={W} height={H} rx="32" fill="url(#ec-aura2)" />
      <rect
        x="6"
        y="6"
        width={W - 12}
        height={H - 12}
        rx="28"
        fill="none"
        stroke={pal.accent}
        strokeOpacity="0.55"
        strokeWidth="2"
      />

      {/* Wordmark */}
      <text
        x="48"
        y="74"
        fontFamily={mono}
        fontSize="16"
        letterSpacing="4"
        fill="#8a94a8"
        fontWeight="700"
      >
        EMPIRE ENGINE
      </text>
      <circle cx={W - 60} cy="66" r="6" fill={pal.accent} />

      {/* Industry badge */}
      <rect
        x="48"
        y="108"
        width="96"
        height="96"
        rx="24"
        fill="#0e1420"
        stroke={pal.accent}
        strokeWidth="2"
      />
      <text x="96" y="176" fontSize="56" textAnchor="middle">
        {m.emoji}
      </text>

      {/* Company name + philosophy */}
      <text x="164" y="150" fontFamily={font} fontSize="34" fontWeight="800" fill="#f2f5fb">
        {clip(m.company, 16)}
      </text>
      <text x="166" y="184" fontFamily={font} fontSize="17" fill={pal.glow} fontWeight="600">
        {m.philosophy}
      </text>

      {/* Net worth hero */}
      <text x="48" y="290" fontFamily={font} fontSize="15" letterSpacing="3" fill="#8a94a8" fontWeight="700">
        LIFETIME EARNINGS
      </text>
      <text x="44" y="372" fontFamily={mono} fontSize="78" fontWeight="800" fill="url(#ec-net)">
        {m.symbol}
        {m.netWorth}
      </text>

      {/* Tier + era chips */}
      <Chip x={48} y={410} label="ECHELON" value={m.tier} pal={pal} />
      <Chip x={324} y={410} label="ERA" value={m.era} pal={pal} />

      {/* Stat grid */}
      {m.stats.map((s, i) => {
        const col = i % 2;
        const row = (i / 2) | 0;
        const x = 48 + col * 276;
        const y = 506 + row * 116;
        return (
          <g key={s.label}>
            <rect
              x={x}
              y={y}
              width="252"
              height="96"
              rx="20"
              fill="#0e1420"
              fillOpacity="0.7"
              stroke="#232c3e"
              strokeWidth="1.5"
            />
            <text x={x + 22} y={y + 40} fontFamily={font} fontSize="14" letterSpacing="2" fill="#8a94a8" fontWeight="700">
              {s.label.toUpperCase()}
            </text>
            <text x={x + 22} y={y + 78} fontFamily={mono} fontSize="34" fontWeight="800" fill="#e7ecf5">
              {s.value}
            </text>
          </g>
        );
      })}

      {/* Footer */}
      <line x1="48" y1={H - 70} x2={W - 48} y2={H - 70} stroke="#232c3e" strokeWidth="1.5" />
      <text x="48" y={H - 38} fontFamily={font} fontSize="16" fill="#8a94a8">
        ⏱ {m.tenure} at the helm
      </text>
      <text x={W - 48} y={H - 38} fontFamily={font} fontSize="16" fill={pal.accent} textAnchor="end" fontWeight="700">
        Build yours →
      </text>
    </svg>
  );
}

function Chip({
  x,
  y,
  label,
  value,
  pal,
}: {
  x: number;
  y: number;
  label: string;
  value: string;
  pal: ReturnType<typeof getPalette>;
}) {
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="228"
        height="60"
        rx="16"
        fill={pal.accent}
        fillOpacity="0.12"
        stroke={pal.accent}
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      <text x={x + 18} y={y + 26} fontFamily={font} fontSize="12" letterSpacing="2" fill="#8a94a8" fontWeight="700">
        {label}
      </text>
      <text x={x + 18} y={y + 48} fontFamily={font} fontSize="20" fontWeight="800" fill="#f2f5fb">
        {clip(value, 16)}
      </text>
    </g>
  );
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ---- Rasterization ----------------------------------------------------------

function svgToPngBlob(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xml = new XMLSerializer().serializeToString(svg);
    const uri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no 2d context'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/png'
      );
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = uri;
  });
}

// ---- Modal ------------------------------------------------------------------

type Status = { tone: 'good' | 'bad'; text: string } | null;

export default function ShareCardModal({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const model = useMemo(() => buildModel(state), [state]);
  const fileName = `${(state.setup?.name ?? 'empire').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-empire-card.png`;

  const flash = (tone: 'good' | 'bad', text: string) => {
    setStatus({ tone, text });
    window.setTimeout(() => setStatus(null), 2600);
  };

  async function getBlob(): Promise<Blob | null> {
    if (!svgRef.current) return null;
    try {
      return await svgToPngBlob(svgRef.current);
    } catch {
      return null;
    }
  }

  async function onDownload() {
    setBusy(true);
    const blob = await getBlob();
    setBusy(false);
    if (!blob) return flash('bad', "Couldn't render the card.");
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    sfx.play('sell');
    flash('good', 'Card downloaded.');
  }

  async function onShare() {
    setBusy(true);
    const blob = await getBlob();
    setBusy(false);
    if (!blob) return flash('bad', "Couldn't render the card.");
    const file = new File([blob], fileName, { type: 'image/png' });
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
      share?: (d: ShareData) => Promise<void>;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: 'My Empire',
          text: `${model.company} — ${model.symbol}${model.netWorth} lifetime, ${model.tier}. Built in Empire Engine.`,
        });
        sfx.play('sell');
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      flash('bad', 'Sharing not supported — try Copy or Download.');
    }
  }

  async function onCopy() {
    setBusy(true);
    const blob = await getBlob();
    const clip = navigator.clipboard as Clipboard & {
      write?: (items: ClipboardItem[]) => Promise<void>;
    };
    try {
      if (blob && typeof ClipboardItem !== 'undefined' && clip.write) {
        await clip.write([new ClipboardItem({ 'image/png': blob })]);
        sfx.play('toggle');
        flash('good', 'Card copied to clipboard.');
      } else {
        flash('bad', 'Copy not supported — try Download.');
      }
    } catch {
      flash('bad', 'Clipboard blocked — try Download.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      icon="📸"
      title="Share your empire"
      subtitle="A snapshot card you can post anywhere."
      onClose={onClose}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Preview */}
        <div className="overflow-hidden rounded-2xl border border-[#232c3e] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.9)]">
          <CardSvg m={model} innerRef={svgRef} />
        </div>

        {status && (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              status.tone === 'good'
                ? 'border-[#34d399]/40 bg-[#34d399]/10 text-[#34d399]'
                : 'border-[#f87171]/40 bg-[#f87171]/10 text-[#f87171]'
            }`}
          >
            {status.text}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={onShare}
            disabled={busy}
            className="rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-[#070b12]
              active:scale-95 transition-transform disabled:opacity-50"
          >
            📤 Share
          </button>
          <button
            onClick={onCopy}
            disabled={busy}
            className="rounded-xl border border-[#232c3e] bg-[#151c2b] py-3 text-sm font-semibold
              text-[#e7ecf5] hover:bg-[#1b2334] active:scale-95 transition-transform disabled:opacity-50"
          >
            📋 Copy
          </button>
          <button
            onClick={onDownload}
            disabled={busy}
            className="rounded-xl border border-[#232c3e] bg-[#151c2b] py-3 text-sm font-semibold
              text-[#e7ecf5] hover:bg-[#1b2334] active:scale-95 transition-transform disabled:opacity-50"
          >
            ⬇️ Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
