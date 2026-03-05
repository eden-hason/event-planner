'use client';

import { useMemo } from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
      { status: 'confirmed', people: confirmed, fill: 'var(--color-confirmed)' },
      { status: 'pending', people: pending, fill: 'var(--color-pending)' },
      { status: 'declined', people: declined, fill: 'var(--color-declined)' },
    ],
    [confirmed, pending, declined],
  );

  const responded = confirmed + declined;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  const legendRows = [
    { label: 'Confirmed', value: confirmed, colorClass: 'bg-emerald-500' },
    { label: 'Pending', value: pending, colorClass: 'bg-amber-400' },
    { label: 'Declined', value: declined, colorClass: 'bg-red-400' },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">RSVP Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[180px] w-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={chartData} dataKey="people" nameKey="status" innerRadius={52} strokeWidth={4}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                          {total.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                          total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="mt-2 w-full space-y-1.5">
          {legendRows.map(({ label, value, colorClass }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-2 text-sm">
                <div className={`h-2.5 w-2.5 shrink-0 rounded-sm ${colorClass}`} />
                <span className="flex-1 text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
                <span className="w-8 text-right text-xs text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{responseRate}%</span> response rate
        </p>
      </CardFooter>
    </Card>
  );
}
