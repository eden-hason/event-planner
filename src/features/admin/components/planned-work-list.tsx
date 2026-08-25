import Link from 'next/link';
import { Phone, MessageSquare } from 'lucide-react';
import type { PlannedWorkQueue, PlannedWorkRow } from '../types';
import { QueueRowAction } from './queue-row-action';
import { cn } from '@/lib/utils';

/**
 * A call plan is work only a person can do; a message will send itself if left
 * alone. So the message row's action is a rescue and the call row's action is
 * the job, and the two must not render alike or the Operator cannot see their
 * actual worklist.
 *
 * The distinction is carried by weight - surface, type weight and button
 * emphasis - not by a third alarm colour. `--destructive` is spent only on
 * lateness. See docs/admin/ADMIN-CONTEXT.md and the brief, section 3.8.
 */
function PlannedWorkItem({ row }: { row: PlannedWorkRow }) {
  const isCall = row.kind === 'call';
  const Icon = isCall ? Phone : MessageSquare;
  const late = row.lateBy !== null;
  const when = row.lateBy ?? row.scheduledTime?.slice(0, 5) ?? 'All day';

  return (
    // Hover lives on the row, not on the link inside it. The link used to own
    // it, so the row's own padding stayed its base colour and the highlight
    // stopped short of the edges.
    <div className="bg-card hover:bg-accent flex items-center gap-3.5 rounded-lg border px-3.5 py-2.5 transition-colors">
      {/* The action is a sibling of the link, never inside it: nesting a button
          in an anchor made Start round navigate instead of starting the round. */}
      <Link
        href={`/admin/events/${row.eventId}`}
        className="flex min-w-0 flex-1 items-center gap-3.5"
      >
        <Icon
          className={cn(
            'size-[17px] shrink-0',
            isCall ? 'text-foreground' : 'text-muted-foreground',
          )}
        />

        <span
          className={cn(
            'w-24 shrink-0 text-[13px] tabular-nums',
            late ? 'text-destructive' : isCall ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {when}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              'truncate text-[14px]',
              isCall ? 'text-foreground font-semibold' : 'text-secondary-foreground',
            )}
          >
            {row.title}
          </span>
          <span className="text-muted-foreground truncate text-[12.5px]">{row.detail}</span>
        </span>

        <span className="text-secondary-foreground w-[170px] shrink-0 truncate text-[13px]">
          {row.eventTitle}
        </span>
      </Link>

      <QueueRowAction row={row} />
    </div>
  );
}

export function PlannedWorkList({ queue }: { queue: PlannedWorkQueue }) {
  if (!queue.groups.length) {
    return (
      <div className="bg-card flex flex-col items-start gap-1 rounded-xl border px-5 py-8">
        <p className="text-[14px] font-medium">Nothing planned</p>
        <p className="text-muted-foreground text-[13px]">
          Every message has sent and every call round is finished. Sent and cancelled items live on
          each event page
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Context, not the headline. Two buckets that partition the rows exactly,
          so the strip always sums to what is on screen - see brief 3.9. */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[12.5px]">
        <span>
          <span className="text-foreground font-semibold tabular-nums">{queue.callRounds}</span>{' '}
          {queue.callRounds === 1 ? 'call round to start' : 'call rounds to start'}
        </span>
        <span>
          <span className="text-foreground font-semibold tabular-nums">{queue.messages}</span>{' '}
          {queue.messages === 1 ? 'message scheduled' : 'messages scheduled'}
        </span>
      </div>

      {queue.groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2 px-0.5">
            <span
              className={cn(
                'text-[11.5px] font-semibold tracking-[0.07em] uppercase',
                group.isOverdue ? 'text-destructive font-mono tracking-[0.06em]' : 'text-muted-foreground',
              )}
            >
              {group.label}
            </span>
            <span className="text-muted-foreground/70 text-[11.5px] tabular-nums">
              {group.rows.length} {group.rows.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {group.rows.map((row) => (
              <PlannedWorkItem key={row.id} row={row} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-muted-foreground/70 px-0.5 text-[12px]">
        Sent and cancelled items live on each event page
      </p>
    </div>
  );
}

export function PlannedWorkError() {
  return <div className="text-destructive text-sm">Planned work didn&apos;t load</div>;
}

export function PlannedWorkSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-accent h-3 w-64 animate-pulse rounded-md" />
      <div className="bg-accent h-14 w-full animate-pulse rounded-lg" />
      <div className="bg-accent h-14 w-full animate-pulse rounded-lg" />
      <div className="bg-accent h-14 w-full animate-pulse rounded-lg" />
    </div>
  );
}
