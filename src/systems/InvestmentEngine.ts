import type { GameState, InvestmentState, PortfolioPrice, InvestmentHolding, WizOffer } from '../game/types';
import { PORTFOLIOS, WIZ_OFFERS, getPortfolio } from '../data/investments';

export function defaultInvestmentState(): InvestmentState {
  return {
    prices: PORTFOLIOS.map((p) => ({ id: p.id, price: 1.0, history: [1.0, 1.0, 1.0] })),
    holdings: [],
    wealthPortfolio: 0,
    realizedGains: 0,
    pendingOffer: null,
    lastOfferAt: 0,
    seenOffers: [],
  };
}

// Deterministic per-portfolio noise - golden-angle seed, no Math.random()
function sinNoise(now: number, id: string, salt: number): number {
  const seed = id.charCodeAt(0) * 137.508 + salt * 17.3;
  return Math.sin(now * 0.00037 + seed) * Math.cos(now * 0.00017 + seed * 1.61);
}

function tickPrice(pp: PortfolioPrice, dtSec: number, now: number): PortfolioPrice {
  const def = getPortfolio(pp.id);
  if (!def) return pp;
  const drift = (def.annualReturn / 31536000) * dtSec;
  const volFactor = def.dailyVol * Math.sqrt(dtSec / 86400);
  const noise = sinNoise(now, def.id, 1) * volFactor;
  const newPrice = Math.max(0.02, pp.price * (1 + drift + noise));
  return { id: pp.id, price: newPrice, history: [...pp.history, newPrice].slice(-60) };
}

function pickOffer(state: GameState, inv: InvestmentState, now: number, allowLegendary: boolean): WizOffer | null {
  const seenSet = new Set(inv.seenOffers.slice(-8));
  const le = state.lifetimeEarnings ?? 0;
  const eligible = WIZ_OFFERS.filter((t) => {
    if (seenSet.has(t.id)) return false;
    if ((t.unlockLE ?? 0) > le) return false;
    if (t.kind === 'legendary' && !allowLegendary) return false;
    return true;
  });
  if (eligible.length === 0) return null;
  const idx = Math.floor(Math.abs(Math.sin(now * 0.0001)) * eligible.length) % eligible.length;
  const t = eligible[idx];
  return {
    id: t.id,
    kind: t.kind,
    emoji: t.emoji,
    headline: t.headline,
    body: t.body,
    portfolioId: t.portfolioId,
    priceBonus: t.priceBonus,
    expiresAt: t.durationMs ? now + t.durationMs : undefined,
    createdAt: now,
  };
}

export function tickInvestments(state: GameState, dtSec: number, now: number): Partial<InvestmentState> {
  const inv = state.investments ?? defaultInvestmentState();
  const prices = inv.prices.map((pp) => tickPrice(pp, dtSec, now));
  const wealthPortfolio = inv.holdings.reduce((sum, h) => {
    const pp = prices.find((p) => p.id === h.portfolioId);
    return sum + (pp ? pp.price * h.units : h.invested);
  }, 0);

  let { pendingOffer, lastOfferAt, seenOffers } = inv;

  if (pendingOffer?.expiresAt && now > pendingOffer.expiresAt) pendingOffer = null;

  if (!pendingOffer && now - lastOfferAt > 5 * 60 * 1000) {
    const allowLegendary = now - lastOfferAt > 20 * 60 * 1000;
    const newOffer = pickOffer(state, inv, now, allowLegendary);
    if (newOffer) {
      pendingOffer = newOffer;
      lastOfferAt = now;
      seenOffers = [...seenOffers, newOffer.id].slice(-20);
    }
  }

  return { prices, wealthPortfolio, pendingOffer, lastOfferAt, seenOffers };
}

export function buyPortfolio(
  inv: InvestmentState,
  portfolioId: string,
  cashAmount: number,
  priceBonus: number,
  now: number,
): { newState: InvestmentState; cashSpent: number; error?: string } {
  const def = getPortfolio(portfolioId);
  if (!def) return { newState: inv, cashSpent: 0, error: 'Unknown portfolio' };
  if (cashAmount < def.minBuy) {
    return { newState: inv, cashSpent: 0, error: `Min buy is $${def.minBuy.toLocaleString()}` };
  }
  const currentPrice = inv.prices.find((p) => p.id === portfolioId)?.price ?? 1.0;
  const effectivePrice = currentPrice * Math.max(0.01, priceBonus);
  const units = cashAmount / effectivePrice;
  const existing = inv.holdings.find((h) => h.portfolioId === portfolioId);
  const holdings: InvestmentHolding[] = existing
    ? inv.holdings.map((h) =>
        h.portfolioId === portfolioId
          ? { ...h, units: h.units + units, invested: h.invested + cashAmount, at: now }
          : h,
      )
    : [...inv.holdings, { portfolioId, units, invested: cashAmount, at: now }];
  return { newState: { ...inv, holdings }, cashSpent: cashAmount };
}

export function sellPortfolio(
  inv: InvestmentState,
  portfolioId: string,
  unitFraction: number,
  now: number,
): { newState: InvestmentState; cashGained: number; error?: string } {
  const holding = inv.holdings.find((h) => h.portfolioId === portfolioId);
  if (!holding) return { newState: inv, cashGained: 0, error: 'No position to sell' };
  const currentPrice = inv.prices.find((p) => p.id === portfolioId)?.price ?? 1.0;
  const frac = Math.min(1, Math.max(0, unitFraction));
  const unitsSelling = holding.units * frac;
  const cashGained = unitsSelling * currentPrice;
  const costBasis = (unitsSelling / holding.units) * holding.invested;
  const remainingUnits = holding.units - unitsSelling;
  const holdings: InvestmentHolding[] =
    remainingUnits < 0.0001
      ? inv.holdings.filter((h) => h.portfolioId !== portfolioId)
      : inv.holdings.map((h) =>
          h.portfolioId === portfolioId
            ? { ...h, units: remainingUnits, invested: h.invested - costBasis }
            : h,
        );
  return {
    newState: { ...inv, holdings, realizedGains: inv.realizedGains + (cashGained - costBasis) },
    cashGained,
  };
}

export function getCurrentPrice(inv: InvestmentState, portfolioId: string): number {
  return inv.prices.find((p) => p.id === portfolioId)?.price ?? 1.0;
}

export function getHolding(inv: InvestmentState, portfolioId: string): InvestmentHolding | undefined {
  return inv.holdings.find((h) => h.portfolioId === portfolioId);
}

export function getPortfolioValue(inv: InvestmentState, portfolioId: string): number {
  const h = getHolding(inv, portfolioId);
  return h ? h.units * getCurrentPrice(inv, portfolioId) : 0;
}

export function getPortfolioReturn(inv: InvestmentState, portfolioId: string): { pct: number; abs: number } {
  const h = getHolding(inv, portfolioId);
  if (!h || h.invested <= 0) return { pct: 0, abs: 0 };
  const abs = getPortfolioValue(inv, portfolioId) - h.invested;
  return { pct: abs / h.invested, abs };
}
