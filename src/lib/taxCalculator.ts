import type { TaxableSale, TaxSummary } from '../types/transaction';
import { AUTONOMOUS_RATE } from './holdingPeriodTiers';

// 2025 IRS progressive brackets (continental Portugal)
// Source: OE2025 / CIRS art. 68
export const PROGRESSIVE_BRACKETS = [
  { upTo: 8_059, rate: 0.1325 },
  { upTo: 12_160, rate: 0.18 },
  { upTo: 17_233, rate: 0.23 },
  { upTo: 22_306, rate: 0.26 },
  { upTo: 28_400, rate: 0.3275 },
  { upTo: 41_629, rate: 0.37 },
  { upTo: 44_987, rate: 0.435 },
  { upTo: 83_696, rate: 0.45 },
  { upTo: Infinity, rate: 0.48 },
];

/** Calculate IRS tax using progressive brackets for a given taxable income */
export function calcProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of PROGRESSIVE_BRACKETS) {
    if (taxableIncome <= prev) break;
    const slice = Math.min(taxableIncome, bracket.upTo) - prev;
    tax += slice * bracket.rate;
    prev = bracket.upTo;
  }
  return tax;
}

/** Marginal rate at a given income level */
export function marginalRate(income: number): number {
  for (const bracket of PROGRESSIVE_BRACKETS) {
    if (income <= bracket.upTo) return bracket.rate;
  }
  return 0.48;
}

// ─── Build the full tax summary for a fiscal year ────────────────────────────
export function buildTaxSummary(
  sales: TaxableSale[],
  fiscalYear: number
): TaxSummary {
  const totalProceedsEUR = sales.reduce((s, sale) => s + sale.grossProceedsEUR, 0);
  const totalAcquisitionCostEUR = sales.reduce((s, sale) => s + sale.totalAcquisitionCostEUR, 0);
  const totalSaleFeesEUR = sales.reduce((s, sale) => s + sale.totalSaleFeeEUR, 0);
  const totalRawGainEUR = sales.reduce((s, sale) => s + sale.totalRawGainEUR, 0);
  const totalTaxableGainEUR = sales.reduce((s, sale) => s + sale.totalTaxableGainEUR, 0);

  const isNetLoss = totalTaxableGainEUR <= 0;
  const taxAtAutonomousRate = isNetLoss ? 0 : totalTaxableGainEUR * AUTONOMOUS_RATE;

  return {
    fiscalYear,
    sales,
    totalProceedsEUR,
    totalAcquisitionCostEUR,
    totalSaleFeesEUR,
    totalRawGainEUR,
    totalTaxableGainEUR,
    taxAtAutonomousRate,
    isNetLoss,
  };
}

// ─── Englobamento comparison ─────────────────────────────────────────────────
export interface EnglobamentoResult {
  grossOtherIncome: number;
  taxWithoutGains: number;        // progressive tax on other income only
  taxWithGains: number;           // progressive tax on (other income + gains)
  marginalRateOnGains: number;    // effective additional rate for the gains
  gainsTaxUnderEnglobamento: number;
  gainsTaxUnderAutonomous: number;
  englobamentoIsBetter: boolean;
  saving: number;                 // positive = autonomous is better, negative = englobamento better
}

export function compareEnglobamento(
  taxableGain: number,
  grossOtherIncome: number
): EnglobamentoResult {
  const taxWithoutGains = calcProgressiveTax(grossOtherIncome);
  const taxWithGains = calcProgressiveTax(grossOtherIncome + taxableGain);
  const gainsTaxUnderEnglobamento = taxWithGains - taxWithoutGains;
  const gainsTaxUnderAutonomous = taxableGain > 0 ? taxableGain * AUTONOMOUS_RATE : 0;
  const marginalRateOnGains = taxableGain > 0 ? gainsTaxUnderEnglobamento / taxableGain : 0;
  const englobamentoIsBetter = gainsTaxUnderEnglobamento < gainsTaxUnderAutonomous;

  return {
    grossOtherIncome,
    taxWithoutGains,
    taxWithGains,
    marginalRateOnGains,
    gainsTaxUnderEnglobamento,
    gainsTaxUnderAutonomous,
    englobamentoIsBetter,
    saving: gainsTaxUnderAutonomous - gainsTaxUnderEnglobamento,
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
export function formatEUR(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
