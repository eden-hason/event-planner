'use client';

import { cn, cardHover } from '@/lib/utils';

export interface StatItem {
  label: string;
  status: string | null;
  value: number;
  secondaryText?: string;
  pct: number;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  iconColor: string;
  barColor: string;
  activeRing: string;
}

interface StatsCardsProps {
  stats: StatItem[];
  selectedStatuses?: string[];
  onStatClick?: (status: string | null) => void;
}

export function StatsCards({ stats, selectedStatuses = [], onStatClick }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, status, value, secondaryText, pct, icon: Icon, iconColor, barColor, activeRing }) => {
        const isActive = status !== null && selectedStatuses.includes(status);
        const isClickable = !!onStatClick;

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
              <Icon size={16} className={iconColor} />
            </div>

            {/* Large number */}
            <p className="text-3xl font-bold leading-none tracking-tight">
              {value.toLocaleString()}
            </p>

            {/* Progress bar + stats row */}
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
          </div>
        );
      })}
    </div>
  );
}
