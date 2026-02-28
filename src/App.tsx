import { useState } from 'react';
import './App.css';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { UploadStep } from '@/components/steps/UploadStep';
import { ReviewStep } from '@/components/steps/ReviewStep';
import { ResultsStep } from '@/components/steps/ResultsStep';
import { GuideStep } from '@/components/steps/GuideStep';
import type { ParseResult, TaxSummary, WizardStep } from '@/types/transaction';

const STEPS: WizardStep[] = ['upload', 'review', 'results', 'guide'];

function AppInner() {
  const { t, lang, setLang } = useI18n();

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold leading-tight">{t.appTitle}</h1>
          </div>
          <button
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
            className="px-3 py-1 text-xs font-semibold rounded-md border border-border hover:bg-muted transition-colors"
          >
            {t.langToggle}
          </button>
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <StepIndicator
          steps={stepLabels.map((label, index) => ({ label, index }))}
          currentIndex={stepIndex}
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
      <AppInner />
    </I18nProvider>
  );
}
