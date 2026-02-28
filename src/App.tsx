import { useEffect, useState } from 'react';
import './App.css';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { UploadStep } from '@/components/steps/UploadStep';
import { ReviewStep } from '@/components/steps/ReviewStep';
import { ResultsStep } from '@/components/steps/ResultsStep';
import { GuideStep } from '@/components/steps/GuideStep';
import type { ParseResult, TaxSummary, WizardStep } from '@/types/transaction';

const STEPS: WizardStep[] = ['upload', 'review', 'results', 'guide'];

function AppInner() {
  const { t, lang, setLang } = useI18n();

  // ─── Dark mode ────────────────────────────────────────────────────────────
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  // ─────────────────────────────────────────────────────────────────────────

  const [step, setStep] = useState<WizardStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const stepLabels = [
    t.step1,
    t.step2,
    t.step3,
    t.step4,
  ];

  const handleUploadComplete = (result: ParseResult, year: number) => {
    setParseResult(result);
    setSelectedYear(year);
    setStep('review');
  };

  const handleReviewContinue = () => {
    setStep('results');
  };

  const handleResultsContinue = (summary: TaxSummary) => {
    setTaxSummary(summary);
    setStep('guide');
  };

  const handleRestart = () => {
    setStep('upload');
    setParseResult(null);
    setTaxSummary(null);
  };

  const handleStepClick = (index: number) => {
    const target = STEPS[index];
    if (target === 'upload') {
      setStep('upload');
    } else if (target === 'review' && parseResult) {
      setStep('review');
    } else if (target === 'results' && parseResult) {
      setStep('results');
    } else if (target === 'guide' && taxSummary) {
      setStep('guide');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold leading-tight">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors"
              title={dark ? t.lightMode : t.darkMode}
              aria-label={dark ? t.lightMode : t.darkMode}
            >
              {dark ? (
                // Sun icon
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                // Moon icon
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              )}
            </button>
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
              className="px-3 py-1 text-xs font-semibold rounded-md border border-border hover:bg-muted transition-colors"
            >
              {t.langToggle}
            </button>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <StepIndicator
          steps={stepLabels.map((label, index) => ({ label, index }))}
          currentIndex={stepIndex}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {step === 'upload' && (
          <UploadStep onComplete={handleUploadComplete} />
        )}

        {step === 'review' && parseResult && (
          <ReviewStep
            parseResult={parseResult}
            selectedYear={selectedYear}
            onBack={() => setStep('upload')}
            onContinue={handleReviewContinue}
          />
        )}

        {step === 'results' && parseResult && (
          <ResultsStep
            parseResult={parseResult}
            selectedYear={selectedYear}
            onBack={() => setStep('review')}
            onContinue={handleResultsContinue}
          />
        )}

        {step === 'guide' && taxSummary && (
          <GuideStep
            summary={taxSummary}
            onBack={() => setStep('results')}
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-muted-foreground text-center">
          {lang === 'pt'
            ? 'Para fins informativos apenas. Confirme sempre com um TOC/ROC antes de submeter a sua declaração.'
            : 'For informational purposes only. Always confirm with a certified accountant before submitting your declaration.'}
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <TooltipProvider>
        <AppInner />
      </TooltipProvider>
    </I18nProvider>
  );
}
