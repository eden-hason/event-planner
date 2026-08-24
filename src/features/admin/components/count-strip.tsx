import type { OverviewCounts } from '../types';

/**
 * Context, not the headline - one quiet line rather than a row of stat cards.
 * Every number carries its unit: "guest records" is the billable unit and is
 * a different quantity from the number of guests.
 */
export function CountStrip({ counts }: { counts: OverviewCounts }) {
  const items = [
    { value: counts.users, label: counts.users === 1 ? 'user' : 'users' },
    { value: counts.events, label: counts.events === 1 ? 'event' : 'events' },
    {
      value: counts.guestRecords,
      label: counts.guestRecords === 1 ? 'guest record' : 'guest records',
    },
  ];

  return (
    <div className="text-muted-foreground flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-baseline gap-2.5">
          {i > 0 && <span className="text-muted-foreground/70">·</span>}
          <span>
            <span className="text-foreground font-semibold tabular-nums">
              {item.value.toLocaleString('en-GB')}
            </span>{' '}
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export function CountStripError() {
  return <div className="text-destructive text-sm">Counts didn&apos;t load</div>;
}

export function CountStripSkeleton() {
  return (
    <div className="flex items-center gap-6">
      <div className="bg-accent h-3 w-16 animate-pulse rounded-md" />
      <div className="bg-accent h-3 w-[72px] animate-pulse rounded-md" />
      <div className="bg-accent h-3 w-32 animate-pulse rounded-md" />
    </div>
  );
}
