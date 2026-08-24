import Link from 'next/link';
import { CircleCheckBig, TriangleAlert } from 'lucide-react';
import { Band, BandRow } from './band';
import { SignalRow } from './signal-row';
import { RetryButton } from './retry-button';
import type { Signal, SignalKind } from '../types';

/**
 * Past this many Signals a flat list stops being scannable, so rows group by
 * kind in rank order and each group is capped. The overflow is a link, never a
 * dismiss: a Signal is derived at read time and has nothing to dismiss.
 */
const GROUP_ABOVE = 6;
const CAP_PER_GROUP = 4;

const GROUP_LABEL: Record<SignalKind, string> = {
  overdue_schedule: 'Overdue schedules',
  failed_delivery: 'Failed deliveries',
  stale_call_round: 'Stale call rounds',
};

const RANK: SignalKind[] = ['overdue_schedule', 'failed_delivery', 'stale_call_round'];

export function SignalList({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <Band title="Needs attention">
        <BandRow className="flex items-start gap-3 pb-[18px]">
          <CircleCheckBig
            className="text-success mt-0.5 size-[18px] shrink-0"
            aria-hidden
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Nothing needs your attention</span>
            <span className="text-muted-foreground text-[13px]">
              No overdue schedules, failed deliveries, or stale call rounds
            </span>
          </div>
        </BandRow>
      </Band>
    );
  }

  const title = `Needs attention (${signals.length})`;

  if (signals.length <= GROUP_ABOVE) {
    return (
      <Band title={title}>
        {signals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </Band>
    );
  }

  return (
    <Band title={title}>
      {RANK.map((kind) => {
        const rows = signals.filter((s) => s.kind === kind);
        if (rows.length === 0) return null;
        const shown = rows.slice(0, CAP_PER_GROUP);
        const hidden = rows.length - shown.length;

        return (
          <div key={kind} className="flex flex-col">
            <div className="text-secondary-foreground border-t px-4 pt-3 pb-1.5 text-xs font-semibold">
              {GROUP_LABEL[kind]} ({rows.length})
            </div>
            {shown.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
            {hidden > 0 && (
              <Link
                href="/admin/operations"
                className="text-muted-foreground hover:bg-accent hover:text-foreground border-t py-2.5 pr-4 pl-[46px] text-[13px] font-medium transition-colors"
              >
                {hidden} more in Operations →
              </Link>
            )}
          </div>
        );
      })}
    </Band>
  );
}

/**
 * Must never be mistaken for the empty state above. A false all-clear is worse
 * than a visible failure, so this says plainly that Signals may be hidden.
 */
export function SignalListError() {
  return (
    <Band title="Needs attention">
      <BandRow className="flex items-start gap-3">
        <TriangleAlert
          className="text-destructive mt-0.5 size-[18px] shrink-0"
          aria-hidden
        />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-destructive text-sm font-medium">
            Signals didn&apos;t load
          </span>
          <span className="text-muted-foreground text-[13px]">
            There may be Signals we can&apos;t show right now. Counts and upcoming
            events are unaffected
          </span>
        </div>
        <RetryButton />
      </BandRow>
    </Band>
  );
}

export function SignalListSkeleton() {
  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <div className="px-4 pt-4 pb-3">
        <div className="bg-accent h-2.5 w-[118px] animate-pulse rounded-sm" />
      </div>
      {[280, 320].map((width) => (
        <div key={width} className="flex items-start gap-3 border-t px-4 py-3.5">
          <div className="bg-accent size-[18px] shrink-0 animate-pulse rounded-full" />
          <div className="flex flex-1 flex-col gap-[7px]">
            <div
              className="bg-accent h-3 animate-pulse rounded-md"
              style={{ width }}
            />
            <div className="bg-accent h-2.5 w-44 animate-pulse rounded-md" />
          </div>
          <div className="bg-accent h-2.5 w-16 animate-pulse rounded-md" />
        </div>
      ))}
    </section>
  );
}
