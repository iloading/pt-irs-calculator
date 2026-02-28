// ─── Trade Republic Account Statement Parser ─────────────────────────────────
// The TR PDF extracts as exactly 3-line blocks per trade (after header removal).
// TWO structural patterns, determined by which line the action keyword lands on:
//
//  Pattern A — long description (desc wraps to 2 visual lines)
//     "DD Mon Savings plan execution / Sell trade / Buy trade  ISIN  PRODUCT..."
//     "Trade  €AMOUNT  €BALANCE"
//     "YYYY  product continuation, quantity: QTY"   ← or just "YYYY QTY" if desc fit on line A
//
//  Pattern B — short description (everything fits on one visual line)
//     "DD Mon"                                       ← date-only line
//     "Trade  Sell/Buy trade  ISIN  PRODUCT, quantity: QTY  €AMOUNT  €BALANCE"
//     "YYYY"
//
//  Anchor on the ACTION line (contains Sell trade / Buy trade / Savings plan execution):
//    • If action line starts with "DD Mon" → Pattern A → block = [this, +1, +2]
//    • If action line starts with "Trade " → Pattern B → block = [prev, this, +1]
//
//  This guarantees each block contains ONLY the 3 lines for one transaction —
//  never bleeds into adjacent rows.

import type { DeGiroTransaction, ParseResult, SplitEvent } from '../types/transaction';
import { getAvailableSaleYears } from './csvParser';

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const ISIN_RE    = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/;
const QTY_RE     = /quantity:\s*([\d.]+)/i;
const EUR_RE     = /€([\d,]+\.\d{2})/;
const ACTION_RE  = /(Sell trade|Buy trade|Savings plan execution)/i;
// Line starting with "DD Mon …"
const DAY_MON_START_RE = /^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;
const DAY_MON_RE = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;
const YEAR_RE    = /\b(202\d)\b/;

const SKIP_RE =
  /TRADE REPUBLIC BANK GMBH|Brunnenstra|www\.traderepublic|AG Charlottenburg|Andreas Torner|Gernot Mittendorfer|Christian Hecker|Thomas Pischke|Generated on|Page \d+ from|DATE\s+TYPE\s+DESCRIPTION|ACCOUNT TRANSACTIONS|ACCOUNT STATEMENT SUMMARY|PRODUCT\s+OPENING|BALANCE OVERVIEW|ESCROW ACCOUNTS|NOTES ON THE ACCOUNT/i;

function parseEUR(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

// ─── Find every trade block (exactly 3 lines each) ───────────────────────────

function findBlocks(lines: string[]): Array<{ idx: number; block: string[] }> {
  const result: Array<{ idx: number; block: string[] }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!ACTION_RE.test(line)) continue;

    if (DAY_MON_START_RE.test(line)) {
      // Pattern A: action is on the "DD Mon …" line → block = [i, i+1, i+2]
      result.push({ idx: i, block: lines.slice(i, Math.min(i + 3, lines.length)) });
    } else if (/^Trade\s+/i.test(line)) {
      // Pattern B: action is on the "Trade Sell/Buy …" line → block = [i-1, i, i+1]
      result.push({
        idx: Math.max(0, i - 1),
        block: lines.slice(Math.max(0, i - 1), Math.min(i + 2, lines.length)),
      });
    }
  }

  return result;
}

// ─── Parse one 3-line block into a transaction ───────────────────────────────

