import Link from 'next/link';
import { Surface } from './band';
import { EventsIndexToolbar } from './events-index-toolbar';
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Search, X } from '@/components/icons';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BILLING_STATUS_LABELS, RECORD_PACKAGE_CHANNEL_LABELS } from '@/features/billing';
import type { EventBillingStatus } from '@/features/billing';
import type { EventIndexRow, EventsIndexFilters, EventsIndexPage, EventsIndexSortKey } from '../types';
import { countLabel } from '../utils/count-label';
import {
  createdLabel,
  DEFAULT_EVENTS_INDEX_FILTERS,
  DEFAULT_SORT_DIRECTION,
  eventDateGroup,
  eventsIndexHref,
  hasEventsIndexFilters,
  PAYMENT_LABELS,
  STATUS_LABELS,
  TIMING_LABELS,
} from '../utils/events-index';
import { daysUntil, formatEventDate, israelToday, israelWallClockParts, relativeEventDate } from '@/lib/date-time';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

const HEAD = 'h-10 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase';

export function EventsIndex({ data, filters }: { data: EventsIndexPage; filters: EventsIndexFilters }) {
  const filtered = hasEventsIndexFilters(filters);
  const groupByDate = filters.sort === 'date' && filters.dir === 'asc';
  const today = israelToday();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        <p className="text-muted-foreground text-[13px]">{countLabel(data.totalEvents, 'event')}</p>
      </div>

      {data.totalEvents === 0 ? (
        <Empty className="bg-card min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
            <EmptyTitle>No events yet</EmptyTitle>
            <EmptyDescription>
              Events appear here as soon as an owner starts onboarding
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <EventsIndexToolbar filters={filters} eventTypes={data.eventTypes} />

          {filtered && <ActiveFilters data={data} filters={filters} />}

          {data.rows.length === 0 ? (
            <Empty className="bg-card min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>No events found</EmptyTitle>
                <EmptyDescription>Try changing your search or filters</EmptyDescription>
              </EmptyHeader>
              <Button asChild variant="outline" size="sm">
                <Link href={clearAllHref(filters)}><X data-icon="inline-start" />Clear all</Link>
              </Button>
            </Empty>
          ) : (
            <Surface>
              <Table className="min-w-[1040px]">
                <TableHeader>
                  <TableRow className="bg-muted/35 hover:bg-muted/35">
                    <SortableHead label="Event owner" sortKey="owner" filters={filters} className="w-[24%] pl-4" />
                    <TableHead className={HEAD}>Phone</TableHead>
                    <SortableHead label="Event date" sortKey="date" filters={filters} />
                    <SortableHead label="Created" sortKey="created" filters={filters} />
                    <TableHead className={HEAD}>Type</TableHead>
                    <TableHead className={HEAD}>Payment</TableHead>
                    <TableHead className={HEAD}>Package</TableHead>
                    <SortableHead label="Records" sortKey="records" filters={filters} className="pr-4" align="right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, index) => {
                    const group = eventDateGroup(row.eventDate, today);
                    const previous = data.rows[index - 1];
                    const startsGroup =
                      groupByDate && !!previous && eventDateGroup(previous.eventDate, today) !== group;
                    return (
                      <EventTableRow
                        key={row.id}
                        row={row}
                        ended={group === 1}
                        groupLabel={startsGroup ? (group === 1 ? 'Ended' : 'No date set') : null}
                      />
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination data={data} filters={filters} />
            </Surface>
          )}
        </>
      )}
    </div>
  );
}

/** "Clear all" drops search and filters but keeps the Operator's chosen sort. */
function clearAllHref(filters: EventsIndexFilters) {
  return eventsIndexHref({ ...DEFAULT_EVENTS_INDEX_FILTERS, sort: filters.sort, dir: filters.dir });
}

