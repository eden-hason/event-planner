'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { computeGroupRsvpData } from '../utils/rsvp-engagement';
import type { GroupWithGuestsApp } from '@/features/guests/schemas';

const BAR_WIDTH = 80;
const MIN_CHART_WIDTH = 400;

export function RsvpEngagementCard({ groups }: { groups: GroupWithGuestsApp[] }) {
  const t = useTranslations('dashboard.rsvpEngagement');
  const data = useMemo(() => computeGroupRsvpData(groups), [groups]);
  const chartWidth = Math.max(groups.length * BAR_WIDTH, MIN_CHART_WIDTH);

  const chartConfig = useMemo(() => ({
    confirmed: { label: t('confirmed'), color: '#10b981' },
    pending: { label: t('pending'), color: '#f59e0b' },
    declined: { label: t('declined'), color: '#ef4444' },
  }) satisfies ChartConfig, [t]);

  if (groups.length === 0) {
    return (
      <Card className="flex h-full flex-col gap-2">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t('title')}</CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">{t('description')}</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">{t('noGroups')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col gap-2">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-sm font-semibold">{t('title')}</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">{t('description')}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="overflow-x-auto">
          <div style={{ width: chartWidth }}>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={data} barSize={20}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  width={24}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="confirmed" stackId="a" fill={chartConfig.confirmed.color} radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill={chartConfig.pending.color} radius={[0, 0, 0, 0]} />
                <Bar dataKey="declined" stackId="a" fill={chartConfig.declined.color} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          {(Object.entries(chartConfig) as [keyof typeof chartConfig, typeof chartConfig[keyof typeof chartConfig]][]).map(([key, { label, color }]) => {
            const total = data.reduce((sum, d) => sum + d[key as 'confirmed' | 'pending' | 'declined'], 0);
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="text-xs font-semibold tabular-nums">{total}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
