import { useState, useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/taxCalculator';
import type { DeGiroTransaction, ParseResult, SplitEvent } from '@/types/transaction';

interface ReviewStepProps {
  parseResult: ParseResult;
  selectedYear: number;
  onBack: () => void;
  onContinue: () => void;
}

function txType(
  tx: DeGiroTransaction,
  t: { reviewBuy: string; reviewSell: string; reviewSplit: string }
): string {
  if (tx.isSplit) return t.reviewSplit;
  if (tx.isBuy) return t.reviewBuy;
  if (tx.isSell) return t.reviewSell;
  return '—';
}

function SplitBanner({ events, t }: { events: SplitEvent[]; t: { reviewSplitBadge: string } }) {
  if (events.length === 0) return null;
  return (
    <div className="flex items-start gap-2 text-xs p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        {t.reviewSplitBadge}:{' '}
        {events.map((e) => `${e.product} (${e.splitRatio}:1 em ${formatDate(e.date)})`).join(' • ')}
      </span>
    </div>
  );
}

export function ReviewStep({ parseResult, selectedYear, onBack, onContinue }: ReviewStepProps) {
  const { t, lang } = useI18n();
  const { transactions, splitEvents } = parseResult;

  const allIsins = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => set.add(tx.isin));
    return Array.from(set).sort();
  }, [transactions]);

  const allYears = useMemo(() => {
    const set = new Set<number>();
    transactions.forEach((tx) => set.add(tx.date.getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  const [filterIsin, setFilterIsin] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const yearSales = transactions.filter(
    (tx) => tx.isSell && tx.date.getFullYear() === selectedYear
  );

  const displayed = useMemo(() => {
    return transactions.filter((tx) => {
      const yearMatch = filterYear === 'all' || tx.date.getFullYear() === Number(filterYear);
      const isinMatch = filterIsin === 'all' || tx.isin === filterIsin;
      return yearMatch && isinMatch;
    });
  }, [transactions, filterYear, filterIsin]);

  const hasSalesThisYear = yearSales.length > 0;
  const allLabel = lang === 'pt' ? 'Todos os anos' : 'All years';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">{t.reviewTitle}</h2>
        <p className="text-muted-foreground mt-1">{t.reviewDesc}</p>
      </div>

      <SplitBanner events={splitEvents} t={t} />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{t.reviewFiscalYear}:</span>
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
            {selectedYear}
          </span>
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-2 text-sm">
          <Label htmlFor="year-filter" className="font-medium">
            {lang === 'pt' ? 'Mostrar ano:' : 'Show year:'}
          </Label>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger id="year-filter" className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{allLabel}</SelectItem>
              {allYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}{y === selectedYear ? (lang === 'pt' ? ' (ano fiscal)' : ' (fiscal year)') : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ISIN filter */}
        <div className="flex items-center gap-2 text-sm ml-auto">
          <Label htmlFor="isin-filter" className="font-medium">
            {t.reviewFilter}:
          </Label>
          <Select value={filterIsin} onValueChange={setFilterIsin}>
            <SelectTrigger id="isin-filter" className="h-8 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.reviewAll}</SelectItem>
              {allIsins.map((isin) => {
                const product = transactions.find((tx) => tx.isin === isin)?.product ?? isin;
                return (
                  <SelectItem key={isin} value={isin}>
                    {product}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasSalesThisYear && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{t.noSales}</span>
        </div>
      )}

      {/* Fifo note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{t.reviewNote}</span>
      </div>

      {/* Transaction table */}
      <div className="overflow-x-auto rounded-xl border">
        <p className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/20">
          {displayed.length} {lang === 'pt' ? 'transações' : 'transactions'}
          {filterYear === 'all' ? ` ${lang === 'pt' ? 'de todos os anos' : 'across all years'}` : ''}
          {' — '}
          {lang === 'pt'
            ? `Vendas do ano fiscal ${selectedYear} destacadas a laranja`
            : `Fiscal year ${selectedYear} sells highlighted in orange`}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.reviewDate}</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.reviewType}</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.reviewProduct}</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.reviewISIN}</th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.reviewQty}</th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.reviewEUR}</th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.reviewFees}</th>
              <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.reviewTotal}</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((tx, idx) => {
              const type = txType(tx, t);
              const isSellInYear = tx.isSell && tx.date.getFullYear() === selectedYear;
              const isOtherYear = tx.date.getFullYear() !== selectedYear;
              return (
                <tr
                  key={`${tx.orderId}-${idx}`}
                  className={cn(
                    'border-b last:border-0 transition-colors',
                    tx.isSplit && 'bg-blue-500/5 text-muted-foreground',
                    isSellInYear && 'bg-amber-500/8',
                    isOtherYear && !tx.isSplit && 'opacity-60'
                  )}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {formatDate(tx.date)}
                      {isSellInYear && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold leading-none">
                          {selectedYear}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 text-xs rounded font-medium',
                        tx.isBuy && 'bg-green-500/15 text-green-700 dark:text-green-400',
                        tx.isSell && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                        tx.isSplit && 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                      )}
                    >
                      {type}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[140px] truncate" title={tx.product}>
                    {tx.product}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{tx.isin}</td>
                  <td className="px-3 py-2 text-right">{tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    {tx.eurValue > 0 ? `€${tx.eurValue.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {(tx.autoFxFee !== 0 || tx.transactionFee !== 0)
                      ? `€${(Math.abs(tx.autoFxFee) + Math.abs(tx.transactionFee)).toFixed(2)}`
                      : '—'}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right font-medium',
                      tx.totalEUR > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {tx.totalEUR > 0 ? `+€${tx.totalEUR.toFixed(2)}` : `€${tx.totalEUR.toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t.back}
        </Button>
        <Button onClick={onContinue} disabled={!hasSalesThisYear}>
          {t.reviewCalc}
        </Button>
      </div>
    </div>
  );
}
