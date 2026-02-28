import type { DeGiroTransaction, ParseResult, SplitEvent } from '../types/transaction';

// ─── RFC-4180 CSV parser that handles quoted fields with commas ───────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Portuguese number format: "1.234,56" → 1234.56 ────────────────────────
function parsePortugueseNumber(raw: string): number {
  if (!raw || raw === '' || raw === '-') return 0;
  // Remove thousand-separator dots, convert decimal comma to dot
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ─── Parse "DD-MM-YYYY" ──────────────────────────────────────────────────────
function parseDate(raw: string): Date {
  const [day, month, year] = raw.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ─── Extract a UUID from the last few columns ─────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extractOrderId(cols: string[]): string {
  for (let i = cols.length - 1; i >= 0; i--) {
    if (UUID_RE.test(cols[i])) return cols[i];
  }
  return '';
}

// ─── Detect stock split rows ─────────────────────────────────────────────────
// Split rows have: empty venue, no order ID, autoFx = 0, no transaction fee
function isSplitRow(cols: string[]): boolean {
  const venue = cols[5] ?? '';
  const orderId = extractOrderId(cols);
  const autoFxFee = cols[13] ?? '';
  const txFee = cols[14] ?? '';
  return venue === '' && orderId === '' && (autoFxFee === '0,00' || autoFxFee === '0') && txFee === '';
}

// ─── Detect and return split events from matching split-row pairs ─────────────
function detectSplitEvents(rows: DeGiroTransaction[]): SplitEvent[] {
  const splitRows = rows.filter((r) => r.isSplit);
  const events: SplitEvent[] = [];

  // Group by ISIN + date
  const groups = new Map<string, DeGiroTransaction[]>();
  for (const row of splitRows) {
    const key = `${row.isin}_${row.date.toISOString().slice(0, 10)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue;
    // Find the "new shares" row (larger positive quantity) and "old shares" row (negative quantity)
    const incoming = group.find((r) => r.quantity > 0);
    const outgoing = group.find((r) => r.quantity < 0);
    if (!incoming || !outgoing) continue;
    const ratio = Math.round(incoming.quantity / Math.abs(outgoing.quantity));
    if (ratio >= 2) {
      events.push({
        isin: incoming.isin,
        product: incoming.product,
        date: incoming.date,
        splitRatio: ratio,
      });
    }
  }
  return events;
}

// ─── Main CSV parse function ─────────────────────────────────────────────────
export function parseDeGiroCSV(csvText: string): ParseResult {
  const warnings: string[] = [];
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { transactions: [], splitEvents: [], warnings: ['CSV file appears to be empty.'] };
  }

  // Skip header line
  const dataLines = lines.slice(1);
  const transactions: DeGiroTransaction[] = [];

  for (let lineIdx = 0; lineIdx < dataLines.length; lineIdx++) {
    const line = dataLines[lineIdx];
    const cols = parseCSVLine(line);

    if (cols.length < 12) continue;

    const rawDate = cols[0];
    if (!rawDate || !rawDate.match(/^\d{2}-\d{2}-\d{4}$/)) continue;

    const splitRow = isSplitRow(cols);
    const quantity = parsePortugueseNumber(cols[6]);
    const priceLocal = parsePortugueseNumber(cols[7]);
    const priceCurrency = cols[8] ?? '';
    const localValue = Math.abs(parsePortugueseNumber(cols[9]));
    const localCurrency = cols[10] ?? '';
    const eurValue = Math.abs(parsePortugueseNumber(cols[11]));
    const exchangeRate = parsePortugueseNumber(cols[12]);
    const autoFxFee = parsePortugueseNumber(cols[13]);
    const transactionFee = parsePortugueseNumber(cols[14]);
    const totalEUR = parsePortugueseNumber(cols[15]);

    if (isNaN(quantity) || quantity === 0) continue;

    const tx: DeGiroTransaction = {
      date: parseDate(rawDate),
      time: cols[1] ?? '',
      product: cols[2] ?? '',
      isin: cols[3] ?? '',
      referenceExchange: cols[4] ?? '',
      venue: cols[5] ?? '',
      quantity,
      priceLocal,
      priceCurrency,
      localValue,
      localCurrency,
      eurValue,
      exchangeRate,
      autoFxFee,
      transactionFee,
      totalEUR,
      orderId: extractOrderId(cols),
      isSplit: splitRow,
      isBuy: quantity > 0 && !splitRow,
      isSell: quantity < 0 && !splitRow,
    };

    // Sanity check: for non-split rows, if ISIN is missing, warn
    if (!tx.isin && !tx.isSplit) {
      warnings.push(`Line ${lineIdx + 2}: missing ISIN, skipping.`);
      continue;
    }

    transactions.push(tx);
  }

  // Sort oldest-first for FIFO processing
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  const splitEvents = detectSplitEvents(transactions);

  return { transactions, splitEvents, warnings };
}

// ─── Filter to only sales in a given fiscal year ─────────────────────────────
export function getSalesForYear(
  transactions: DeGiroTransaction[],
  year: number
): DeGiroTransaction[] {
  return transactions.filter(
    (tx) => tx.isSell && tx.date.getFullYear() === year
  );
}

// ─── Get all available fiscal years that have sell transactions ───────────────
export function getAvailableSaleYears(transactions: DeGiroTransaction[]): number[] {
  const years = new Set<number>();
  for (const tx of transactions) {
    if (tx.isSell) years.add(tx.date.getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}
