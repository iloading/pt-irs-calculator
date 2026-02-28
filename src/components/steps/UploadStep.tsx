import { useCallback, useMemo, useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { parseBrokerFile, getAvailableSaleYears } from '@/lib/brokerParser';
import type { BrokerFormat } from '@/lib/brokerParser';
import type { ParseResult } from '@/types/transaction';

interface UploadedFile {
  name: string;
  format: BrokerFormat;
  result: ParseResult;
}

interface UploadStepProps {
  onComplete: (result: ParseResult, selectedYear: number) => void;
}

export function UploadStep({ onComplete }: UploadStepProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Merge all uploaded files into a single ParseResult
  const combinedResult = useMemo<ParseResult | null>(() => {
    if (uploadedFiles.length === 0) return null;
    const allTransactions = uploadedFiles
      .flatMap((f) => f.result.transactions)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const allSplitEvents = uploadedFiles.flatMap((f) => f.result.splitEvents);
    const allWarnings = uploadedFiles.flatMap((f) => f.result.warnings);
    return { transactions: allTransactions, splitEvents: allSplitEvents, warnings: allWarnings };
  }, [uploadedFiles]);

  const availableYears = useMemo(
    () => (combinedResult ? getAvailableSaleYears(combinedResult.transactions) : []),
    [combinedResult]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setError(null);
      setIsProcessing(true);

      const newEntries: UploadedFile[] = [];
      const errors: string[] = [];

      await Promise.all(
        files.map(async (file) => {
          try {
            const { format, result } = await parseBrokerFile(file);
            if (result.transactions.length === 0) {
              errors.push(
                `${file.name}: ${result.warnings.length > 0 ? result.warnings[0] : t.uploadInvalidFile}`
              );
              return;
            }
            newEntries.push({ name: file.name, format, result });
          } catch (err) {
            errors.push(
              `${file.name}: ${err instanceof Error ? err.message : t.uploadInvalidFile}`
            );
          }
        })
      );

      setUploadedFiles((prev) => {
        const next = [...prev];
        for (const entry of newEntries) {
          const existingIdx = next.findIndex((f) => f.name === entry.name);
          if (existingIdx >= 0) {
            next[existingIdx] = entry;
          } else {
            next.push(entry);
          }
        }
        const allTx = next.flatMap((f) => f.result.transactions);
        const years = getAvailableSaleYears(allTx);
        if (years.length > 0) setSelectedYear(years[0]);
        return next;
      });

      if (errors.length > 0) setError(errors.join('\n'));
      setIsProcessing(false);
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) void processFiles(files);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) void processFiles(files);
      e.target.value = '';
    },
    [processFiles]
  );

  const removeFile = (name: string) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((f) => f.name !== name);
      const allTx = next.flatMap((f) => f.result.transactions);
      const years = getAvailableSaleYears(allTx);
      if (years.length > 0) setSelectedYear(years[0]);
      return next;
    });
  };

  const totalTransactions = combinedResult?.transactions.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t.uploadTitle}</h2>
        <p className="text-muted-foreground mt-1">{t.uploadDesc}</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-colors',
          isProcessing
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
        )}
        onClick={() => !isProcessing && document.getElementById('csv-input')?.click()}
      >
        <div className="p-3 rounded-full bg-muted">
          {isProcessing
            ? <Loader2 className="w-7 h-7 text-primary animate-spin" />
            : <Upload className="w-7 h-7 text-muted-foreground" />
          }
        </div>
        <div className="text-center">
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="font-medium mt-2">{t.uploadProcessing}</p>
            </>
          ) : (
            <>
              <p className="font-medium">
                {uploadedFiles.length > 0 ? t.uploadAddMore : t.uploadDrop}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.uploadOr}{' '}
                <span className="text-primary underline cursor-pointer">{t.uploadBrowse}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">{t.uploadSupportedFormats}</p>
            </>
          )}
        </div>
        <input
          id="csv-input"
          type="file"
          accept=".csv,.pdf,text/csv,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={isProcessing}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-destructive text-sm p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-green-700 dark:text-green-400 truncate text-sm">
                    {file.name}
                  </p>
                  <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                    file.format === 'degiro'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  )}>
                    {file.format === 'degiro' ? t.uploadBrokerDeGiro : t.uploadBrokerTR}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {file.result.transactions.length} {t.uploadRows}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title={t.uploadRemoveFile}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Combined summary when >1 file */}
          {uploadedFiles.length > 1 && (
            <div className="p-3 rounded-lg border bg-muted/30 text-sm text-center text-muted-foreground">
              <span className="font-semibold text-foreground">{totalTransactions}</span>{' '}
              {t.uploadTotalTransactions}
              {' · '}
              <span className="font-semibold text-foreground">{uploadedFiles.length}</span>{' '}
              {t.uploadFilesLoaded}
            </div>
          )}
        </div>
      )}

      {/* Year selector + continue (shown once at least one file is loaded) */}
      {combinedResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-muted-foreground">{t.uploadYears}</div>
              <div className="font-semibold mt-0.5">
                {availableYears.length > 0 ? availableYears.join(', ') : '—'}
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-muted-foreground">{t.uploadSplits}</div>
              <div className="font-semibold mt-0.5">
                {combinedResult.splitEvents.length > 0
                  ? combinedResult.splitEvents.map((s) => `${s.product} (${s.splitRatio}:1)`).join(', ')
                  : '—'}
              </div>
            </div>
          </div>

          {/* Year selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="year-select">
              {t.reviewFiscalYear}
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Warnings */}
          {combinedResult.warnings.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                {t.uploadWarnings}
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                {combinedResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={() => onComplete(combinedResult, selectedYear)}
              disabled={availableYears.length === 0}
            >
              {t.uploadContinue}
            </Button>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <FileText className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{t.uploadDesc}</span>
      </div>
    </div>
  );
}
