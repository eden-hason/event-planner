'use client';

import { cn, cardHover } from '@/lib/utils';

export interface StatItem {
  label: string;
  status: string | null;
  value: number;
  secondaryText?: string;
  pct: number;
  icon: React.ReactNode;
  barColor: string;
  activeRing: string;
  breakdown?: Array<{ label: string; value: number; color: string }>;
}

interface StatsCardsProps {
  stats: StatItem[];
  selectedStatuses?: string[];
  onStatClick?: (status: string | null) => void;
  columns?: 2 | 3 | 4;
}

const colsClass = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' } as const;

export function StatsCards({ stats, selectedStatuses = [], onStatClick, columns = 4 }: StatsCardsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', colsClass[columns])}>
      {stats.map(({ label, status, value, secondaryText, pct, icon, barColor, activeRing, breakdown }) => {
        const isActive = status !== null && selectedStatuses.includes(status);
        const isClickable = !!onStatClick;
        const breakdownTotal = breakdown ? breakdown.reduce((s, b) => s + b.value, 0) : 0;

        return (
          <div
            key={label}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={() => isClickable && onStatClick(status)}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onStatClick(status);
              }
            }}
            className={cn(
              'bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm',
              isClickable && `cursor-pointer ${cardHover}`,
              isActive && activeRing,
            )}
          >
            {/* Header: title + icon */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{label}</span>
              {icon}
            </div>

            {/* Large number */}
            <p className="text-3xl font-bold leading-none tracking-tight">
              {value.toLocaleString()}
              {breakdown && secondaryText && (
                <span className="ml-2 text-base font-normal text-muted-foreground">{secondaryText}</span>
              )}
            </p>

            {/* Progress bar + stats row */}
            {breakdown ? (
              <>
                <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-gray-100">
                  {breakdown.map((item) => {
                    const width = breakdownTotal > 0 ? (item.value / breakdownTotal) * 100 : 0;
                    return (
                      <div
                        key={item.label}
                        className={cn('h-full transition-all duration-700', item.color)}
                        style={{ width: `${width}%` }}
                      />
                    );
                  })}
                </div>
                <div className="mt-0.5 flex flex-col gap-1">
                  {breakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-sm', item.color)} />
                      <span>{item.label}</span>
                      <span className="font-medium text-foreground">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  {secondaryText && <span>{secondaryText}</span>}
                  <span className="ml-auto">{pct}%</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
