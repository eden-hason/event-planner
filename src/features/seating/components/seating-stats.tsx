'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CircleCheck, Flower2, CircleDot, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SeatingStatsView } from '../types';

interface SeatingStatsProps {
  stats: SeatingStatsView;
}

export function SeatingStats({ stats }: SeatingStatsProps) {
  const t = useTranslations('seating');

  const seatedPct =
    stats.totalHeadCount > 0
      ? Math.min(100, Math.round((stats.seatedHeadCount / stats.totalHeadCount) * 100))
      : 0;
  const capacityPct =
    stats.totalCapacity > 0
      ? Math.min(100, Math.round((stats.seatedHeadCount / stats.totalCapacity) * 100))
      : 0;
  const tablesPct =
    stats.totalTables > 0
      ? Math.min(100, Math.round((stats.fullTables / stats.totalTables) * 100))
      : 0;

  const healthLabel =
    capacityPct >= 90
      ? t('stats.tight')
      : capacityPct >= 50
        ? t('stats.healthy')
        : t('stats.lowUsage');

  const floorProgressColor =
    capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 50 ? 'bg-teal-500' : 'bg-slate-400';

  return (
    <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b bg-background">
      <StatCard
        icon={<CircleCheck className="h-3.5 w-3.5" />}
        iconBg="bg-emerald-100 text-emerald-600"
        label={t('stats.seated')}
        value={String(stats.seatedHeadCount)}
        sub={`of ${stats.totalHeadCount}`}
        progress={seatedPct}
        progressColor="bg-emerald-500"
      />
      <StatCard
        icon={<Flower2 className="h-3.5 w-3.5" />}
        iconBg="bg-pink-100 text-pink-600"
        label={t('stats.capacity')}
        value={String(stats.seatedHeadCount)}
        sub={`of ${stats.totalCapacity}`}
        progress={capacityPct}
        progressColor="bg-pink-500"
      />
      <StatCard
        icon={<CircleDot className="h-3.5 w-3.5" />}
        iconBg="bg-amber-100 text-amber-600"
        label={t('stats.tables')}
        value={String(stats.totalTables)}
        sub={t('stats.tablesFull', { count: stats.fullTables })}
        progress={tablesPct}
        progressColor="bg-amber-500"
      />
      <StatCard
        icon={<Layers className="h-3.5 w-3.5" />}
        iconBg="bg-teal-100 text-teal-600"
        label={t('stats.floorUsage')}
        value={`${capacityPct}%`}
        sub={healthLabel}
        progress={capacityPct}
        progressColor={floorProgressColor}
      />
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
  progress,
  progressColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  progress: number;
  progressColor: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
            iconBg,
          )}
        >
          {icon}
        </span>
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold leading-none">{value}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', progressColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
