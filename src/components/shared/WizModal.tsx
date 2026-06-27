import { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../../game/GameContext';
import CharacterPortrait from './CharacterPortrait';
import { WIZ_CHARACTER, getPortfolio, getWizVoice } from '../../data/investments';
import { sfx } from '../../systems/AudioEngine';
import { formatMoney } from '../../utils/bigNumber';
import type { WizOffer } from '../../game/types';

interface Props {
  offer: WizOffer;
  cash: number;
  onClose: () => void;
}

const PRESETS = [100, 500, 1000, 5000, 10000, 50000];

function useCountdown(expiresAt?: number): number {
  const [msLeft, setMsLeft] = useState(() =>
    expiresAt ? Math.max(0, expiresAt - Date.now()) : Infinity,
  );
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setMsLeft(Math.max(0, expiresAt - Date.now())), 500);
    return () => clearInterval(id);
  }, [expiresAt]);
  return msLeft;
}

export function WizModal({ offer, cash, onClose }: Props) {
  const { dispatch } = useGame();
  const msLeft = useCountdown(offer.expiresAt);
  const secsLeft = Math.floor(msLeft / 1000);
  const hasTimer = offer.expiresAt !== undefined;

  const def = offer.portfolioId ? getPortfolio(offer.portfolioId) : undefined;
  const minBuy = def?.minBuy ?? 100;

  const affordablePresets = PRESETS.filter((p) => p <= cash && p >= minBuy);
  const [amount, setAmount] = useState<number>(
    affordablePresets.length > 0 ? affordablePresets[affordablePresets.length - 1] : minBuy,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (offer.kind === 'legendary') sfx.play('fanfare');
  }, [offer.kind]);

  const handleClose = useCallback(() => {
    sfx.play('toggle');
    onClose();
  }, [onClose]);

  const handleInvest = useCallback(() => {
    if (!offer.portfolioId) { handleClose(); return; }
    if (amount < minBuy || amount > cash) return;
    sfx.play('buy');
    dispatch({
      type: 'INV_BUY',
      portfolioId: offer.portfolioId,
      amount,
      priceBonus: offer.priceBonus ?? 1.0,
    });
    onClose();
  }, [dispatch, offer, amount, minBuy, cash, onClose, handleClose]);

  const handlePullOut = useCallback(() => {
    if (!offer.portfolioId) { handleClose(); return; }
    sfx.play('sell');
    dispatch({ type: 'INV_SELL', portfolioId: offer.portfolioId, fraction: 1.0 });
    onClose();
  }, [dispatch, offer, onClose, handleClose]);

  const handleDismiss = useCallback(() => {
    sfx.play('toggle');
    dispatch({ type: 'INV_DISMISS_OFFER' });
    onClose();
  }, [dispatch, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const accentCls = {
    legendary: 'border-amber-400 shadow-[0_0_40px_rgba(245,166,35,0.35)]',
    opportunity: 'border-emerald-400 shadow-[0_0_32px_rgba(74,222,128,0.25)]',
    warning: 'border-red-400 shadow-[0_0_32px_rgba(248,113,113,0.25)]',
    tip: 'border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.2)]',
  }[offer.kind];

  const headerBg = {
    legendary: 'from-amber-900/60 to-stone-900/80',
    opportunity: 'from-emerald-900/60 to-stone-900/80',
    warning: 'from-red-900/60 to-stone-900/80',
    tip: 'from-cyan-900/60 to-stone-900/80',
  }[offer.kind];

  const badgeStyle = {
    legendary: 'bg-amber-400/20 text-amber-300 border border-amber-400/40',
    opportunity: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40',
    warning: 'bg-red-400/20 text-red-300 border border-red-400/40',
    tip: 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40',
  }[offer.kind];

  const badgeLabel = {
    legendary: '🌟 ONCE IN A LIFETIME',
    opportunity: '⚡ LIMITED OPPORTUNITY',
    warning: '🚨 HEADS UP',
    tip: '💡 WIZ TIP',
  }[offer.kind];

  const canAfford = amount >= minBuy && amount <= cash;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-sm mx-auto mb-0 rounded-t-3xl border-t-2 border-x-2 ${accentCls} bg-gray-950 overflow-hidden`}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 bg-gradient-to-b ${headerBg} relative`}>
          <div className="flex items-center gap-3">
            <CharacterPortrait avatar={WIZ_CHARACTER.avatar} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-white text-sm leading-tight">{WIZ_CHARACTER.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wide ${badgeStyle}`}>
                  {badgeLabel}
                </span>
              </div>
              <p className="text-xs text-gray-400 italic truncate">{getWizVoice(offer.kind)}</p>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              x
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {hasTimer && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${secsLeft < 30 ? 'bg-red-500/20 border border-red-400/40' : 'bg-white/5 border border-white/10'}`}>
              <span className="text-xs text-gray-400">Window closes in</span>
              <span className={`font-mono font-bold text-sm ${secsLeft < 30 ? 'text-red-400' : 'text-white'}`}>
                {secsLeft > 0 ? `${secsLeft}s` : 'EXPIRED'}
              </span>
            </div>
          )}

          <div>
            <p className="text-lg font-bold text-white leading-snug">{offer.emoji} {offer.headline}</p>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">{offer.body}</p>
          </div>

          {def && offer.priceBonus && offer.priceBonus < 1 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
              <span className="text-emerald-400 font-bold text-sm">
                {def.emoji} {def.name} is {Math.round((1 - offer.priceBonus) * 100)}% OFF right now
              </span>
            </div>
          )}

          {/* Actions by kind */}
          {(offer.kind === 'opportunity' || offer.kind === 'legendary') && offer.portfolioId && (
            <>
              <div>
                <p className="text-xs text-gray-500 mb-2">Quick amounts</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => {
                    const tooSmall = p < minBuy;
                    const tooExpensive = p > cash;
                    const disabled = tooSmall || tooExpensive;
                    return (
                      <button
                        key={p}
                        disabled={disabled}
                        onClick={() => setAmount(p)}
                        className={`py-2 px-1 rounded-xl text-sm font-bold border transition-all ${
                          amount === p
                            ? offer.kind === 'legendary'
                              ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                              : 'bg-emerald-400/20 border-emerald-400 text-emerald-300'
                            : disabled
                            ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {formatMoney(p)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Custom amount</p>
                <input
                  ref={inputRef}
                  type="number"
                  value={amount}
                  min={minBuy}
                  max={cash}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                />
                {!canAfford && (
                  <p className="text-xs text-red-400 mt-1">
                    {amount < minBuy ? `Min $${minBuy.toLocaleString()}` : 'Not enough cash'}
                  </p>
                )}
              </div>

              <button
                disabled={!canAfford}
                onClick={handleInvest}
                className={`w-full py-3.5 rounded-2xl font-black text-base tracking-wide transition-all ${
                  offer.kind === 'legendary'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black disabled:opacity-40'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black disabled:opacity-40'
                }`}
              >
                {offer.kind === 'legendary' ? 'GO ALL IN' : 'INVEST NOW'}
              </button>
            </>
          )}

          {offer.kind === 'warning' && (
            <div className="flex gap-3">
              {offer.portfolioId && (
                <button
                  onClick={handlePullOut}
                  className="flex-1 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-red-600 to-rose-500 text-white"
                >
                  PULL OUT
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="flex-1 py-3 rounded-2xl font-black text-sm bg-white/10 text-gray-300 hover:bg-white/20"
              >
                GOT IT
              </button>
            </div>
          )}

          {offer.kind === 'tip' && (
            <button
              onClick={handleDismiss}
              className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
            >
              NOTED FR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
