import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  index: number;
}

interface StepIndicatorProps {
  steps: Step[];
  currentIndex: number;
}

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isLast = idx === steps.length - 1;

          return (
            <li key={step.index} className={cn('flex items-center', !isLast && 'flex-1')}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border-2 transition-all',
                    isCompleted &&
                      'bg-primary border-primary text-primary-foreground',
                    isCurrent &&
                      'border-primary text-primary bg-background',
                    !isCompleted &&
                      !isCurrent &&
                      'border-muted-foreground/30 text-muted-foreground bg-background'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium hidden sm:block text-center',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mb-4 transition-all',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
