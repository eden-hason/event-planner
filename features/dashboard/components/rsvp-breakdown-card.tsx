'use client';

import { useMemo } from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cardHover } from '@/lib/utils';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { GuestStats } from '../types';

const chartConfig = {
  people: { label: 'People' },
  confirmed: { label: 'Confirmed', color: 'var(--color-emerald-500)' },
  pending: { label: 'Pending', color: 'var(--color-amber-400)' },
  declined: { label: 'Declined', color: 'var(--color-red-400)' },
} satisfies ChartConfig;

export function RsvpBreakdownCard({ stats }: { stats: GuestStats }) {
  const { total, confirmed, pending, declined } = stats;

  const chartData = useMemo(
    () => [
      {
        status: 'confirmed',
        people: confirmed,
        fill: 'var(--color-emerald-500)',
      },
      { status: 'pending', people: pending, fill: 'var(--color-amber-400)' },
      { status: 'declined', people: declined, fill: 'var(--color-red-400)' },
    ],
    [confirmed, pending, declined],
  );

  const legendRows = [
    { label: 'Confirmed', value: confirmed, color: 'var(--color-emerald-500)' },
    { label: 'Pending', value: pending, color: 'var(--color-amber-400)' },
    { label: 'Declined', value: declined, color: 'var(--color-red-400)' },
  ];

  return (
    <Card className={`flex h-full flex-col gap-2 ${cardHover}`}>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-sm font-semibold">
            RSVP Breakdown
          </CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Guest response overview
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center gap-4 pb-6">
        {/* Donut chart */}
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-[180px] w-full shrink-0"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="people"
              nameKey="status"
              innerRadius={46}
              strokeWidth={4}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 18}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend with progress bars */}
        <div className="w-full space-y-3">
          {legendRows.map(({ label, value, color }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{value}</span>
                    <span className="text-muted-foreground w-8 text-right text-xs">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