/** Why these rows are showing: the count, then one removable chip per criterion. */
function ActiveFilters({ data, filters }: { data: EventsIndexPage; filters: EventsIndexFilters }) {
  const typeName = (key: string) => data.eventTypes.find((type) => type.key === key)?.name ?? key;
  const chips: { key: string; label: string; href: string }[] = [];
  const chip = (key: string, label: string, patch: Partial<EventsIndexFilters>) =>
    chips.push({ key, label, href: eventsIndexHref(filters, patch) });

  if (filters.q.trim()) chip('q', `"${filters.q.trim()}"`, { q: '' });
  if (filters.timing) chip('timing', TIMING_LABELS[filters.timing], { timing: null });
  for (const key of filters.types) {
    chip(`type-${key}`, typeName(key), { types: filters.types.filter((type) => type !== key) });
  }
  if (filters.payment) chip('payment', PAYMENT_LABELS[filters.payment], { payment: null });
  if (filters.package) chip('package', RECORD_PACKAGE_CHANNEL_LABELS[filters.package], { package: null });
  const created = createdLabel(filters);
  if (created) {
    chip('created', `Created ${filters.created === 'custom' ? created : created.toLocaleLowerCase('en')}`, {
      created: null,
      createdFrom: null,
      createdTo: null,
    });
  }
  if (filters.status) chip('status', STATUS_LABELS[filters.status], { status: null });

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px]">
      <span className="text-muted-foreground mr-1">
        Showing <strong className="text-foreground font-semibold tabular-nums">{data.totalRows.toLocaleString('en-GB')}</strong> of{' '}
        {countLabel(data.totalEvents, 'event')}
      </span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          aria-label={`Remove filter ${chip.label}`}
          className="bg-card hover:bg-accent inline-flex h-7 items-center gap-1 rounded-full border pr-2 pl-3 text-[12.5px] font-medium transition-colors"
        >
          {chip.label}
          <X className="text-muted-foreground size-3.5" />
        </Link>
      ))}
      <Link
        href={clearAllHref(filters)}
        scroll={false}
        className="text-muted-foreground hover:text-foreground ml-1 text-[12.5px] font-medium underline-offset-4 hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  filters,
  className,
  align = 'left',
}: {
  label: string;
  sortKey: EventsIndexSortKey;
  filters: EventsIndexFilters;
  className?: string;
  align?: 'left' | 'right';
}) {
  const active = filters.sort === sortKey;
  const nextDir = active ? (filters.dir === 'asc' ? 'desc' : 'asc') : DEFAULT_SORT_DIRECTION[sortKey];
  const Icon = !active ? ArrowUpDown : filters.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(HEAD, align === 'right' && 'text-right', className)}
      aria-sort={active ? (filters.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Link
        href={eventsIndexHref(filters, { sort: sortKey, dir: nextDir })}
        scroll={false}
        className={cn(
          'hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
          active && 'text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        <Icon className={cn('size-3.5', !active && 'opacity-40')} aria-hidden="true" />
      </Link>
    </TableHead>
  );
}

function EventTableRow({
  row,
  ended,
  groupLabel,
}: {
  row: EventIndexRow;
  ended: boolean;
  groupLabel: string | null;
}) {
  return (
    <>
      {groupLabel && (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={8} className="text-muted-foreground px-4 py-1.5 text-[11px] font-semibold tracking-[0.07em] uppercase">
            {groupLabel}
          </TableCell>
        </TableRow>
      )}
      {/* The owner link's overlay spans the row, so the whole row opens the Event. */}
      <TableRow className="group relative">
        <TableCell className="max-w-0 py-3 pl-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/events/${row.id}`}
              className="truncate font-medium group-hover:underline after:absolute after:inset-0"
            >
              {row.ownerName}
            </Link>
            {row.status === 'draft' && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em] uppercase">
                Draft
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground mt-0.5 truncate text-[12px]">{row.title}</div>
        </TableCell>
        <TableCell className="text-muted-foreground py-3 text-[13px] tabular-nums">
          {row.ownerPhone ? <span dir="ltr">{formatPhone(row.ownerPhone)}</span> : '-'}
        </TableCell>
        <TableCell className="py-3">
          {row.eventDate ? (
            <>
              <div className={cn('font-medium tabular-nums', ended && 'text-muted-foreground font-normal')}>
                {formatEventDate(row.eventDate)}
              </div>
              <div className="mt-0.5 text-[12px]">
                {ended ? (
                  <Badge variant="outline" className="text-muted-foreground px-1.5 py-0 text-[10px] font-medium tracking-[0.05em] uppercase">
                    Ended
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">
                    {relativeEventDate(daysUntil(row.eventDate), { futureStyle: 'in' })}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">No date</span>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground py-3 text-[13px] tabular-nums">
          {formatEventDate(israelWallClockParts(row.createdAt).date)}
        </TableCell>
        <TableCell className="py-3 text-[13px]">{row.eventTypeName}</TableCell>
        <TableCell className="py-3">
          <PaymentStatus status={row.billingStatus} />
        </TableCell>
        <TableCell className="py-3 text-[13px]">
          {row.packageChannel ? (
            RECORD_PACKAGE_CHANNEL_LABELS[row.packageChannel]
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className={cn('py-3 pr-4 text-right text-[13px] tabular-nums', row.guestRecords === 0 && 'text-muted-foreground')}>
          {row.guestRecords.toLocaleString('en-GB')}
        </TableCell>
      </TableRow>
    </>
  );
}

/**
 * Paid or not, at a glance. A dot rather than a filled pill: most Events are
 * unpaid while they are still planning, and a column of solid warning pills
 * would shout. Pending and Canceled count as unpaid but keep their own word.
 */
const PAYMENT_STATUS: Record<EventBillingStatus, { label: string; text: string; dot: string }> = {
  paid: { label: BILLING_STATUS_LABELS.paid, text: 'text-foreground', dot: 'bg-success' },
  free: { label: 'Unpaid', text: 'text-warning-strong font-medium', dot: 'bg-warning-solid' },
  payment_pending: { label: 'Pending', text: 'text-warning-strong font-medium', dot: 'bg-warning-solid' },
  canceled: { label: BILLING_STATUS_LABELS.canceled, text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' },
};

function PaymentStatus({ status }: { status: EventBillingStatus }) {
  const { label, text, dot } = PAYMENT_STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px]', text)}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

function Pagination({ data, filters }: { data: EventsIndexPage; filters: EventsIndexFilters }) {
  const first = (data.page - 1) * data.pageSize + 1;
  const last = Math.min(data.page * data.pageSize, data.totalRows);
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-3 border-t px-4 py-3 text-[12.5px]">
      <span className="tabular-nums">
        {first.toLocaleString('en-GB')}-{last.toLocaleString('en-GB')} of {countLabel(data.totalRows, 'event')}
      </span>
      <div className="flex items-center gap-3">
        {data.pageCount > 1 && (
          <span className="tabular-nums">Page {data.page} of {data.pageCount}</span>
        )}
        <div className="flex gap-2">
          <PageLink label="Previous" page={data.page - 1} data={data} filters={filters} />
          <PageLink label="Next" page={data.page + 1} data={data} filters={filters} />
        </div>
      </div>
    </div>
  );
}

function PageLink({
  label,
  page,
  data,
  filters,
}: {
  label: string;
  page: number;
  data: EventsIndexPage;
  filters: EventsIndexFilters;
}) {
  const enabled = page >= 1 && page <= data.pageCount;
  return (
    <Button asChild={enabled} variant="outline" size="sm" disabled={!enabled}>
      {enabled ? <Link href={eventsIndexHref(filters, { page })}>{label}</Link> : <span>{label}</span>}
    </Button>
  );
}
