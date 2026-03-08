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
  confirmed: { label: 'Confirmed', color: 'oklch(0.70 0.17 150)' },
  pending: { label: 'Pending', color: 'oklch(0.82 0.16 90)' },
  declined: { label: 'Declined', color: 'oklch(0.65 0.20 25)' },
} satisfies ChartConfig;

export function RsvpBreakdownCard({ stats }: { stats: GuestStats }) {
  const { total, confirmed, pending, declined } = stats;

  const chartData = useMemo(
    () => [
      { status: 'confirmed', people: confirmed, fill: 'oklch(0.70 0.17 150)' },
      { status: 'pending', people: pending, fill: 'oklch(0.82 0.16 90)' },
      { status: 'declined', people: declined, fill: 'oklch(0.65 0.20 25)' },
    ],
    [confirmed, pending, declined],
  );

  const legendRows = [
    { label: 'Confirmed', value: confirmed, color: 'oklch(0.70 0.17 150)' },
    { label: 'Pending', value: pending, color: 'oklch(0.82 0.16 90)' },
    { label: 'Declined', value: declined, color: 'oklch(0.65 0.20 25)' },
  ];

  return (
    <Card className={`flex flex-col gap-2 ${cardHover}`}>
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
      <CardContent className="flex flex-1 items-center gap-4 pb-6">
        {/* Donut chart */}
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-[160px] shrink-0"
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
        <div className="flex-1 space-y-3">
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