function parseBlock(block: string[], idx: number): DeGiroTransaction | null {
  const combined = block.join(' ');

  // ISIN
  const isinM = ISIN_RE.exec(combined);
  if (!isinM) return null;
  const isin = isinM[1];

  // Action
  const actionM = ACTION_RE.exec(combined);
  if (!actionM) return null;
  const isSell = actionM[1].toLowerCase() === 'sell trade';

  // Quantity:
  //   Primary — "quantity: NUMBER" inline (Patterns A long and B)
  //   Fallback — bare number on the "YYYY NUMBER" continuation line (Pattern A short:
  //              "25 Nov … TESLA …, quantity:" wraps with number on next line as "2024 0.008402")
  let qtyAbs = 0;
  const qtyM = QTY_RE.exec(combined);
  if (qtyM) {
    qtyAbs = parseFloat(qtyM[1]);
  } else {
    // Fallback: last line matches exactly "YYYY NUMBER" with nothing else
    for (let j = block.length - 1; j >= 0; j--) {
      const m = /^202\d\s+([\d.]+)\s*$/.exec(block[j].trim());
      if (m) { qtyAbs = parseFloat(m[1]); break; }
    }
  }
  if (!qtyAbs || isNaN(qtyAbs)) return null;

  // EUR amount — must come ONLY from the correct line, never from the combined
  // string (which could theoretically include context from adjacent rows if ever
  // the window shifted). Two sources, in priority order:
  //   1. The action line itself contains "€" → Pattern B (short desc):
  //      "Trade Sell trade … quantity: 19  €5,072.00  €16,609.26"  → first € = amount ✓
  //   2. The "Trade €X" dedicated amount line → Pattern A (long desc):
  //      "Trade €1,982.16 €11,457.01"  → first € = amount ✓
  const actionLine      = block.find((l) => ACTION_RE.test(l));
  const tradeAmountLine = block.find((l) => /^Trade\s+€/i.test(l));

  let amount = 0;
  if (actionLine && EUR_RE.test(actionLine)) {
    amount = parseEUR(EUR_RE.exec(actionLine)![1]);
  } else if (tradeAmountLine) {
    amount = parseEUR(EUR_RE.exec(tradeAmountLine)![1]);
  }
  if (!amount || isNaN(amount)) return null;

  // Date
  const dmM = DAY_MON_RE.exec(combined);
  if (!dmM) return null;
  const day   = parseInt(dmM[1], 10);
  const month = MONTH_MAP[dmM[2].toLowerCase()] ?? -1;
  if (month === -1) return null;

  const yrM = YEAR_RE.exec(combined);
  if (!yrM) return null;
  const year = parseInt(yrM[1], 10);

  // Product name: text between ISIN and "quantity:" (trimmed)
  const isinPos  = combined.indexOf(isin);
  const afterISIN = combined.slice(isinPos + isin.length).trimStart();
  const qtyPos   = afterISIN.toLowerCase().indexOf('quantity:');
  let product = qtyPos > 0
    ? afterISIN.slice(0, qtyPos).trim().replace(/[,.\s]+$/, '')
    : afterISIN.slice(0, 60).trim().replace(/[,.\s]+$/, '');
  if (!product) product = isin;

  const qty = isSell ? -qtyAbs : qtyAbs;

  return {
    date: new Date(year, month, day),
    time: '00:00',
    product,
    isin,
    referenceExchange: '',
    venue: 'TRADE REPUBLIC',
    quantity: qty,
    priceLocal: amount / qtyAbs,
    priceCurrency: 'EUR',
    localValue: amount,
    localCurrency: 'EUR',
    eurValue: amount,
    exchangeRate: 1,
    autoFxFee: 0,
    transactionFee: 0,
    totalEUR: isSell ? amount : -amount,
    orderId: `tr-${idx}`,
    isSplit: false,
    isBuy: !isSell,
    isSell,
  };
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function parseTradeRepublicPDF(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const clean = lines.filter((l) => l.trim() && !SKIP_RE.test(l));
  const blocks = findBlocks(clean);

  const transactions: DeGiroTransaction[] = [];
  const seen = new Set<string>();

  for (const { idx, block } of blocks) {
    const tx = parseBlock(block, idx);
    if (!tx) {
      warnings.push(`Could not parse block at line ${idx}: "${block[0]?.slice(0, 80)}". Skipped.`);
      continue;
    }
    // Deduplicate: same date + ISIN + qty = same transaction
    const key = `${tx.date.toISOString().slice(0, 10)}_${tx.isin}_${Math.abs(tx.quantity)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    transactions.push(tx);
  }

  if (transactions.length === 0) {
    warnings.push('No investment transactions found. Make sure you uploaded the full "Account Statement" PDF from Trade Republic.');
    return { transactions: [], splitEvents: [], warnings };
  }

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  const splitEvents: SplitEvent[] = [];
  if (!transactions.some((t) => t.isSell)) {
    warnings.push('No sell transactions found in this statement. Nothing to calculate for IRS purposes yet.');
  }

  return { transactions, splitEvents, warnings };
}

export { getAvailableSaleYears };
