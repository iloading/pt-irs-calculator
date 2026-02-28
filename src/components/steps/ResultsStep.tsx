import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Info,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { useI18n } from '@/lib/i18n';
import {
  formatEUR,
  formatDate,
  formatPercent,
  compareEnglobamento,
  buildTaxSummary,
} from '@/lib/taxCalculator';
import { calculateFIFO } from '@/lib/fifoCalculator';
import { getAvailableSaleYears } from '@/lib/brokerParser';
import { openPdfReport } from '@/lib/pdfReport';
import { cn } from '@/lib/utils';
import type { FifoMatch, ParseResult, PortfolioLotState, TaxSummary, TaxableSale } from '@/types/transaction';

interface ResultsStepProps {
  parseResult: ParseResult;
  selectedYear: number;
  onBack: () => void;
  onContinue: (summary: TaxSummary) => void;
}

function HoldingLabel({ days, t }: { days: number; t: { days: string } }) {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years >= 1) {
    return (
      <span>
        {years}a {months > 0 ? `${months}m` : ''} ({days} {t.days})
      </span>
    );
  }
  const months2 = Math.floor(days / 30);
  return (
    <span>
      {months2}m ({days} {t.days})
    </span>
  );
}

// ─── Full lot breakdown: consumed by this sale + all remaining portfolio lots ──
function AllLotsDetail({
  matches,
  portfolioLots,
  t,
  lang,
}: {
  matches: FifoMatch[];
  portfolioLots: PortfolioLotState[];
  t: ReturnType<typeof useI18n>['t'];
  lang: string;
}) {
  // Build a lookup: acqDate.getTime() → FifoMatch for this sale
  const matchByDate = new Map<number, FifoMatch>();
  for (const m of matches) {
    matchByDate.set(m.lotAcquisitionDate.getTime(), m);
  }

  const soldLabel = lang === 'pt' ? 'Vendido nesta operação' : 'Sold in this operation';
  const holdLabel = lang === 'pt' ? 'Em carteira' : 'In portfolio';
  const priorLabel = lang === 'pt' ? 'Vendido anteriormente' : 'Sold previously';

  return (
    <tr>
      <td colSpan={99} className="p-0">
        <div className="bg-muted/30 border-t">
          {/* ── Part 1: lots sold in THIS operation (with gain detail) ───────── */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {lang === 'pt' ? `Lotes FIFO consumidos nesta venda (${matches.length})` : `FIFO lots consumed by this sale (${matches.length})`}
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/60">
                <th className="px-4 py-1.5 text-left font-medium">{t.resultsLotAcqDate}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotQty}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotHolding}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotTier}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotExclusion}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotAcqCost}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotProceeds}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotRawGain}</th>
                <th className="px-4 py-1.5 text-right font-medium">{t.resultsLotTaxableGain}</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, idx) => (
                <tr key={idx} className="border-b last:border-0 bg-amber-500/5">
                  <td className="px-4 py-1.5 font-medium">{formatDate(m.lotAcquisitionDate)}</td>
                  <td className="px-4 py-1.5 text-right">{m.quantityMatched}</td>
                  <td className="px-4 py-1.5 text-right">
                    <HoldingLabel days={m.holdingDays} t={t} />
                  </td>
                  <td className="px-4 py-1.5 text-right text-muted-foreground">
                    {m.holdingTier.labelPT}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {m.holdingTier.exclusionRate > 0 ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {formatPercent(m.holdingTier.exclusionRate)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 text-right">{formatEUR(m.acquisitionCostEUR)}</td>
                  <td className="px-4 py-1.5 text-right">{formatEUR(m.saleValueEUR)}</td>
                  <td
                    className={cn(
                      'px-4 py-1.5 text-right font-medium',
                      m.rawGainEUR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatEUR(m.rawGainEUR)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-1.5 text-right font-semibold',
                      m.taxableGainEUR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatEUR(m.taxableGainEUR)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Part 2: all remaining & prior lots ───────────────────────── */}
          {portfolioLots.filter((lot) => !matchByDate.has(lot.acquisitionDate.getTime())).length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {lang === 'pt' ? 'Todos os lotes do ativo' : 'All lots for this asset'}
                </p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="px-4 py-1.5 text-left font-medium">{t.resultsLotAcqDate}</th>
                    <th className="px-4 py-1.5 text-right font-medium">{lang === 'pt' ? 'Total lote' : 'Lot total'}</th>
                    <th className="px-4 py-1.5 text-right font-medium">{lang === 'pt' ? 'Vendido' : 'Sold'}</th>
                    <th className="px-4 py-1.5 text-right font-medium">{lang === 'pt' ? 'Em carteira' : 'In portfolio'}</th>
                    <th className="px-4 py-1.5 text-right font-medium">{lang === 'pt' ? 'Custo/ação' : 'Cost/share'}</th>
                    <th className="px-4 py-1.5 text-right font-medium">{lang === 'pt' ? 'Custo total' : 'Total cost'}</th>
                    <th className="px-4 py-1.5 text-left font-medium">{lang === 'pt' ? 'Estado' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioLots
                    .filter((lot) => !matchByDate.has(lot.acquisitionDate.getTime()))
                    .map((lot, idx) => {
                      const isConsumed = lot.remainingQuantity === 0;
                      const isPartial = lot.consumedQuantity > 0 && lot.remainingQuantity > 0;
                      const isInThisSale = matchByDate.has(lot.acquisitionDate.getTime());
                      const label = isInThisSale ? soldLabel : isConsumed ? priorLabel : holdLabel;
                      return (
                        <tr
                          key={idx}
                          className={cn(
                            'border-b last:border-0',
                            isConsumed && !isInThisSale && 'opacity-50',
                            !isConsumed && 'bg-green-500/5'
                          )}
                        >
                          <td className="px-4 py-1.5">{formatDate(lot.acquisitionDate)}</td>
                          <td className="px-4 py-1.5 text-right">{lot.totalQuantity}</td>
                          <td className="px-4 py-1.5 text-right text-muted-foreground">
                            {lot.consumedQuantity > 0 ? lot.consumedQuantity : '—'}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-1.5 text-right font-medium',
                              lot.remainingQuantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                            )}
                          >
                            {lot.remainingQuantity > 0 ? lot.remainingQuantity : '—'}
                          </td>
                          <td className="px-4 py-1.5 text-right">
                            {formatEUR(lot.acquisitionCostPerShare)}
                          </td>
                          <td className="px-4 py-1.5 text-right">
                            {formatEUR(lot.remainingQuantity * lot.acquisitionCostPerShare)}
                          </td>
                          <td className="px-4 py-1.5">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs font-medium',
                                isInThisSale && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                                !isInThisSale && isConsumed && !isPartial && 'bg-muted text-muted-foreground',
                                !isInThisSale && isPartial && 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
                                !isInThisSale && !isConsumed && 'bg-green-500/15 text-green-700 dark:text-green-400'
                              )}
                            >
                              {label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function ResultsStep({ parseResult, selectedYear, onBack, onContinue }: ResultsStepProps) {
  const { t, lang } = useI18n();
  const [applyHoldingReductions, setApplyHoldingReductions] = useState(false);
  const [taxMethod, setTaxMethod] = useState<'autonomous' | 'englobamento'>('autonomous');
  const [otherIncome, setOtherIncome] = useState<number>(22000);
  const [irsJovemYear, setIrsJovemYear] = useState<number>(0);
  const [priorYearLossEUR, setPriorYearLossEUR] = useState<number>(0);
  const [showPriorLoss, setShowPriorLoss] = useState(false);
  const [showMultiYear, setShowMultiYear] = useState(false);

  function irsJovemExemptionRate(year: number): number {
    if (year === 1) return 1.0;       // 100% — OE2025
    if (year <= 4) return 0.75;       // 75%  — anos 2-4
    if (year <= 7) return 0.50;       // 50%  — anos 5-7
    if (year <= 10) return 0.25;      // 25%  — anos 8-10
    return 0;
  }

  const irsJovemExemption = irsJovemExemptionRate(irsJovemYear);
  const effectiveOtherIncome = irsJovemYear > 0
    ? otherIncome * (1 - irsJovemExemption)
    : otherIncome;
  const [expandedIsins, setExpandedIsins] = useState<Set<string>>(new Set());

  const { sales, warnings, portfolioSnapshot } = calculateFIFO(
    parseResult.transactions,
    parseResult.splitEvents,
    selectedYear,
    applyHoldingReductions
  );

  const summary = buildTaxSummary(sales, selectedYear, priorYearLossEUR);
  const englobamento = compareEnglobamento(summary.adjustedTaxableGainEUR, effectiveOtherIncome);

  // Multi-year comparison: compute for all years with sales
  const allYearsSummaries = useMemo(() => {
    const years = getAvailableSaleYears(parseResult.transactions);
    return years.map((year) => {
      const { sales: ySales } = calculateFIFO(
        parseResult.transactions,
        parseResult.splitEvents,
        year,
        false,
      );
      return { year, summary: buildTaxSummary(ySales, year, 0) };
    });
  }, [parseResult]);

  const toggleExpand = (isin: string) => {
    setExpandedIsins((prev) => {
      const next = new Set(prev);
      if (next.has(isin)) next.delete(isin);
      else next.add(isin);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t.resultsTitle}</h2>
        <p className="text-muted-foreground mt-1">
          {t.resultsYear}: <strong>{selectedYear}</strong>
        </p>
      </div>

      {/* FIFO warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm font-medium flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" /> {t.uploadWarnings}
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard label={t.resultsProceeds} value={formatEUR(summary.totalProceedsEUR)} />
        <SummaryCard label={t.resultsCost} value={formatEUR(summary.totalAcquisitionCostEUR)} />
        <SummaryCard
          label={t.resultsFees}
          value={formatEUR(summary.totalFeesEUR)}
          tooltip={
            lang === 'pt'
              ? `Compras: ${formatEUR(summary.totalBuyFeesEUR)} · Vendas: ${formatEUR(summary.totalSaleFeesEUR)}`
              : `Buys: ${formatEUR(summary.totalBuyFeesEUR)} · Sells: ${formatEUR(summary.totalSaleFeesEUR)}`
          }
        />
        <SummaryCard
          label={t.resultsRawGain}
          value={formatEUR(summary.totalRawGainEUR)}
          variant={summary.totalRawGainEUR >= 0 ? 'positive' : 'negative'}
          icon={summary.totalRawGainEUR >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        />
        <SummaryCard
          label={t.resultsTaxableGain}
          value={priorYearLossEUR > 0 ? formatEUR(summary.adjustedTaxableGainEUR) : formatEUR(summary.totalTaxableGainEUR)}
          crossedValue={priorYearLossEUR > 0 ? formatEUR(summary.totalTaxableGainEUR) : undefined}
          variant={priorYearLossEUR > 0
            ? (summary.adjustedTaxableGainEUR >= 0 ? 'positive' : 'negative')
            : (summary.totalTaxableGainEUR >= 0 ? 'positive' : 'negative')}
          subValue={priorYearLossEUR > 0
            ? (lang === 'pt'
                ? `Após dedução de ${formatEUR(priorYearLossEUR)} em perdas anteriores`
                : `After deducting ${formatEUR(priorYearLossEUR)} in prior losses`)
            : undefined}
          tooltip={priorYearLossEUR > 0
            ? (lang === 'pt'
                ? `${formatEUR(summary.totalTaxableGainEUR)} − ${formatEUR(priorYearLossEUR)} = ${formatEUR(summary.adjustedTaxableGainEUR)}`
                : `${formatEUR(summary.totalTaxableGainEUR)} − ${formatEUR(priorYearLossEUR)} = ${formatEUR(summary.adjustedTaxableGainEUR)}`)
            : undefined}
        />
        {summary.isNetLoss ? (
          <SummaryCard
            label={t.resultsNetLoss}
            value={formatEUR(Math.abs(summary.totalTaxableGainEUR))}
            variant="negative"
            subValue={t.resultsLossNote}
          />
        ) : taxMethod === 'englobamento' ? (
          <SummaryCard
            label={lang === 'pt' ? 'Imposto (englobamento)' : 'Tax (englobamento)'}
            value={formatEUR(englobamento.gainsTaxUnderEnglobamento)}
            crossedValue={
              englobamento.gainsTaxUnderEnglobamento !== summary.taxAtAutonomousRate
                ? formatEUR(summary.taxAtAutonomousRate)
                : undefined
            }
            variant="negative"
            subValue={`${formatPercent(englobamento.marginalRateOnGains)} · ${
              englobamento.englobamentoIsBetter
                ? (lang === 'pt' ? `poupa ${formatEUR(Math.abs(englobamento.saving))} vs 28%` : `saves ${formatEUR(Math.abs(englobamento.saving))} vs 28%`)
                : (lang === 'pt' ? `+${formatEUR(Math.abs(englobamento.saving))} vs 28%` : `+${formatEUR(Math.abs(englobamento.saving))} vs 28%`)
            }`}
          />
        ) : (
          <SummaryCard
            label={t.resultsTax28}
            value={formatEUR(summary.taxAtAutonomousRate)}
            variant="negative"
          />
        )}
      </div>

      {/* Prior year carryforward losses */}
      <div className="rounded-xl border overflow-hidden">
        <button
          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          onClick={() => setShowPriorLoss((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{t.priorLossTitle}</h3>
            {priorYearLossEUR > 0 && (
              <span className="text-xs bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                −{formatEUR(priorYearLossEUR)}
              </span>
            )}
          </div>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showPriorLoss && 'rotate-180')} />
        </button>
        <div className={cn('grid transition-all duration-200', showPriorLoss ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="overflow-hidden">
            <div className="px-4 py-3 space-y-3 border-t">
              <div className="space-y-1.5">
                <Label className="text-sm">{t.priorLossInput}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={priorYearLossEUR || ''}
                    onChange={(e) => setPriorYearLossEUR(Math.max(0, Number(e.target.value)))}
                    placeholder="0.00"
                    className="w-44"
                  />
                  {priorYearLossEUR > 0 && (
                    <button
                      type="button"
                      onClick={() => setPriorYearLossEUR(0)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {priorYearLossEUR > 0 && !summary.isNetLoss && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <div className="text-xs text-muted-foreground">{t.priorLossAdjustedGain}</div>
                    <div className={cn('font-bold mt-0.5', summary.adjustedTaxableGainEUR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {formatEUR(summary.adjustedTaxableGainEUR)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-green-500/10 border-green-500/30">
                    <div className="text-xs text-muted-foreground">{t.priorLossSaving}</div>
                    <div className="font-bold mt-0.5 text-green-600 dark:text-green-400">
                      {formatEUR(Math.min(priorYearLossEUR, Math.max(0, summary.totalTaxableGainEUR)) * 0.28)}
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t.priorLossNote}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loss note */}
      {summary.isNetLoss && (
        <div className="flex items-start gap-2 text-sm p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          {t.resultsLossNote}
        </div>
      )}

      {/* Holding period reduction toggle */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-semibold text-sm">{t.resultsHoldingReduction}</h3>
          <div className="flex items-center gap-2">
            <Switch
              id="holding-reduction-switch"
              checked={applyHoldingReductions}
              onCheckedChange={setApplyHoldingReductions}
            />
            <Label htmlFor="holding-reduction-switch" className="text-sm cursor-pointer select-none">
              {t.resultsHoldingReductionToggle}
            </Label>
          </div>
        </div>

        {/* Tier table — always visible */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-medium">
                  {lang === 'pt' ? 'Prazo de detenção' : 'Holding period'}
                </th>
                <th className="px-3 py-2 text-center font-medium">
                  {lang === 'pt' ? 'Exclusão da mais-valia' : 'Gain exclusion'}
                </th>
                <th className="px-3 py-2 text-center font-medium">
                  {lang === 'pt' ? 'Tributável' : 'Taxable portion'}
                </th>
                <th className="px-3 py-2 text-center font-medium">
                  {lang === 'pt' ? 'Taxa efetiva' : 'Effective rate'}
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { period: lang === 'pt' ? '< 2 anos' : '< 2 years',       excl: 0,    active: false },
                { period: lang === 'pt' ? '2 – 5 anos' : '2 – 5 years',   excl: 0.10, active: true  },
                { period: lang === 'pt' ? '5 – 8 anos' : '5 – 8 years',   excl: 0.20, active: true  },
                { period: lang === 'pt' ? '≥ 8 anos' : '≥ 8 years',       excl: 0.30, active: true  },
              ].map((row) => (
                <tr
                  key={row.period}
                  className={cn(
                    'border-b last:border-0',
                    row.active && applyHoldingReductions
                      ? 'bg-green-500/8 text-green-800 dark:text-green-300'
                      : 'text-muted-foreground'
                  )}
                >
                  <td className="px-3 py-2 font-medium text-foreground">{row.period}</td>
                  <td className="px-3 py-2 text-center">
                    {row.excl > 0
                      ? <span className="font-semibold text-green-700 dark:text-green-400">{(row.excl * 100).toFixed(0)}%</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {((1 - row.excl) * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-center font-medium">
                    {((1 - row.excl) * 0.28 * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
          <span>{t.resultsHoldingReductionWarning}</span>
        </div>
      </div>

      {/* Tax method comparison */}
      <div className="rounded-xl border p-4 space-y-4">
        <h3 className="font-semibold text-sm">{t.resultsTaxMethod}</h3>
        <div className="flex gap-2">
          <Button
            variant={taxMethod === 'autonomous' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setTaxMethod('autonomous')}
          >
            {t.resultsAutonomous}
          </Button>
          <Button
            variant={taxMethod === 'englobamento' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setTaxMethod('englobamento')}
          >
            {t.resultsEnglobamento}
          </Button>
        </div>

        {taxMethod === 'englobamento' && (
          <div className="space-y-3">
            {summary.isNetLoss ? (
              <p className="text-sm text-muted-foreground">{t.resultsEnglobamentoNoGain}</p>
            ) : (
              <>
                {/* IRS Jovem year selector */}
                <div className="space-y-2 p-2.5 rounded-lg border bg-muted/10">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id="irs-jovem-checkbox"
                      checked={irsJovemYear > 0}
                      onCheckedChange={(v) => setIrsJovemYear(v ? 1 : 0)}
                    />
                    <Label htmlFor="irs-jovem-checkbox" className="text-xs font-semibold cursor-pointer">
                      {t.resultsIRSJovemToggle}
                    </Label>
                  </div>
                  {irsJovemYear > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {[1,2,3,4,5,6,7,8,9,10].map((yr) => {
                          const rate = irsJovemExemptionRate(yr);
                          const pct = `${(rate * 100).toFixed(0)}%`;
                          return (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => setIrsJovemYear(yr)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
                                irsJovemYear === yr
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-muted hover:border-primary/50'
                              )}
                            >
                              {lang === 'pt' ? `${yr}.º ano` : `Year ${yr}`}
                              <span className="ml-1 opacity-70">({pct})</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs p-2 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                        {t.resultsIRSJovemEnglobamentoNote}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {lang === 'pt' ? 'Rendimento bruto Cat. A / B (€)' : 'Gross income Cat. A / B (€)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">€</span>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={otherIncome}
                      onChange={(e) => setOtherIncome(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  {irsJovemYear > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.resultsIRSJovemEffectiveIncome}:{' '}
                      <strong className="text-foreground">
                        {formatEUR(effectiveOtherIncome)}
                      </strong>
                      {' '}({lang === 'pt' ? `isenção de` : `exemption`} {(irsJovemExemption * 100).toFixed(0)}% → {(100 - irsJovemExemption * 100).toFixed(0)}% {lang === 'pt' ? 'tribut.' : 'taxable'})
                    </p>
                  )}
                  {irsJovemYear > 0 && otherIncome > 28737.5 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      ⚠️ {lang === 'pt'
                        ? `O limite máximo de isenção é €28.737,50/ano (OE2025). Acima desse valor, o excedente é tributado normalmente. A simulação acima não inclui esse cap.`
                        : `The maximum exemption cap is €28,737.50/year (OE2025). Income above this is taxed normally. The simulation above does not account for this cap.`}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t.resultsEnglobamentoNote}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="text-muted-foreground text-xs">{t.resultsAutonomous}</div>
                    <div className="font-bold text-lg mt-0.5 text-red-600 dark:text-red-400">
                      {formatEUR(englobamento.gainsTaxUnderAutonomous)}
                    </div>
                    <div className="text-xs text-muted-foreground">28%</div>
                  </div>
                  <div className={cn(
                    'p-3 rounded-lg border',
                    englobamento.englobamentoIsBetter
                      ? 'bg-green-500/5 border-green-500/40'
                      : 'bg-red-500/5 border-red-500/40'
                  )}>
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-muted-foreground text-xs">{t.resultsEnglobamento}</div>
                      {englobamento.englobamentoIsBetter ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400">
                          {lang === 'pt' ? '▼ poupa' : '▼ saves'} {formatEUR(Math.abs(englobamento.saving))}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-400">
                          ▲ +{formatEUR(Math.abs(englobamento.saving))}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-lg mt-0.5 text-red-600 dark:text-red-400">
                      {formatEUR(englobamento.gainsTaxUnderEnglobamento)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPercent(englobamento.marginalRateOnGains)}
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-2 text-sm p-2 rounded-lg font-medium',
                    englobamento.englobamentoIsBetter
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  )}
                >
                  {englobamento.englobamentoIsBetter ? (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      {lang === 'pt'
                        ? `Englobamento poupa ${formatEUR(Math.abs(englobamento.saving))}`
                        : `Englobamento saves ${formatEUR(Math.abs(englobamento.saving))}`}
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      {lang === 'pt'
                        ? `Taxa autónoma poupa ${formatEUR(Math.abs(englobamento.saving))}`
                        : `Autonomous rate saves ${formatEUR(Math.abs(englobamento.saving))}`}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* IRS Jovem note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-xl border bg-card">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{t.resultsIRSJovemNote}</span>
      </div>

      {/* Multi-year comparison */}
      {allYearsSummaries.length > 1 && (
        <div className="rounded-xl border overflow-hidden">
          <button
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            onClick={() => setShowMultiYear((v) => !v)}
          >
            <h3 className="font-semibold text-sm">{t.multiYearTitle}</h3>
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showMultiYear && 'rotate-180')} />
          </button>
          <div className={cn('grid transition-all duration-200', showMultiYear ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
            <div className="overflow-hidden">
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 text-left font-medium">{t.multiYearYear}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.multiYearProceeds}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.multiYearCost}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.multiYearGain}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.multiYearTaxableGain}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.multiYearTax}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allYearsSummaries.map(({ year, summary: ys }) => (
                      <tr
                        key={year}
                        className={cn(
                          'border-b last:border-0',
                          year === selectedYear && 'bg-primary/5 font-semibold'
                        )}
                      >
                        <td className="px-3 py-2">
                          {year}
                          {year === selectedYear && (
                            <span className="ml-1.5 text-xs text-primary">({t.multiYearCurrent})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{formatEUR(ys.totalProceedsEUR)}</td>
                        <td className="px-3 py-2 text-right">{formatEUR(ys.totalAcquisitionCostEUR)}</td>
                        <td className={cn('px-3 py-2 text-right', ys.totalRawGainEUR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                          {formatEUR(ys.totalRawGainEUR)}
                        </td>
                        <td className={cn('px-3 py-2 text-right', ys.totalTaxableGainEUR >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                          {formatEUR(ys.totalTaxableGainEUR)}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                          {ys.taxAtAutonomousRate > 0 ? formatEUR(ys.taxAtAutonomousRate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-asset breakdown */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t.resultsByAsset}</h3>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium w-8"></th>
                <th className="px-3 py-2 text-left font-medium">{t.reviewProduct}</th>
                <th className="px-3 py-2 text-left font-medium">{t.reviewISIN}</th>
                <th className="px-3 py-2 text-right font-medium">{t.resultsProceeds}</th>
                <th className="px-3 py-2 text-right font-medium">{t.resultsCost}</th>
                <th className="px-3 py-2 text-right font-medium">{t.resultsRawGain}</th>
                <th className="px-3 py-2 text-right font-medium">{t.resultsTaxableGain}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Group multiple sell transactions for the same ISIN into one row
                const isinOrder: string[] = [];
                const grouped = new Map<string, {
                  isin: string;
                  product: string;
                  grossProceedsEUR: number;
                  totalAcquisitionCostEUR: number;
                  totalRawGainEUR: number;
                  totalTaxableGainEUR: number;
                  holdingPeriodReductionApplied: boolean;
                  fifoMatches: TaxableSale['fifoMatches'];
                }>();
                for (const sale of sales) {
                  if (!grouped.has(sale.isin)) {
                    isinOrder.push(sale.isin);
                    grouped.set(sale.isin, {
                      isin: sale.isin,
                      product: sale.product,
                      grossProceedsEUR: 0,
                      totalAcquisitionCostEUR: 0,
                      totalRawGainEUR: 0,
                      totalTaxableGainEUR: 0,
                      holdingPeriodReductionApplied: false,
                      fifoMatches: [],
                    });
                  }
                  const g = grouped.get(sale.isin)!;
                  g.grossProceedsEUR += sale.grossProceedsEUR;
                  g.totalAcquisitionCostEUR += sale.totalAcquisitionCostEUR;
                  g.totalRawGainEUR += sale.totalRawGainEUR;
                  g.totalTaxableGainEUR += sale.totalTaxableGainEUR;
                  g.holdingPeriodReductionApplied ||= sale.holdingPeriodReductionApplied;
                  g.fifoMatches = g.fifoMatches.concat(sale.fifoMatches);
                }
                return isinOrder.map((isin) => {
                  const sale = grouped.get(isin)!;
                  const expandKey = isin;
                  const isExpanded = expandedIsins.has(expandKey);
                  return (
                    <>
                      <tr
                        key={expandKey}
                        className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                        onClick={() => toggleExpand(expandKey)}
                      >
                        <td className="px-3 py-2 text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">{sale.product}</td>
                        <td className="px-3 py-2 font-mono text-xs">{sale.isin}</td>
                        <td className="px-3 py-2 text-right">{formatEUR(sale.grossProceedsEUR)}</td>
                        <td className="px-3 py-2 text-right">{formatEUR(sale.totalAcquisitionCostEUR)}</td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right font-medium',
                            sale.totalRawGainEUR >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {formatEUR(sale.totalRawGainEUR)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right font-semibold',
                            sale.totalTaxableGainEUR >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {formatEUR(sale.totalTaxableGainEUR)}
                          {sale.holdingPeriodReductionApplied && (
                            <span className="ml-1 text-xs text-blue-500">↓</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <AllLotsDetail
                          key={`lots-${expandKey}`}
                          matches={sale.fifoMatches}
                          portfolioLots={portfolioSnapshot.get(sale.isin) ?? []}
                          t={t}
                          lang={lang}
                        />
                      )}
                    </>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-2 flex-wrap">
        <Button variant="outline" onClick={onBack}>
          {t.back}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPdfReport(summary, lang)}
            className="gap-1.5"
          >
            <FileDown className="w-4 h-4" />
            {t.exportPDF}
          </Button>
          <Button onClick={() => onContinue(summary)} size="lg">
            {t.resultsContinue}
          </Button>
        </div>
      </div>
    </div>
  );
}
