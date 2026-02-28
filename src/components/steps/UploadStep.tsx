import { useCallback, useMemo, useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, Loader2, X, ChevronDown, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { parseBrokerFile, getAvailableSaleYears } from '@/lib/brokerParser';
import type { BrokerFormat } from '@/lib/brokerParser';
import type { ParseResult } from '@/types/transaction';

// ─── DeGiro logo (official SVG) ──────────────────────────────────────────────
function DeGiroIcon() {
  return (
    <svg viewBox="0 0 1024 1024" className="w-8 h-8 rounded-lg shrink-0" xmlns="http://www.w3.org/2000/svg">
      <circle cx="512" cy="512" r="512" fill="#009fdf"/>
      <path d="M767.8 482.4H256.3V358.7h511.5v123.7zm-511.5 59.2v123.7h511.5V541.6H256.3z" fill="#fff"/>
    </svg>
  );
}

// ─── Trade Republic logo (official SVG) ──────────────────────────────────────
function TRIcon() {
  return (
    <img
      src="https://logo.clearbit.com/traderepublic.com"
      alt="Trade Republic"
      className="w-8 h-8 rounded-lg shrink-0 object-contain bg-black"
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        img.src = 'https://www.google.com/s2/favicons?domain=traderepublic.com&sz=64';
      }}
    />
  );
}

// ─── Numbered step badge ─────────────────────────────────────────────────────
function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0 mt-0.5">
      {n}
    </span>
  );
}

// ─── Broker instruction card ─────────────────────────────────────────────────
interface BrokerGuideProps {
  icon: React.ReactNode;
  name: string;
  badge: string;
  format: string;
  steps: string[];
  hint: string;
  isOpen: boolean;
  onToggle: () => void;
}

