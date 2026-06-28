// WillOverlay — The Old Master's Will.
// Shows: master identity, premise clauses with live status, contacts log,
// wealth tranches, and the handoff statement.

import { useGame, getIndustry } from '../../game/GameContext';
import { getOldMaster } from '../../data/oldMasters';
import { ALL_CLAUSE_CONFIGS } from '../../data/premises';
import { formatMoney, formatNumber } from '../../utils/bigNumber';

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  active:    { label: 'Active',    color: '#F5C842', icon: '⏳' },
  fulfilled: { label: 'Fulfilled', color: '#34d399', icon: '✅' },
  breached:  { label: 'Breached',  color: '#f87171', icon: '⚠️' },
};

// Wealth tranches shown as a milestone progress
const TRANCHES = [
  { label: 'Seed Capital',       value: 1_000 },
  { label: 'First Revenue',      value: 10_000 },
  { label: 'Early Growth',       value: 100_000 },
  { label: 'Series A Territory', value: 1_000_000 },
  { label: 'Unicorn Threshold',  value: 1_000_000_000 },
  { label: 'Titan Realm',        value: 1_000_000_000_000 },
];

export default function WillOverlay({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const industry = getIndustry(state);
  const master = getOldMaster(state.setup?.industry ?? 'tech');
  const premise = state.premise;
  const setup = state.setup;
  const le = state.lifetimeEarnings ?? 0;
  const cash = state.cash ?? 0;

  if (!master) return null;

  const clauses = premise
    ? ALL_CLAUSE_CONFIGS.filter(c =>
        !c.industrySpecific || c.industrySpecific === state.setup?.industry
      ).map(c => ({
        config: c,
        state: premise.clauses.find(pc => pc.id === c.id),
      }))
    : [];

  const contacts = master.contacts.filter(c =>
    (state.oldMaster?.contactsSeen ?? []).includes(c.id)
  );

  const currentTranche = TRANCHES.filter(t => le >= t.value).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(3,5,12,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          background: 'rgba(7,11,20,0.99)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Hero */}
        <div
          className="shrink-0 relative px-5 pt-5 pb-4 flex items-start gap-4"
          style={{
            background: `linear-gradient(160deg, ${master.accent}18, transparent 70%)`,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${master.accent}22`, border: `1.5px solid ${master.accent}44` }}
          >
            {master.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8a94a8] mb-0.5">
              Old Master's Will · {industry?.name ?? ''}
            </div>
            <div className="text-base font-bold text-[#e7ecf5]">{master.name}</div>
            <div className="text-[11px] font-medium mt-0.5" style={{ color: master.accent }}>
              {master.title}
            </div>
            <div className="text-[10px] text-[#3d4a62] mt-1">{master.status}</div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-[#8a94a8] text-sm"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto no-scrollbar flex-1 px-5">
          {/* Handoff quote */}
          <div
            className="my-4 rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, ${master.accent}10, ${master.accent}04)`,
              border: `1px solid ${master.accent}25`,
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: master.accent }}>
              Final Words
            </div>
            <blockquote className="text-[12px] text-[#c4cedd] leading-relaxed italic">
              "{master.handoff}"
            </blockquote>
          </div>

          {/* Wealth Tranches */}
          <div className="mb-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#3d4a62] mb-3">
              Wealth Tranches
            </div>
            <div className="flex flex-col gap-2">
              {TRANCHES.map((t, i) => {
                const unlocked = le >= t.value;
                const active = i === currentTranche - 1;
                return (
                  <div
                    key={t.label}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{
                      background: active
                        ? 'rgba(245,200,66,0.08)'
                        : unlocked ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? 'rgba(245,200,66,0.3)' : unlocked ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.04)'}`,
                    }}
                  >
                    <span className="text-sm shrink-0">{unlocked ? '✅' : '🔒'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-[#e7ecf5]">{t.label}</div>
                      <div className="text-[9px] text-[#8a94a8]">{formatMoney(t.value)}</div>
                    </div>
                    {active && (
                      <span className="shrink-0 text-[9px] font-bold text-[#F5C842] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(245,200,66,0.15)' }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premise Clauses */}
          {clauses.length > 0 && (
            <div className="mb-5">
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#3d4a62] mb-3">
                Will Clauses
              </div>
              <div className="flex flex-col gap-2">
                {clauses.map(({ config, state: cs }) => {
                  const status = cs?.status ?? 'active';
                  const meta = STATUS_META[status] ?? STATUS_META.active;
                  return (
                    <div
                      key={config.id}
                      className="rounded-2xl p-3.5"
                      style={{
                        background: status === 'fulfilled'
                          ? 'rgba(52,211,153,0.05)'
                          : status === 'breached'
                            ? 'rgba(248,113,113,0.06)'
                            : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${meta.color}30`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">{meta.icon}</span>
                        <span className="text-[12px] font-bold text-[#e7ecf5] flex-1">{config.label}</span>
                        <span
                          className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${meta.color}20`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8a94a8] leading-relaxed">
                        {config.description}
                      </div>
                      {(config.prod || config.costDiscount) && (
                        <div className="flex gap-2 mt-2">
                          {config.prod && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                              +{(config.prod * 100).toFixed(0)}% production
                            </span>
                          )}
                          {config.costDiscount && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
                              -{(config.costDiscount * 100).toFixed(0)}% cost
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Old Master Contacts received */}
          {contacts.length > 0 && (
            <div className="mb-5">
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#3d4a62] mb-3">
                Archive Messages
              </div>
              <div className="flex flex-col gap-2">
                {contacts.map(c => (
                  <div
                    key={c.id}
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{c.icon}</span>
                      <span className="text-[10px] font-bold text-[#8a94a8]">{c.source}</span>
                    </div>
                    <div className="text-[11px] text-[#c4cedd] leading-relaxed">{c.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empire metrics summary */}
          <div className="mb-6">
            <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#3d4a62] mb-3">
              Empire Status
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Cash on Hand', value: formatMoney(cash), icon: '💵' },
                { label: 'Lifetime Earned', value: formatMoney(le), icon: '📈' },
                { label: 'Prestige Count', value: formatNumber(state.prestigeCount), icon: '♻️' },
                { label: 'Legacy Points', value: formatNumber(state.legacyPoints), icon: '♾️' },
              ].map(m => (
                <div
                  key={m.label}
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="text-[9px] text-[#8a94a8] mb-0.5">{m.icon} {m.label}</div>
                  <div className="text-[13px] font-bold text-[#e7ecf5] font-mono">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
