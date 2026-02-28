import type {
  DeGiroTransaction,
  TaxLot,
  FifoMatch,
  TaxableSale,
  SplitEvent,
  PortfolioLotState,
} from '../types/transaction';
import { getHoldingTier } from './holdingPeriodTiers';

// ─── Build FIFO lot queues from all BUY transactions ─────────────────────────
function buildLotQueues(
  transactions: DeGiroTransaction[],
  splitEvents: SplitEvent[]
): Map<string, TaxLot[]> {
  const queues = new Map<string, TaxLot[]>();

  // Sort ascending by date (already sorted from parser, but be safe)
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const tx of sorted) {
    if (!tx.isBuy) continue;
    if (!queues.has(tx.isin)) queues.set(tx.isin, []);

    const qty = tx.quantity; // positive for BUY
    // totalEUR is negative for a buy (money out), so we take the absolute value
    const totalCostEUR = Math.abs(tx.totalEUR);
    // eurValue is the clean EUR value (without fees), also absolute
    const cleanEurValue = tx.eurValue;
    // fees:  autoFxFee + transactionFee (both are negative/zero values in CSV)
    const totalFees = Math.abs(tx.autoFxFee) + Math.abs(tx.transactionFee);

    const lot: TaxLot = {
      isin: tx.isin,
      product: tx.product,
      acquisitionDate: tx.date,
      originalQuantity: qty,
      remainingQuantity: qty,
      eurValuePerShare: cleanEurValue / qty,
      feePerShare: totalFees / qty,
      acquisitionCostPerShare: totalCostEUR / qty,
      totalAcquisitionCostEUR: totalCostEUR,
      orderId: tx.orderId,
    };

    queues.get(tx.isin)!.push(lot);
  }

  // Apply stock splits: adjust lot quantities and per-share costs
  for (const split of splitEvents) {
    const lots = queues.get(split.isin);
    if (!lots) continue;
    // Only adjust lots acquired BEFORE the split date
    for (const lot of lots) {
      if (lot.acquisitionDate < split.date) {
        lot.remainingQuantity *= split.splitRatio;
        lot.originalQuantity *= split.splitRatio;
        lot.eurValuePerShare /= split.splitRatio;
        lot.feePerShare /= split.splitRatio;
        lot.acquisitionCostPerShare /= split.splitRatio;
      }
    }
  }

  return queues;
}

// ─── Day difference between two dates ────────────────────────────────────────
function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

// ─── Process one SELL transaction using FIFO ─────────────────────────────────
function processSell(
  tx: DeGiroTransaction,
  lotQueue: TaxLot[],
  applyHoldingReductions: boolean
): { matches: FifoMatch[]; warnings: string[] } {
  const warnings: string[] = [];
  const matches: FifoMatch[] = [];
  let remainingToSell = Math.abs(tx.quantity); // positive number of shares to match

  // Gross proceeds (clean EUR, no fees)
  const grossProceedsEUR = tx.eurValue;
  const totalSaleFeeEUR = Math.abs(tx.autoFxFee) + Math.abs(tx.transactionFee);
  const proceedsPerShare = grossProceedsEUR / Math.abs(tx.quantity);
  const saleFeePerShare = totalSaleFeeEUR / Math.abs(tx.quantity);

  for (const lot of lotQueue) {
    if (remainingToSell <= 0) break;
    if (lot.remainingQuantity <= 0) continue;

    const matched = Math.min(lot.remainingQuantity, remainingToSell);
    lot.remainingQuantity -= matched;
    remainingToSell -= matched;

    const acquisitionCostEUR = matched * lot.acquisitionCostPerShare;
    const saleValueEUR = matched * proceedsPerShare;
    const saleFeeEUR = matched * saleFeePerShare;

    const holdingDays = daysBetween(lot.acquisitionDate, tx.date);
    const tier = getHoldingTier(holdingDays);
    const exclusionRate = applyHoldingReductions ? tier.exclusionRate : 0;

    // Net proceeds - acquisition cost = raw gain
    const rawGainEUR = saleValueEUR - saleFeeEUR - acquisitionCostEUR;
    const taxableGainEUR = rawGainEUR * (1 - exclusionRate);

    matches.push({
      lotAcquisitionDate: lot.acquisitionDate,
      lotOrderId: lot.orderId,
      quantityMatched: matched,
      acquisitionCostEUR,
      saleValueEUR,
      saleFeeEUR,
      holdingDays,
      holdingTier: { ...tier, exclusionRate },
      rawGainEUR,
      taxableGainEUR,
    });
  }

  if (remainingToSell > 0) {
    warnings.push(
      `Could not find enough acquisition lots for ${tx.product} (ISIN ${tx.isin}) ` +
        `on ${tx.date.toISOString().slice(0, 10)}. ` +
        `Missing ${remainingToSell} shares. Cost basis may be incomplete.`
    );
  }

  return { matches, warnings };
}