function BrokerGuide({ icon, name, badge, format, steps, hint, isOpen, onToggle }: BrokerGuideProps) {
  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden transition-all duration-200',
      isOpen && 'ring-2 ring-primary/20 border-primary/30'
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">{badge}</span>
          </div>
          <p className="text-xs text-muted-foreground">{format}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isOpen && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {hint}
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              isOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>
      </button>
      {/* Animated expand using CSS grid trick */}
      <div className={cn(
        'grid transition-all duration-200 ease-in-out',
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      )}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t">
            <ol className="space-y-2 mt-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <StepBadge n={i + 1} />
                  <span dangerouslySetInnerHTML={{ __html: step }} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UploadedFile {
  name: string;
  format: BrokerFormat;
  result: ParseResult;
}

interface UploadStepProps {
  onComplete: (result: ParseResult, selectedYear: number) => void;
}

export function UploadStep({ onComplete }: UploadStepProps) {
  const { t, lang } = useI18n();
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

  const isPT = lang === 'pt';

  const [deGiroOpen, setDeGiroOpen] = useState(false);
  const [trOpen, setTrOpen] = useState(false);

  const deGiroSteps = isPT ? [
    'Acede a <strong>degiro.pt</strong> e faz login na tua conta.',
    'No menu lateral, clica em <strong>Actividade</strong>.',
    'No canto superior direito, clica em <strong>Exportar</strong>.',
    'Em "Tipo de ficheiro", seleciona <strong>Conta</strong> (não "Transações").',
    'Em "Período", escolhe <strong>desde o início</strong> até hoje — inclui todo o histórico para que o FIFO seja correto.',
    'Clica em <strong>Exportar CSV</strong> e guarda o ficheiro.',
  ] : [
    'Go to <strong>degiro.com</strong> and log in to your account.',
    'In the sidebar, click <strong>Activity</strong>.',
    'Click <strong>Export</strong> in the top-right corner.',
    'Under "File type", select <strong>Account</strong> (not "Transactions").',
    'Under "Period", choose <strong>from the beginning</strong> to today — full history is needed for correct FIFO matching.',
    'Click <strong>Export CSV</strong> and save the file.',
  ];

  const trSteps = isPT ? [
    'Abre a app <strong>Trade Republic</strong> no teu telemóvel.',
    'Toca no ícone do <strong>perfil</strong> (canto superior esquerdo).',
    'Vai a <strong>Documentos</strong>.',
    'Seleciona <strong>Extrato de conta</strong> (Account Statement).',
    'Escolhe o período — seleciona desde o início da conta até ao fim do ano fiscal.',
    'Descarrega o <strong>PDF</strong> e transfere-o para o computador.',
  ] : [
    'Open the <strong>Trade Republic</strong> app on your phone.',
    'Tap the <strong>profile</strong> icon (top-left corner).',
    'Go to <strong>Documents</strong>.',
    'Select <strong>Account Statement</strong>.',
    'Choose the period — from account opening to the end of the fiscal year.',
    'Download the <strong>PDF</strong> and transfer it to your computer.',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Hero */}
      <div className="text-center space-y-2 pt-2">
        <h2 className="text-3xl font-bold tracking-tight">{t.uploadTitle}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
          {isPT
            ? 'Calcula automaticamente as mais-valias para o Anexo J do IRS. 100% local — os teus dados nunca saem do browser.'
            : 'Automatically compute capital gains for your IRS Anexo J. 100% local — your data never leaves the browser.'}
        </p>
        <div className="flex items-center justify-center gap-4 pt-1">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            {isPT ? 'Sem servidor — tudo no browser' : 'No server — fully in-browser'}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            {isPT ? 'FIFO conforme CIRS art. 43' : 'FIFO per CIRS art. 43'}
          </span>
        </div>
      </div>

      {/* Broker guides */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
          {isPT ? 'Como exportar o teu histórico' : 'How to export your history'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <BrokerGuide
            icon={<DeGiroIcon />}
            name="DeGiro"
            badge="CSV"
            format={isPT ? 'Ficheiro CSV · Exportar via browser' : 'CSV file · Export via browser'}
            steps={deGiroSteps}
            hint={isPT ? 'Ver instruções' : 'See instructions'}
            isOpen={deGiroOpen}
            onToggle={() => setDeGiroOpen(v => !v)}
          />
          <BrokerGuide
            icon={<TRIcon />}
            name="Trade Republic"
            badge="PDF"
            format={isPT ? 'Extrato PDF · Exportar via app' : 'PDF statement · Export via app'}
            steps={trSteps}
            hint={isPT ? 'Ver instruções' : 'See instructions'}
            isOpen={trOpen}
            onToggle={() => setTrOpen(v => !v)}
          />
        </div>
        {!deGiroOpen && !trOpen && (
          <p className="text-xs text-center text-muted-foreground pt-0.5">
            {isPT
              ? '↑ Expande o teu broker para ver como exportar o ficheiro'
              : '↑ Expand your broker to see how to export the file'}
          </p>
        )}
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
          'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors',
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
            <p className="font-medium mt-1">{t.uploadProcessing}</p>
          ) : (
            <>
              <p className="font-medium">
                {uploadedFiles.length > 0 ? t.uploadAddMore : t.uploadDrop}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.uploadOr}{' '}
                <span className="text-primary underline cursor-pointer">{t.uploadBrowse}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">{t.uploadSupportedFormats}</p>
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
        <div className="space-y-3">
          {uploadedFiles.map((file) => {
            return (
              <div key={file.name} className="rounded-xl border border-green-500/30 bg-green-500/10 overflow-hidden">
                {/* File header row */}
                <div className="flex items-center gap-3 p-3">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                    className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title={t.uploadRemoveFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>


              </div>
            );
          })}

          {uploadedFiles.length > 1 && (
            <div className="text-sm text-muted-foreground text-right">
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
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger id="year-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pb-2">
        <Lock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        <span>
          {isPT
            ? 'Os teus ficheiros são processados localmente no browser. Nenhum dado é enviado para servidores.'
            : 'Your files are processed locally in the browser. No data is sent to any server.'}
        </span>
      </div>
    </div>
  );
}
