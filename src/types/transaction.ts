// ─── Raw transaction as parsed from DeGiro CSV ───────────────────────────────
export interface DeGiroTransaction {
  date: Date;
  time: string;
  product: string;
  isin: string;
  referenceExchange: string; // Bolsa de referência
  venue: string;             // Bolsa (empty for corporate actions)
  quantity: number;          // positive = buy, negative = sell
  priceLocal: number;
  priceCurrency: string;
  localValue: number;        // absolute value in local currency
  localCurrency: string;
  eurValue: number;          // absolute EUR value (without fees), from "Valor EUR"
  exchangeRate: number;
  autoFxFee: number;         // signed, negative = cost
  transactionFee: number;    // signed, negative = cost
  totalEUR: number;          // signed total incl. all fees (neg = outflow/buy, pos = inflow/sell)
  orderId: string;
  isSplit: boolean;          // true for stock-split corporate action rows
  isBuy: boolean;            // derived: quantity > 0
  isSell: boolean;           // derived: quantity < 0
}

// ─── A single FIFO acquisition lot ──────────────────────────────────────────
export interface TaxLot {
  isin: string;
  product: string;
  acquisitionDate: Date;
  originalQuantity: number;   // total shares in this lot
  remainingQuantity: number;  // shares not yet matched to a sale
  eurValuePerShare: number;   // Valor EUR (clean) per share at acquisition
  feePerShare: number;        // acquisition fees (autoFx + transaction) per share
  acquisitionCostPerShare: number; // eurValuePerShare + feePerShare
  totalAcquisitionCostEUR: number; // remaining cost (for original lot full cost)
  orderId: string;
}

// ─── Holding-period reduction tier (OE2024 art. 43 n.3 CIRS) ────────────────
export interface HoldingTier {
  minDays: number;
  maxDays: number | null; // null = no upper bound
  exclusionRate: number;  // 0.5 = 50% of gain excluded from tax base
  labelPT: string;
  labelEN: string;
}

// ─── One FIFO lot matched against a sale ─────────────────────────────────────
export interface FifoMatch {
  lotAcquisitionDate: Date;
  lotOrderId: string;
  quantityMatched: number;
  acquisitionCostEUR: number;   // cost basis for this matched portion (clean EUR value + acq fees)
  buyFeeEUR: number;            // acquisition fees portion only (autoFx + transaction at buy)
  saleValueEUR: number;         // proceeds allocated to this portion
  saleFeeEUR: number;           // sale fees allocated to this portion
  holdingDays: number;
  holdingTier: HoldingTier;
  rawGainEUR: number;           // proceeds - cost (before exclusion)
  taxableGainEUR: number;       // rawGain * (1 - exclusionRate)
}

// ─── One fully-calculated taxable sale event ─────────────────────────────────
export interface TaxableSale {
  saleDate: Date;
  isin: string;
  product: string;
  countryCode: string; // first 2 chars of ISIN (e.g. "US", "IE")
  totalQuantitySold: number;
  grossProceedsEUR: number;  // Valor EUR from CSV (ex-fees)
  totalSaleFeeEUR: number;   // autoFx + transaction fees on the sale
  totalBuyFeeEUR: number;    // sum of buy-side fees for the matched lots
  netProceedsEUR: number;    // grossProceeds - totalSaleFee (not used for tax calc, informational)
  fifoMatches: FifoMatch[];
  totalAcquisitionCostEUR: number;
  totalRawGainEUR: number;
  totalTaxableGainEUR: number; // after holding period exclusions
  holdingPeriodReductionApplied: boolean;
  orderId: string;
}

// ─── Stock split event ───────────────────────────────────────────────────────
export interface SplitEvent {
  isin: string;
  product: string;
  date: Date;
  splitRatio: number; // e.g. 3 for a 3-for-1 split
}

// ─── Final tax summary for a fiscal year ─────────────────────────────────────
export interface TaxSummary {
  fiscalYear: number;
  sales: TaxableSale[];
  totalProceedsEUR: number;
  totalAcquisitionCostEUR: number;
  totalSaleFeesEUR: number;
  totalBuyFeesEUR: number;
  totalFeesEUR: number;
  totalRawGainEUR: number;
  totalTaxableGainEUR: number;      // after holding period exclusions
  priorYearLossEUR: number;         // user-supplied carryforward loss
  adjustedTaxableGainEUR: number;   // max(0, totalTaxableGainEUR - priorYearLossEUR)
  taxAtAutonomousRate: number;      // adjustedTaxableGain * 0.28
  isNetLoss: boolean;
}

// ─── Full portfolio lot state (returned alongside sales for display) ──────────
export interface PortfolioLotState {
  isin: string;
  product: string;
  acquisitionDate: Date;
  /** Quantity after split adjustments */
  totalQuantity: number;
  /** Shares consumed by ALL processed sells (before + during fiscal year) */
  consumedQuantity: number;
  /** Shares still in portfolio after the fiscal year */
  remainingQuantity: number;
  acquisitionCostPerShare: number;
  totalAcquisitionCostEUR: number;
  orderId: string;
}

// ─── App wizard state ────────────────────────────────────────────────────────
export type WizardStep = 'upload' | 'review' | 'results' | 'guide';

export interface ParseResult {
  transactions: DeGiroTransaction[];
  splitEvents: SplitEvent[];
  warnings: string[];
}
