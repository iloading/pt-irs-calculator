import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export function SummaryCard({
  label,
  value,
  subValue,
  variant = 'default',
  icon,
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 flex flex-col gap-1 shadow-sm',
        variant === 'positive' && 'border-green-500/40 bg-green-500/5',
        variant === 'negative' && 'border-red-500/40 bg-red-500/5',
        variant === 'neutral' && 'border-muted',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
        {icon && <span className="opacity-70">{icon}</span>}
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-bold tracking-tight',
          variant === 'positive' && 'text-green-600 dark:text-green-400',
          variant === 'negative' && 'text-red-600 dark:text-red-400'
        )}
      >
        {value}
      </div>
      {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
    </div>
  );
}
