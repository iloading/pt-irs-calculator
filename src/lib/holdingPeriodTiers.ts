import type { HoldingTier } from '../types/transaction';

/**
 * Holding-period exclusion tiers introduced by OE2024 (amendments to CIRS art. 43, n.º 3).
 *
 * These reductions apply to ALL listed shares and ETFs.
 *
 * Only exception (CIRS art. 43, n.º 3 in fine):
 * If the asset was held for LESS than 365 days AND the taxpayer’s taxable income
 * equals or exceeds the top IRS bracket (€83,696 in 2025), these exclusions do NOT apply.
 *
 * The app does not auto-detect that edge case — a note is shown to the user.
 */
export const HOLDING_PERIOD_TIERS: HoldingTier[] = [
  {
    minDays: 0,
    maxDays: 2 * 365 - 1,
    exclusionRate: 0,
    labelPT: '< 2 anos',
    labelEN: '< 2 years',
  },
  {
    minDays: 2 * 365,
    maxDays: 5 * 365 - 1,
    exclusionRate: 0.1,
    labelPT: '2–5 anos',
    labelEN: '2–5 years',
  },
  {
    minDays: 5 * 365,
    maxDays: 8 * 365 - 1,
    exclusionRate: 0.2,
    labelPT: '5–8 anos',
    labelEN: '5–8 years',
  },
  {
    minDays: 8 * 365,
    maxDays: null,
    exclusionRate: 0.3,
    labelPT: '≥ 8 anos',
    labelEN: '≥ 8 years',
  },
];

export function getHoldingTier(holdingDays: number): HoldingTier {
  for (const tier of [...HOLDING_PERIOD_TIERS].reverse()) {
    if (holdingDays >= tier.minDays) return tier;
  }
  return HOLDING_PERIOD_TIERS[0];
}

/** Autonomous tax rate in Portugal (Categoria G, foreign income) */
export const AUTONOMOUS_RATE = 0.28;
