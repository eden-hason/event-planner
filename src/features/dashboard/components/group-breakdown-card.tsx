'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GroupWithGuestsApp } from '@/features/guests/schemas';
import { groupColor } from '@/features/seating/utils/group-color';

export function GroupBreakdownCard({
  groups,
}: {
  groups: GroupWithGuestsApp[];
}) {
  const t = useTranslations('dashboard.groupBreakdown');
  const rows = groups.map((group) => ({
    ...group,
    total: group.guests.reduce((sum, g) => sum + g.amount, 0),
  }));

  const grandTotal = rows.reduce((sum, g) => sum + g.total, 0);

  const sideLabels: Record<string, string> = {
    bride: t('sideLabels.bride'),
    groom: t('sideLabels.groom'),
  };

  if (rows.length === 0) {
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
      <CardContent className="flex flex-1 flex-col gap-5 pb-6">
        {/* Stacked proportional bar */}
        <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
          {rows.map((group) => {
            const pct = grandTotal > 0 ? (group.total / grandTotal) * 100 : 0;
            const pctRounded = Math.round(pct);
            return (
              <Tooltip key={group.id}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full cursor-default transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: groupColor(group.id).bg,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {group.total} {group.total === 1 ? t('guestSingular') : t('guests')} ·{' '}
                    {pctRounded}%
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Group rows */}
        <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-hide">
          {rows.map((group) => {
            const pct =
              grandTotal > 0 ? Math.round((group.total / grandTotal) * 100) : 0;
            const color = groupColor(group.id).bg;
            return (
              <div key={group.id} className="flex items-center gap-3">
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-none font-medium">
                    {group.name}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {group.total} {group.total === 1 ? t('guestSingular') : t('guests')}
                    {group.side ? ` · ${sideLabels[group.side] ?? group.side}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}

        </div>
      </CardContent>
    </Card>
  );
}
