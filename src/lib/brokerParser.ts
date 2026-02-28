// ─── Broker-agnostic file parser ─────────────────────────────────────────────
// Detects whether an uploaded file is a DeGiro CSV or a Trade Republic PDF,
// then dispatches to the appropriate parser and returns a unified ParseResult.

import type { ParseResult } from '../types/transaction';
import { parseDeGiroCSV, getAvailableSaleYears } from './csvParser';
import { extractPDFLines } from './pdfExtractor';
import { parseTradeRepublicPDF } from './tradeRepublicParser';

export type BrokerFormat = 'degiro' | 'traderepublic';

export interface BrokerParseResult {
  format: BrokerFormat;
  result: ParseResult;
}

// ─── DeGiro CSV detection ─────────────────────────────────────────────────────
// A valid DeGiro export always starts with a comma-separated header whose
// first field is "Datum" (NL), "Date" (EN), or "Data" (PT).
function isDeGiroCSV(text: string): boolean {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  return /^"?(?:Datum|Date|Data)"?,/i.test(firstLine.trim());
}

// ─── Trade Republic PDF detection ────────────────────────────────────────────
// The account statement always contains "TRADE REPUBLIC BANK GMBH" near the top.
function isTradeRepublicPDF(lines: string[]): boolean {
  return lines.slice(0, 10).some((l) => /TRADE REPUBLIC BANK GMBH/i.test(l));
}

// ─── Main entry point ─────────────────────────────────────────────────────────
/**
 * Parse a file uploaded by the user.
 * Supports:
 *   • DeGiro — any .csv export (Transactions history)
 *   • Trade Republic — "Account Statement" PDF (lifetime export)
 *
 * Throws a descriptive Error if the file is not recognised.
 */
export async function parseBrokerFile(file: File): Promise<BrokerParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // ── CSV path ───────────────────────────────────────────────────────────────
  if (ext === 'csv' || file.type === 'text/csv') {
    const text = await file.text();
    if (!isDeGiroCSV(text)) {
      throw new Error(
        'This CSV does not look like a DeGiro transaction export. ' +
          'Please export from Portfolio → Transactions and try again.'
      );
    }
    return { format: 'degiro', result: parseDeGiroCSV(text) };
  }

  // ── PDF path ───────────────────────────────────────────────────────────────
  if (ext === 'pdf' || file.type === 'application/pdf') {
    const lines = await extractPDFLines(file);

    if (!isTradeRepublicPDF(lines)) {
      throw new Error(
        'This PDF does not appear to be a Trade Republic account statement. ' +
          'Please export the full "Account Statement" from the Trade Republic app.'
      );
    }

    return { format: 'traderepublic', result: parseTradeRepublicPDF(lines) };
  }

  throw new Error(
    'Unsupported file type. Please upload a DeGiro CSV (.csv) or a Trade Republic account statement (.pdf).'
  );
}

export { getAvailableSaleYears };
