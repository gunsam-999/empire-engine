// NewspaperPanel — Newspaper press coverage UI (Session 5.3).
// Shows recent headlines, heat score indicator, and "Respond" buttons for
// negative coverage. Responding costs 200 influence and reduces heat by 30.

import { useGame } from '../../game/GameContext';
import { canRespondToNews, NEWS_RESPOND_COST } from '../../systems/NewspaperEngine';
import type { NewsCategory, NewsItem } from '../../game/types';
import { formatNumber } from '../../utils/bigNumber';

const CAT_COLOR: Record<NewsCategory, string> = {
  business:  '#60a5fa',
  victory:   '#34d399',
  politics:  '#a78bfa',
  scandal:   '#f87171',
  market:    '#fbbf24',
};

const CAT_LABEL: Record<NewsCategory, string> = {
  business:  'Business',
  victory:   'Victory',
  politics:  'Politics',
  scandal:   'Scandal',
  market:    'Market',
};

function timeAgo(at: number, now: number): string {
  const s = Math.round((now - at) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

interface HeadlineRowProps {
  item: NewsItem;
  now: number;
  canRespond: boolean;
  hasInfluence: boolean;
  onRespond: () => void;
}

function HeadlineRow({ item, now, canRespond, hasInfluence, onRespond }: HeadlineRowProps) {
  const color = CAT_COLOR[item.category];
  const catLabel = CAT_LABEL[item.category];
  const isNeg = item.sentimentScore < 0;

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: `${color}30`, background: `${color}08` }}
    >
      <div className="flex items-start justify-between gap-2 text-[11px]">
        <span
          className="shrink-0 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide"
          style={{ background: `${color}20`, color }}
        >
          {catLabel}
        </span>
        <span className="text-[#8a94a8]">{timeAgo(item.at, now)}</span>
      </div>
      <p className="mt-1.5 text-[12px] font-medium leading-snug text-[#e7ecf5]">
        {item.headline}
      </p>
      {isNeg && !item.responded && (
        <button
          type="button"
          disabled={!hasInfluence}
          onClick={onRespond}
          className="mt-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-50 active:scale-[0.98]"
          style={{
            background: hasInfluence ? '#f8717122' : '#232c3e',
            border: `1px solid ${hasInfluence ? '#f8717155' : '#232c3e'}`,
            color: hasInfluence ? '#f87171' : '#8a94a8',
          }}
        >
          Respond publicly  🤝 {NEWS_RESPOND_COST}
        </button>
      )}
      {item.responded && isNeg && (
        <span className="mt-1.5 block text-[10px] text-[#34d399]">✓ Response issued</span>
      )}
    </div>
  );
}

export default function NewspaperPanel() {
  const { state, dispatch } = useGame();
  const newspaper = state.newspaper;

  if (!newspaper || newspaper.items.length === 0) return null;

  const now = Date.now();
  const { items, heatScore } = newspaper;
  const visible = items.slice(0, 5);
  const hasInfluence = state.influence >= NEWS_RESPOND_COST;

  const heatColor = heatScore >= 60 ? '#f87171' : heatScore >= 30 ? '#fbbf24' : '#34d399';
  const heatLabel = heatScore >= 60 ? 'Crisis' : heatScore >= 30 ? 'Elevated' : 'Calm';

  return (
    <div className="rounded-2xl border border-[#232c3e] bg-[#151c2b] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[#e7ecf5]">📰 The Press</span>
        <span className="text-[10px]">
          Heat:{' '}
          <span className="font-semibold" style={{ color: heatColor }}>
            {Math.round(heatScore)} — {heatLabel}
          </span>
        </span>
      </div>

      {/* Heat bar */}
      {heatScore > 0 && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0e1420]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${heatScore}%`,
              background: heatScore >= 60 ? '#f87171' : heatScore >= 30 ? '#fbbf24' : '#34d399',
            }}
          />
        </div>
      )}
      {heatScore > 0 && (
        <div className="mt-1 text-[10px] text-[#8a94a8]">
          Negative coverage debuffs production by up to 18%. Respond to reduce heat.
          {heatScore > 0 && (
            <span className="ml-1 text-[#34d399]">
              (Decaying — {formatNumber(heatScore)}pts)
            </span>
          )}
        </div>
      )}

      {/* Headlines */}
      <div className="mt-3 flex flex-col gap-2">
        {visible.map((item) => (
          <HeadlineRow
            key={item.id}
            item={item}
            now={now}
            canRespond={canRespondToNews(item) && hasInfluence}
            hasInfluence={hasInfluence}
            onRespond={() => dispatch({ type: 'NEWS_RESPOND', itemId: item.id })}
          />
        ))}
      </div>

      {items.length > 5 && (
        <p className="mt-2 text-center text-[10px] text-[#8a94a8]">
          +{items.length - 5} older headlines
        </p>
      )}
    </div>
  );
}
