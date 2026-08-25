import Link from 'next/link';
import { CalendarDays, Search, X } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EventsIndexFilters, EventsIndexPage, EventsIndexStatus } from '../types';
import { eventDaysFromToday, formatEventDate } from '@/lib/date-time';
import { cn } from '@/lib/utils';

function hrefFor(filters: EventsIndexFilters, patch: Partial<EventsIndexFilters>) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.needsSetup) params.set('setup', 'true');
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `/admin/events?${query}` : '/admin/events';
}

function totalLabel(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString('en-GB')} ${value === 1 ? singular : plural}`;
}

export function EventsIndex({ data, filters }: { data: EventsIndexPage; filters: EventsIndexFilters }) {
  const hasAnyEvents = data.totals.publishedEvents + data.totals.draftEvents > 0;
  const hasFilters = !!filters.q || filters.status !== 'all' || filters.needsSetup;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        <p className="text-muted-foreground text-[13px]">
          Upcoming first, with past and undated events grouped below
        </p>
      </div>

      {hasAnyEvents && (
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
          <span><strong className="text-foreground tabular-nums">{data.totals.publishedEvents}</strong> published</span>
          <span>·</span>
          <span><strong className="text-foreground tabular-nums">{data.totals.draftEvents}</strong> draft</span>
          <span>·</span>
          <span><strong className="text-foreground tabular-nums">{data.totals.guestRecords.toLocaleString('en-GB')}</strong> guest records</span>
          <span>·</span>
          <span><strong className="text-foreground tabular-nums">{data.totals.actualGuests.toLocaleString('en-GB')}</strong> guests</span>
        </div>
      )}

      {hasAnyEvents && <EventsToolbar filters={filters} />}

      {!hasAnyEvents ? (
        <Empty className="bg-card min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
            <EmptyTitle>No events yet</EmptyTitle>
            <EmptyDescription>
              Events appear here as soon as an owner starts onboarding
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.rows.length === 0 ? (
        <Empty className="bg-card min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Search /></EmptyMedia>
            <EmptyTitle>No events match</EmptyTitle>
            <EmptyDescription>Try another search or clear the active filters</EmptyDescription>
          </EmptyHeader>
          {hasFilters && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/events"><X data-icon="inline-start" />Clear filters</Link>
            </Button>
          )}
        </Empty>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35">
                <TableHead className="w-[34%] px-4 text-[11px] tracking-[0.06em] uppercase">Event</TableHead>
                <TableHead className="text-[11px] tracking-[0.06em] uppercase">Date</TableHead>
                <TableHead className="text-right text-[11px] tracking-[0.06em] uppercase">Guest list</TableHead>
                <TableHead className="text-right text-[11px] tracking-[0.06em] uppercase">Confirmed</TableHead>
                <TableHead className="px-4 text-[11px] tracking-[0.06em] uppercase">Outreach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, index) => {
                const days = eventDaysFromToday(row.eventDate);
                const previous = data.rows[index - 1];
                const previousDays = previous ? eventDaysFromToday(previous.eventDate) : null;
                const startsPast = days !== null && days < 0 && (index === 0 || previousDays === null || previousDays >= 0);
                const startsUndated = days === null && (index === 0 || previousDays !== null);
                return (
                  <EventTableRows
                    key={row.id}
                    row={row}
                    groupLabel={startsPast ? 'Past Events' : startsUndated ? 'No Date Set' : null}
                  />
                );
              })}
            </TableBody>
          </Table>
          <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-3 text-[12.5px]">
            <span>
              {data.totalRows === 0
                ? '0 events'
                : `${(data.page - 1) * data.pageSize + 1}-${Math.min(data.page * data.pageSize, data.totalRows)} of ${data.totalRows}`}
            </span>
            <div className="flex gap-2">
              <Button asChild={data.page > 1} variant="outline" size="sm" disabled={data.page <= 1}>
                {data.page > 1 ? <Link href={hrefFor(filters, { page: data.page - 1 })}>Previous</Link> : <span>Previous</span>}
              </Button>
              <Button asChild={data.page < data.pageCount} variant="outline" size="sm" disabled={data.page >= data.pageCount}>
                {data.page < data.pageCount ? <Link href={hrefFor(filters, { page: data.page + 1 })}>Next</Link> : <span>Next</span>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventsToolbar({ filters }: { filters: EventsIndexFilters }) {
  const statuses: { value: EventsIndexStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action="/admin/events" className="w-full max-w-[340px]">
        {filters.status !== 'all' && <input type="hidden" name="status" value={filters.status} />}
        {filters.needsSetup && <input type="hidden" name="setup" value="true" />}
        <InputGroup>
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput name="q" defaultValue={filters.q} placeholder="Search events, owners, emails" />
        </InputGroup>
      </form>
      <div className="flex overflow-hidden rounded-md border bg-card">
        {statuses.map((status) => (
          <Link
            key={status.value}
            href={hrefFor(filters, { status: status.value, page: 1 })}
            className={cn(
              'border-r px-3 py-2 text-[12.5px] font-medium last:border-r-0',
              filters.status === status.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {status.label}
          </Link>
        ))}
      </div>
      <Link
        href={hrefFor(filters, { needsSetup: !filters.needsSetup, page: 1 })}
        className={cn(
          'rounded-md border px-3 py-2 text-[12.5px] font-medium',
          filters.needsSetup ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
        )}
      >
        Needs setup
      </Link>
    </div>
  );
}

function EventTableRows({ row, groupLabel }: { row: EventsIndexPage['rows'][number]; groupLabel: string | null }) {
  return (
    <>
      {groupLabel && (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={5} className="px-4 py-2 text-[11px] font-semibold tracking-[0.07em] uppercase">
            {groupLabel}
          </TableCell>
        </TableRow>
      )}
      <TableRow className="group relative">
        <TableCell className="relative px-4 py-3.5">
          <Link href={`/admin/events/${row.id}`} className="after:absolute after:inset-0">
            <span className="font-medium group-hover:underline">{row.title}</span>
          </Link>
          <span className="text-muted-foreground mt-0.5 block text-[12px]">
            {row.eventTypeName} · {row.ownerName}
          </span>
        </TableCell>
        <TableCell className="py-3.5">
          <span>{formatEventDate(row.eventDate)}</span>
          {row.status === 'draft' && (
            <Badge variant="outline" className="text-muted-foreground ml-2 px-2 py-0 text-[10px] uppercase">Draft</Badge>
          )}
        </TableCell>
        <TableCell className="py-3.5 text-right tabular-nums">
          {totalLabel(row.guestRecords, 'record')}
          {row.actualGuests !== row.guestRecords && (
            <span className="text-muted-foreground block text-[11.5px]">{totalLabel(row.actualGuests, 'guest')}</span>
          )}
        </TableCell>
        <TableCell className="py-3.5 text-right tabular-nums">
          {row.confirmationRate === null ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            <>
              <span>{Math.round(row.confirmationRate * 100)}%</span>
              <span className="text-muted-foreground block text-[11.5px]">{row.confirmedRecords} of {row.guestRecords} records</span>
            </>
          )}
        </TableCell>
        <TableCell className="px-4 py-3.5">
          {row.setupReason ? (
            <Badge variant="outline" className="text-muted-foreground px-2 py-0.5 font-medium">{row.setupReason}</Badge>
          ) : row.status === 'draft' ? (
            <span className="text-muted-foreground text-[12px]">Onboarding stopped after {row.onboardingStep ?? 'an unknown step'}</span>
          ) : (
            <span className="text-muted-foreground text-[12px]">
              {row.messageSchedules} {row.messageSchedules === 1 ? 'message' : 'messages'} · {row.callPlans} {row.callPlans === 1 ? 'call round' : 'call rounds'}
            </span>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}