// ─── Main FIFO calculation function ─────────────────────────────────────────
export function calculateFIFO(
  transactions: DeGiroTransaction[],
  splitEvents: SplitEvent[],
  fiscalYear: number,
  applyHoldingReductions: boolean
): { sales: TaxableSale[]; warnings: string[]; portfolioSnapshot: Map<string, PortfolioLotState[]> } {
  const allWarnings: string[] = [];

  // Build mutable lot queues from ALL buys (including those before fiscal year)
  const lotQueues = buildLotQueues(transactions, splitEvents);

  // Snapshot original total quantities BEFORE any sells consume them
  const originalQuantities = new Map<string, Map<string, number>>(); // isin → orderId+date → qty
  for (const [isin, lots] of lotQueues) {
    const m = new Map<string, number>();
    lots.forEach((lot, idx) => {
      m.set(`${idx}`, lot.originalQuantity);
    });
    originalQuantities.set(isin, m);
  }

  // Process ALL sells chronologically — even those before fiscal year —
  // so that lot queues are correctly depleted before we reach the fiscal year
  const allSells = transactions
    .filter((tx) => tx.isSell)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const taxableSales: TaxableSale[] = [];

  for (const tx of allSells) {
    const queue = lotQueues.get(tx.isin);
    if (!queue) {
      if (tx.date.getFullYear() === fiscalYear) {
        allWarnings.push(
          `No acquisition lots found for ${tx.product} (${tx.isin}). ` +
            `Cannot compute cost basis for sale on ${tx.date.toISOString().slice(0, 10)}.`
        );
      }
      continue;
    }

    const { matches, warnings } = processSell(tx, queue, applyHoldingReductions);
    allWarnings.push(...warnings);

    // Only include in final results if this sale is in the target fiscal year
    if (tx.date.getFullYear() !== fiscalYear) continue;

    const grossProceedsEUR = tx.eurValue;
    const totalSaleFeeEUR = Math.abs(tx.autoFxFee) + Math.abs(tx.transactionFee);
    const totalAcqCost = matches.reduce((s, m) => s + m.acquisitionCostEUR, 0);
    const totalRawGain = matches.reduce((s, m) => s + m.rawGainEUR, 0);
    const totalTaxableGain = matches.reduce((s, m) => s + m.taxableGainEUR, 0);
    const reductionApplied = matches.some((m) => m.holdingTier.exclusionRate > 0);

    taxableSales.push({
      saleDate: tx.date,
      isin: tx.isin,
      product: tx.product,
      countryCode: tx.isin.slice(0, 2).toUpperCase(),
      totalQuantitySold: Math.abs(tx.quantity),
      grossProceedsEUR,
      totalSaleFeeEUR,
      netProceedsEUR: grossProceedsEUR - totalSaleFeeEUR,
      fifoMatches: matches,
      totalAcquisitionCostEUR: totalAcqCost,
      totalRawGainEUR: totalRawGain,
      totalTaxableGainEUR: totalTaxableGain,
      holdingPeriodReductionApplied: reductionApplied,
      orderId: tx.orderId,
    });
  }

  // Build portfolio snapshot: show ALL lots (consumed + remaining) per ISIN
  const portfolioSnapshot = new Map<string, PortfolioLotState[]>();
  for (const [isin, lots] of lotQueues) {
    const origMap = originalQuantities.get(isin)!;
    const states: PortfolioLotState[] = lots.map((lot, idx) => {
      const origQty = origMap.get(`${idx}`) ?? lot.originalQuantity;
      return {
        isin: lot.isin,
        product: lot.product,
        acquisitionDate: lot.acquisitionDate,
        totalQuantity: origQty,
        consumedQuantity: origQty - lot.remainingQuantity,
        remainingQuantity: lot.remainingQuantity,
        acquisitionCostPerShare: lot.acquisitionCostPerShare,
        totalAcquisitionCostEUR: origQty * lot.acquisitionCostPerShare,
        orderId: lot.orderId,
      };
    });
    portfolioSnapshot.set(isin, states);
  }

  return { sales: taxableSales, warnings: allWarnings, portfolioSnapshot };
}
