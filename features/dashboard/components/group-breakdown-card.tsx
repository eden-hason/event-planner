import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, cardHover } from '@/lib/utils';
import type { GroupWithGuestsApp } from '@/features/guests/schemas';

// Tone scale derived from --primary: order 900,700,800,500,600,300,400,100,200
// Adjacent slots jump across the scale for maximum contrast between consecutive groups
const GROUP_COLORS = [
  'oklch(from var(--primary) calc(l - 0.30) calc(c * 1.3) h)', // 900
  'oklch(from var(--primary) calc(l - 0.15) calc(c * 1.1) h)', // 700
  'oklch(from var(--primary) calc(l - 0.22) calc(c * 1.2) h)', // 800
  'oklch(from var(--primary) l c h)', // 500
  'oklch(from var(--primary) calc(l - 0.08) calc(c * 1.05) h)', // 600
  'oklch(from var(--primary) calc(l + 0.20) calc(c * 0.7) h)', // 300
  'oklch(from var(--primary) calc(l + 0.10) calc(c * 0.85) h)', // 400
  'oklch(from var(--primary) calc(l + 0.40) calc(c * 0.4) h)', // 100
  'oklch(from var(--primary) calc(l + 0.30) calc(c * 0.55) h)', // 200
];

export function GroupBreakdownCard({
  groups,
}: {
  groups: GroupWithGuestsApp[];
}) {
  const rows = groups.map((group) => ({
    ...group,
    total: group.guests.reduce((sum, g) => sum + g.amount, 0),
  }));

  const grandTotal = rows.reduce((sum, g) => sum + g.total, 0);

  return (
    <Card className={cn('flex h-full flex-col gap-2', cardHover)}>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-sm font-semibold">Guest Groups</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">Breakdown by group</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 pb-6">
        {/* Stacked proportional bar */}
        <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
          {rows.map((group, i) => {
            const pct = grandTotal > 0 ? (group.total / grandTotal) * 100 : 0;
            const pctRounded = Math.round(pct);
            return (
              <Tooltip key={group.id}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full cursor-default transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length],
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {group.total} {group.total === 1 ? 'guest' : 'guests'} ·{' '}
                    {pctRounded}%
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Group rows */}
        <div className="space-y-3">
          {rows.map((group, i) => {
            const pct =
              grandTotal > 0 ? Math.round((group.total / grandTotal) * 100) : 0;
            const color = GROUP_COLORS[i % GROUP_COLORS.length];
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
                    {group.total} {group.total === 1 ? 'guest' : 'guests'}
                    {group.side ? ` · ${group.side}'s side` : ''}
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

          {rows.length === 0 && (
            <p className="text-muted-foreground text-center text-xs">
              No groups yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
