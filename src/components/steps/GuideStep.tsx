import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { formatEUR, formatDate } from '@/lib/taxCalculator';
import { cn } from '@/lib/utils';
import type { TaxableSale, TaxSummary } from '@/types/transaction';

interface GuideStepProps {
  summary: TaxSummary;
  onBack: () => void;
  onRestart: () => void;
}

// ─── Filing rows: one per FIFO lot per sale ──────────────────────────────────
interface FilingRow {
  saleDate: Date;
  countryCode: string;
  isin: string;
  product: string;
  acquisitionDate: Date;
  realizationValue: number;
  acquisitionCost: number;
  rawGain: number;
  quantityMatched: number;
  totalSaleQty: number;
  holdingTierLabel: string;
  exclusionRate: number;
}

function buildFilingRows(sales: TaxableSale[]): FilingRow[] {
  const rows: FilingRow[] = [];
  for (const sale of sales) {
    if (sale.fifoMatches.length === 1) {
      const m = sale.fifoMatches[0];
      rows.push({
        saleDate: sale.saleDate,
        countryCode: sale.countryCode,
        isin: sale.isin,
        product: sale.product,
        acquisitionDate: m.lotAcquisitionDate,
        realizationValue: m.saleValueEUR,
        acquisitionCost: m.acquisitionCostEUR,
        rawGain: m.rawGainEUR,
        quantityMatched: m.quantityMatched,
        totalSaleQty: sale.totalQuantitySold,
        holdingTierLabel: m.holdingTier.labelPT,
        exclusionRate: m.holdingTier.exclusionRate,
      });
    } else {
      // Multiple FIFO lots → one row per lot
      for (const m of sale.fifoMatches) {
        rows.push({
          saleDate: sale.saleDate,
          countryCode: sale.countryCode,
          isin: sale.isin,
          product: sale.product,
          acquisitionDate: m.lotAcquisitionDate,
          realizationValue: m.saleValueEUR,
          acquisitionCost: m.acquisitionCostEUR,
          rawGain: m.rawGainEUR,
          quantityMatched: m.quantityMatched,
          totalSaleQty: sale.totalQuantitySold,
          holdingTierLabel: m.holdingTier.labelPT,
          exclusionRate: m.holdingTier.exclusionRate,
        });
      }
    }
  }
  return rows;
}

// ─── Copy-to-clipboard cell helper ───────────────────────────────────────────
function CopyCell({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <td className="px-3 py-2 group relative">
      <div className="flex items-center justify-end gap-1">
        <span className="font-mono tabular-nums">{value}</span>
        <button
          onClick={copy}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-muted"
          title={t.guideCopyValue}
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </div>
    </td>
  );
}

// ─── Collapsible guide step ───────────────────────────────────────────────────
function GuideAccordion({
  stepNumber,
  title,
  body,
  defaultOpen = false,
}: {
  stepNumber: number;
  title: string;
  body: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
          {stepNumber}
        </span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 py-4">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
            {body}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function GuideStep({ summary, onBack, onRestart }: GuideStepProps) {
  const { t, lang } = useI18n();
  const filingRows = buildFilingRows(summary.sales);
  const hasMultipleLots = summary.sales.some((s) => s.fifoMatches.length > 1);

  const guideSteps = [
    { title: t.guideStep1Title, body: t.guideStep1Body },
    { title: t.guideStep2Title, body: t.guideStep2Body },
    { title: t.guideStep3Title, body: t.guideStep3Body },
    { title: t.guideStep4Title, body: t.guideStep4Body },
    { title: t.guideStep5Title, body: t.guideStep5Body },
    { title: t.guideStep6Title, body: t.guideStep6Body },
    { title: t.guideStep7Title, body: t.guideStep7Body },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t.guideTitle}</h2>
        <p className="text-muted-foreground mt-1">{t.guideSubtitle}</p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-sm p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        {t.guideDisclaimer}
      </div>

      {/* Multiple lots note */}
      {hasMultipleLots && (
        <div className="flex items-start gap-2 text-sm p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {t.guideMultipleLotsNote}
        </div>
      )}

      {/* Quick reference filing table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t.guideFilingTable}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1 print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            {t.printSummary}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border print:border-black">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColCountry}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColISIN}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColDesc}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColAcqDate}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColSaleDate}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.guideColRealization}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.guideColAcqCost}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.guideColGain}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.resultsLotQty}</th>
              </tr>
            </thead>
            <tbody>
              {filingRows.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold">{row.countryCode}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.isin}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate" title={row.product}>
                    {row.product}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.acquisitionDate)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.saleDate)}</td>
                  <CopyCell value={row.realizationValue.toFixed(2)} />
                  <CopyCell value={row.acquisitionCost.toFixed(2)} />
                  <td
                    className={cn(
                      'px-3 py-2 text-right font-semibold',
                      row.rawGain >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatEUR(row.rawGain)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.quantityMatched}</td>
                </tr>
              ))}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr className="border-t bg-muted/40 font-semibold">
                <td colSpan={5} className="px-3 py-2">
                  Total
                </td>
                <td className="px-3 py-2 text-right">
                  {filingRows.reduce((s, r) => s + r.realizationValue, 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {filingRows.reduce((s, r) => s + r.acquisitionCost, 0).toFixed(2)}
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right',
                    filingRows.reduce((s, r) => s + r.rawGain, 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {formatEUR(filingRows.reduce((s, r) => s + r.rawGain, 0))}
                </td>
                <td className="px-3 py-2 text-right">
                  {filingRows.reduce((s, r) => s + r.quantityMatched, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 {lang === 'pt' ? 'Passe o cursor sobre os valores para os copiar directamente para a área de transferência.' : 'Hover over values to copy them directly to clipboard.'}
        </p>
      </div>

      {/* Step-by-step accordion */}
      <div className="space-y-2">
        {guideSteps.map((step, idx) => (
          <GuideAccordion
            key={idx}
            stepNumber={idx + 1}
            title={step.title}
            body={step.body}
            defaultOpen={idx === 0}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between print:hidden">
        <Button variant="outline" onClick={onBack}>
          {t.back}
        </Button>
        <Button variant="outline" onClick={onRestart}>
          {t.restart}
        </Button>
      </div>
    </div>
  );
}
