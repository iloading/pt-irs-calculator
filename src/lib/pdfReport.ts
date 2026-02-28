// ─── PDF / Print Report Generator ─────────────────────────────────────────────
// Generates a self-contained HTML page and opens it in a new window for
// print-to-PDF. No external dependencies required.

import type { TaxSummary } from '../types/transaction';
import { formatDate } from './taxCalculator';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function dateStr(d: Date) {
  return formatDate(d);
}

function gainColor(v: number) {
  return v >= 0 ? '#16a34a' : '#dc2626';
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function openPdfReport(summary: TaxSummary, lang: string) {
  const isPT = lang === 'pt';

  // ── Filing rows (Q9.2) ───────────────────────────────────────────────────
  interface FilingRow {
    country: string;
    isin: string;
    product: string;
    acqDate: Date;
    saleDate: Date;
    realization: number;
    acqCost: number;
    rawGain: number;
    qty: number;
  }
  const filingRows: FilingRow[] = [];
  for (const sale of summary.sales) {
    for (const m of sale.fifoMatches) {
      filingRows.push({
        country: sale.countryCode,
        isin: sale.isin,
        product: sale.product,
        acqDate: m.lotAcquisitionDate,
        saleDate: sale.saleDate,
        realization: m.saleValueEUR,
        acqCost: m.acquisitionCostEUR,
        rawGain: m.rawGainEUR,
        qty: m.quantityMatched,
      });
    }
  }

  // Row-per-asset per-year summary of multi-year already in TaxSummary,
  // just use summary.sales grouped by ISIN for the per-asset table.
  interface AssetRow {
    isin: string;
    product: string;
    proceeds: number;
    cost: number;
    rawGain: number;
    taxableGain: number;
  }
  const assetMap = new Map<string, AssetRow>();
  for (const sale of summary.sales) {
    const row = assetMap.get(sale.isin) ?? {
      isin: sale.isin,
      product: sale.product,
      proceeds: 0,
      cost: 0,
      rawGain: 0,
      taxableGain: 0,
    };
    row.proceeds += sale.grossProceedsEUR;
    row.cost += sale.totalAcquisitionCostEUR;
    row.rawGain += sale.totalRawGainEUR;
    row.taxableGain += sale.totalTaxableGainEUR;
    assetMap.set(sale.isin, row);
  }
  const assetRows = Array.from(assetMap.values());

  const hasPriorLoss = summary.priorYearLossEUR > 0;

  const generated = new Date().toLocaleDateString(isPT ? 'pt-PT' : 'en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const labels = {
    title: isPT ? `Relatório Fiscal IRS ${summary.fiscalYear}` : `IRS Tax Report ${summary.fiscalYear}`,
    generated: isPT ? `Gerado em ${generated}` : `Generated on ${generated}`,
    disclaimer: isPT
      ? 'Para fins informativos. Confirme sempre com um TOC/ROC antes de submeter.'
      : 'For informational purposes only. Always confirm with a certified accountant.',
    summary: isPT ? 'Resumo fiscal' : 'Tax summary',
    proceeds: isPT ? 'Valor de realização' : 'Realisation value',
    cost: isPT ? 'Custo de aquisição' : 'Acquisition cost',
    fees: isPT ? 'Custos de transação' : 'Transaction fees',
    rawGain: isPT ? 'Mais-valia bruta' : 'Gross capital gain',
    taxableGain: isPT ? 'Mais-valia tributável (antes da dedução)' : 'Taxable gain (before deduction)',
    priorLoss: isPT ? 'Perdas de anos anteriores' : 'Prior year losses',
    adjustedGain: isPT ? 'Mais-valia tributável ajustada' : 'Adjusted taxable gain',
    tax28: isPT ? 'Imposto estimado (taxa autónoma 28%)' : 'Estimated tax (autonomous rate 28%)',
    q92title: isPT ? 'Valores para Quadro 9.2 (Alienação de valores mobiliários)' : 'Values for Quadro 9.2 (Securities disposal)',
    assets: isPT ? 'Detalhe por ativo' : 'Per-asset detail',
    country: isPT ? 'País' : 'Country',
    isin: 'ISIN',
    desc: isPT ? 'Designação' : 'Description',
    acqDate: isPT ? 'Data aquis.' : 'Acq. date',
    saleDate: isPT ? 'Data alieção' : 'Sale date',
    realization: isPT ? 'Valor realiz. (€)' : 'Realisation (€)',
    acqCost: isPT ? 'Custo aquis. (€)' : 'Acq. cost (€)',
    gain: isPT ? 'Mais-valia (€)' : 'Gain (€)',
    qty: isPT ? 'Qtd.' : 'Qty.',
    total: 'Total',
    notes: isPT ? 'Notas' : 'Notes',
    notesFIFO: isPT
      ? 'O cálculo usa o método FIFO conforme CIRS art. 43.'
      : 'Calculation uses FIFO method per CIRS art. 43.',
    notesQ92: isPT
      ? 'Para o Quadro 9.2 do Anexo J: preencha uma linha por lote FIFO. Os valores de realização são distribuídos proporcionalmente à quantidade do lote.'
      : 'For Quadro 9.2 of Annex J: fill one row per FIFO lot. Realisation values are proportionally allocated by lot quantity.',
  };

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20mm 18mm; }
    h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 24px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 6px; }
    .disclaimer { font-size: 10px; color: #92400e; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 6px 10px; margin-bottom: 16px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
    .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
    .card-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 15px; font-weight: 700; margin-top: 2px; }
    .card-value.pos { color: #16a34a; }
    .card-value.neg { color: #dc2626; }
    .card-value.accent { color: #1d4ed8; }
    .prior-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; }
    th { background: #f8fafc; font-weight: 600; text-align: left; padding: 5px 8px; border: 1px solid #e2e8f0; white-space: nowrap; }
    td { padding: 4px 8px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f9fafb; }
    .right { text-align: right; }
    .mono { font-family: monospace; }
    .tfoot td { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #cbd5e1; }
    .note { font-size: 10px; color: #64748b; margin-top: 4px; }
    @page { margin: 15mm 12mm; }
    @media print {
      body { padding: 0; }
      h2 { break-before: avoid; }
      table { break-inside: avoid; }
    }
  `;

  const summaryCards = [
    { label: labels.proceeds, value: fmt(summary.totalProceedsEUR), cls: '' },
    { label: labels.cost, value: fmt(summary.totalAcquisitionCostEUR), cls: '' },
    { label: labels.fees, value: fmt(summary.totalFeesEUR), cls: '' },
    { label: labels.rawGain, value: fmt(summary.totalRawGainEUR), cls: summary.totalRawGainEUR >= 0 ? 'pos' : 'neg' },
    { label: labels.taxableGain, value: fmt(summary.totalTaxableGainEUR), cls: summary.totalTaxableGainEUR >= 0 ? 'pos' : 'neg' },
    { label: labels.tax28, value: fmt(summary.taxAtAutonomousRate), cls: 'neg' },
  ];

  const cardsHtml = summaryCards.map((c) =>
    `<div class="card"><div class="card-label">${escHtml(c.label)}</div><div class="card-value ${c.cls}">${escHtml(c.value)}</div></div>`
  ).join('');

  const priorHtml = hasPriorLoss ? `
    <div class="prior-box">
      <strong>${escHtml(labels.priorLoss)}:</strong> ${fmt(summary.priorYearLossEUR)} &nbsp;→&nbsp;
      <strong>${escHtml(labels.adjustedGain)}:</strong> <span style="color:#1d4ed8">${fmt(summary.adjustedTaxableGainEUR)}</span>
      &nbsp;&nbsp;<strong>${escHtml(labels.tax28)}:</strong> <span style="color:#dc2626">${fmt(summary.taxAtAutonomousRate)}</span>
    </div>` : '';

  const assetTableRows = assetRows.map((r) =>
    `<tr>
      <td class="mono">${escHtml(r.isin)}</td>
      <td>${escHtml(r.product)}</td>
      <td class="right">${fmt(r.proceeds)}</td>
      <td class="right">${fmt(r.cost)}</td>
      <td class="right" style="color:${gainColor(r.rawGain)}">${fmt(r.rawGain)}</td>
      <td class="right" style="color:${gainColor(r.taxableGain)};font-weight:700">${fmt(r.taxableGain)}</td>
    </tr>`
  ).join('');

  const filingTableRows = filingRows.map((r) =>
    `<tr>
      <td>${escHtml(r.country)}</td>
      <td class="mono">${escHtml(r.isin)}</td>
      <td>${escHtml(r.product)}</td>
      <td>${dateStr(r.acqDate)}</td>
      <td>${dateStr(r.saleDate)}</td>
      <td class="right">${r.realization.toFixed(2)}</td>
      <td class="right">${r.acqCost.toFixed(2)}</td>
      <td class="right" style="color:${gainColor(r.rawGain)}">${fmt(r.rawGain)}</td>
      <td class="right">${r.qty}</td>
    </tr>`
  ).join('');

  const filingTotals = filingRows.reduce(
    (acc, r) => ({ realization: acc.realization + r.realization, cost: acc.cost + r.acqCost, gain: acc.gain + r.rawGain, qty: acc.qty + r.qty }),
    { realization: 0, cost: 0, gain: 0, qty: 0 }
  );

  const html = `<!DOCTYPE html>
<html lang="${isPT ? 'pt' : 'en'}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escHtml(labels.title)}</title>
  <style>${css}</style>
</head>
<body>
  <h1>${escHtml(labels.title)}</h1>
  <p class="meta">${escHtml(labels.generated)}</p>
  <div class="disclaimer">⚠️ ${escHtml(labels.disclaimer)}</div>

  <h2>${escHtml(labels.summary)}</h2>
  <div class="summary-grid">${cardsHtml}</div>
  ${priorHtml}

  <h2>${escHtml(labels.assets)}</h2>
  <table>
    <thead>
      <tr>
        <th>${escHtml(labels.isin)}</th>
        <th>${escHtml(labels.desc)}</th>
        <th class="right">${escHtml(labels.proceeds)}</th>
        <th class="right">${escHtml(labels.cost)}</th>
        <th class="right">${escHtml(labels.rawGain)}</th>
        <th class="right">${escHtml(labels.taxableGain)}</th>
      </tr>
    </thead>
    <tbody>${assetTableRows}</tbody>
  </table>

  <h2>${escHtml(labels.q92title)}</h2>
  <table>
    <thead>
      <tr>
        <th>${escHtml(labels.country)}</th>
        <th>${escHtml(labels.isin)}</th>
        <th>${escHtml(labels.desc)}</th>
        <th>${escHtml(labels.acqDate)}</th>
        <th>${escHtml(labels.saleDate)}</th>
        <th class="right">${escHtml(labels.realization)}</th>
        <th class="right">${escHtml(labels.acqCost)}</th>
        <th class="right">${escHtml(labels.gain)}</th>
        <th class="right">${escHtml(labels.qty)}</th>
      </tr>
    </thead>
    <tbody>${filingTableRows}</tbody>
    <tfoot>
      <tr class="tfoot">
        <td colspan="5">${escHtml(labels.total)}</td>
        <td class="right">${filingTotals.realization.toFixed(2)}</td>
        <td class="right">${filingTotals.cost.toFixed(2)}</td>
        <td class="right" style="color:${gainColor(filingTotals.gain)}">${fmt(filingTotals.gain)}</td>
        <td class="right">${filingTotals.qty}</td>
      </tr>
    </tfoot>
  </table>
  <p class="note">💡 ${escHtml(labels.notesQ92)}</p>

  <h2>${escHtml(labels.notes)}</h2>
  <p class="note">• ${escHtml(labels.notesFIFO)}</p>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      win.print();
    });
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
