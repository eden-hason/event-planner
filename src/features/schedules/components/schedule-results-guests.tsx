'use client';

import { Fragment, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
} from '@tabler/icons-react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type VisibilityState,
} from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { GuestInteractionRow } from '../queries/guest-interactions';
import {
  availableFilters,
  filterGuests,
  formatAgo,
  formatMoment,
  guestTableHiddenColumns,
  guestTableTier,
  lastActivityAt,
  type GuestFilter,
  type GuestTableTier,
} from '../utils/schedule-results';
import {
  ConfirmedCount,
  GuestStatusAvatar,
  MessageActivityList,
  MessageActivityStrip,
  MessageStateLabel,
  RsvpBadge,
} from './guest-activity';

/** A desktop page of the table */
const PAGE_SIZE = 10;
/** Rows the phone's list shows at first, and how many each "more" adds */
const FIRST = 10;
const STEP = 25;

/**
 * Widths for every column but the guest's, which takes the rest, so the table
 * holds its shape as rows open and close. With no RSVP the answer columns'
 * share goes to the others.
 */
const COLUMN_WIDTH = {
  withRsvp: {
    phone: 'w-[16%]',
    message: 'w-[18%]',
    rsvp: 'w-[17%]',
    count: 'w-[9%]',
    lastUpdate: 'w-[15%]',
    expand: 'w-12',
  },
  withoutRsvp: {
    phone: 'w-[20%]',
    message: 'w-[24%]',
    lastUpdate: 'w-[20%]',
    expand: 'w-12',
  },
} as const satisfies Record<string, Record<string, string>>;

interface ScheduleResultsGuestsProps {
  guests: GuestInteractionRow[];
  collectsRsvp: boolean;
  showSeen: boolean;
  filter: GuestFilter;
  onFilterChange: (filter: GuestFilter) => void;
  /** The open guest: expanded under its table row, or in the phone's sheet */
  selectedId: string | null;
  /** Opens a guest, or closes it when it is the open one */
  onSelect: (guestId: string) => void;
  now: Date;
  locale: string;
  isRTL: boolean;
}

/**
 * Every guest the Schedule went to, in one card: search and filters on top,
 * then the guests (Guest list status options, screens 7 and 11).
 *
 * Two views, switched where the app switches between its phone and desktop
 * layouts (`md`, the breakpoint `useIsMobile` reads) and nowhere else:
 *
 * - On a phone, a list - where the guest stands as one circle, name and
 *   number, when they last moved - each row opening the guest's sheet.
 * - On desktop, a Data Table (shadcn Table + TanStack) a page at a time, a row
 *   opening the message's activity under it. However narrow the pane gets
 *   beside the timeline it stays a table, folding columns away in steps
 *   measured on its own width (`guestTableTier`).
 *
 * The header arranges itself on the pane's width the same way: search and
 * filters side by side from `@2xl`, stacked below it.
 */
export function ScheduleResultsGuests({
  guests,
  collectsRsvp,
  showSeen,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  now,
  locale,
  isRTL,
}: ScheduleResultsGuestsProps) {
  const t = useTranslations('schedules.results.guests');
  const [tableRef, tier] = useTableTier();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(FIRST);
  const [page, setPage] = useState(0);

  const chips = availableFilters({ collectsRsvp, showSeen });
  const rows = useMemo(
    () => filterGuests(guests, { filter, query }),
    [guests, filter, query],
  );

  // The phone's list grows with "more"; the table pages. Both are kept stable
  // between renders: TanStack re-derives its rows whenever `data` changes.
  const visible = useMemo(() => rows.slice(0, shown), [rows, shown]);
  const remaining = rows.length - visible.length;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // A refresh can shorten the list under an open page
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [rows, safePage],
  );

  const narrow = (next: () => void) => {
    next();
    setShown(FIRST);
    setPage(0);
  };

  // Relative ("5 minutes ago"), with the exact moment on hover
  const when = (row: GuestInteractionRow) => {
    const at = lastActivityAt(row);
    return at
      ? {
          text: formatAgo(at, { now, locale }),
          title: formatMoment(at, { now, locale }),
        }
      : { text: '–', title: undefined };
  };

  const phone = (row: GuestInteractionRow, className?: string) =>
    row.phone && (
      // LTR inside a RTL row, sized to its text so it keeps to the start edge
      <bdi dir="ltr" className={cn('self-start tabular-nums', className)}>
        {formatPhone(row.phone)}
      </bdi>
    );

  const Forward = isRTL ? IconChevronLeft : IconChevronRight;
  const widths = collectsRsvp
    ? COLUMN_WIDTH.withRsvp
    : COLUMN_WIDTH.withoutRsvp;

  const columns: ColumnDef<GuestInteractionRow>[] = [
    {
      id: 'guest',
      header: t('columns.guest'),
      cell: ({ row }) => (
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-semibold">
            {row.original.guestName}
          </span>
          {/* The phone column folded away: the number moves under the name */}
          {tier !== 'full' &&
            phone(row.original, 'text-muted-foreground text-[13px]')}
        </span>
      ),
    },
    {
      id: 'phone',
      header: t('columns.phone'),
      cell: ({ row }) => phone(row.original, 'text-foreground/70'),
    },
    {
      id: 'message',
      header: t('columns.message'),
      cell: ({ row }) => <MessageStateLabel row={row.original} />,
    },
    ...(collectsRsvp
      ? ([
          {
            id: 'rsvp',
            header: t('columns.rsvp'),
            cell: ({ row }) => <RsvpBadge row={row.original} />,
          },
          {
            id: 'count',
            header: t('columns.count'),
            cell: ({ row }) => <ConfirmedCount row={row.original} />,
          },
        ] satisfies ColumnDef<GuestInteractionRow>[])
      : []),
    {
      id: 'lastUpdate',
      header: t('columns.lastUpdate'),
      cell: ({ row }) => {
        const at = when(row.original);
        return (
          <span title={at.title} className="text-muted-foreground text-[13px]">
            {at.text}
          </span>
        );
      },
    },
    {
      id: 'expand',
      header: () => <span className="sr-only">{t('columns.actions')}</span>,
      cell: ({ row }) => {
        const open = row.getIsExpanded();
        const RowChevron = open ? IconChevronDown : Forward;
        return (
          // The row's one control, for the keyboard; a click anywhere on the
          // row bubbles to the row's own handler.
          <button
            type="button"
            aria-expanded={open}
            aria-label={t('openActivity', { name: row.original.guestName })}
            className="text-muted-foreground hover:bg-muted hover:text-foreground ms-auto flex size-8 items-center justify-center rounded-lg transition-colors"
          >
            <RowChevron size={16} aria-hidden />
          </button>
        );
      },
    },
  ];

  // One guest open at a time, owned by the caller (the phone's sheet reads it too)
  const expanded: ExpandedState = selectedId ? { [selectedId]: true } : {};
  const columnVisibility: VisibilityState = useMemo(
    () => guestTableHiddenColumns(tier, collectsRsvp),
    [tier, collectsRsvp],
  );

  const table = useReactTable({
    data: pageRows,
    columns,
    // Folded columns are hidden through the table, not CSS, so the expanded
    // row's colSpan counts only the columns on screen.
    state: { expanded, columnVisibility },
    // Paging is ours, not the table's. Left on, every new `data` queues a
    // page-index reset as a microtask, the reset re-renders, and a new array
    // re-queues it - an endless loop that froze the page on the first click.
    autoResetPageIndex: false,
    getRowId: (row) => row.guestId,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const from = rows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, rows.length);

  return (
    <section className="bg-card flex flex-col overflow-hidden rounded-2xl border">
      {/* Sizes follow the app's phone/desktop switch (md); the arrangement, the
          pane's own width (@2xl), as the result cards above do. */}
      <div className="flex flex-col gap-2.5 border-b px-3.5 pt-3.5 pb-3 md:gap-3 md:p-4">
        {/* Titled like the other result cards (CardTitle in schedule-results) */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold @2xl:text-[15px]">{t('title')}</h3>
          <span className="text-muted-foreground text-[11.5px]">
            {t('count', { count: guests.length })}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-3">
          <div className="relative @2xl:w-80 @2xl:min-w-[220px] @2xl:shrink">
            <IconSearch
              size={16}
              className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => narrow(() => setQuery(e.target.value))}
              placeholder={t('search')}
              aria-label={t('search')}
              className="bg-card h-[34px] rounded-[10px] ps-9 md:h-9 md:rounded-lg"
            />
          </div>

          {/* One row that scrolls rather than wraps, at every width */}
          <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 md:-mx-4 md:px-4 @2xl:mx-0 @2xl:px-0">
            {chips.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => narrow(() => onFilterChange(key))}
                className={cn(
                  'h-[26px] shrink-0 rounded-full border px-[11px] text-[12.5px] whitespace-nowrap transition-colors md:h-8 md:px-[13px] md:text-[13px]',
                  // The Guests page's purple for an applied filter (active-filter-chips)
                  filter === key
                    ? 'bg-primary/8 text-primary border-primary/40 font-semibold'
                    : 'bg-muted text-foreground/70 hover:bg-accent border-transparent',
                )}
              >
                {t(`filters.${key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-muted-foreground px-4 py-6 text-center text-[13px]">
          {t('none')}
        </p>
      )}

      {/* Phone: a list, each guest one row opening its sheet */}
      <div className="divide-y md:hidden">
        {visible.map((row) => {
          const open = selectedId === row.guestId;
          const at = when(row);
          return (
            <button
              key={row.guestId}
              type="button"
              onClick={() => onSelect(row.guestId)}
              aria-haspopup="dialog"
              className={cn(
                'hover:bg-muted/50 flex h-[62px] w-full items-center gap-3 px-3.5 text-start transition-colors',
                open && 'bg-muted/40',
              )}
            >
              <GuestStatusAvatar row={row} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">
                  {row.guestName}
                </span>
                {phone(row, 'text-muted-foreground text-[13px]')}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span
                  title={at.title}
                  className="text-muted-foreground text-[12.5px] whitespace-nowrap"
                >
                  {at.text}
                </span>
                <span className="text-muted-foreground flex size-8 items-center justify-center">
                  <Forward size={16} aria-hidden />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + STEP)}
          className="text-primary hover:bg-muted/50 border-t px-4 py-3 text-center text-[13px] font-semibold transition-colors md:hidden"
        >
          {t('more', { count: remaining })}
        </button>
      )}

      {/* Desktop: a Data Table, a page at a time, the open guest's activity
          under its row. Measured, so it can fold columns on a narrow pane. */}
      {rows.length > 0 && (
        <div ref={tableRef} className="hidden md:block">
          <Table className="table-fixed text-sm">
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'text-muted-foreground h-[42px] px-2 text-[13px] font-semibold first:ps-4 last:pe-4',
                        widths[header.column.id as keyof typeof widths],
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                const open = row.getIsExpanded();
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      data-state={open ? 'selected' : undefined}
                      onClick={() => onSelect(row.id)}
                      className={cn(
                        'h-[53px] cursor-pointer',
                        open &&
                          'bg-muted/40 data-[state=selected]:bg-muted/40 border-b-0',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="overflow-hidden px-2 py-0 first:ps-4 last:pe-4"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {open && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell
                          colSpan={row.getVisibleCells().length}
                          className="px-4 pt-2 pb-5 whitespace-normal"
                        >
                          {/* Across the row while there is room for its steps */}
                          {tier === 'full' || tier === 'medium' ? (
                            <MessageActivityStrip
                              row={row.original}
                              now={now}
                              locale={locale}
                            />
                          ) : (
                            <MessageActivityList
                              row={row.original}
                              now={now}
                              locale={locale}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
            <span className="text-muted-foreground text-[13px] tabular-nums">
              {t('pagination.range', { from, to, total: rows.length })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[13px] font-normal"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
              >
                {t('pagination.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[13px] font-normal"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
              >
                {t('pagination.next')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * How much room the table has, as a `GuestTableTier`. Set only when the tier
 * changes, and the table's width comes from the layout, never from its
 * columns, so folding a column cannot feed back into another measurement.
 * Until the first measurement the table renders whole, as the server did.
 */
function useTableTier() {
  const [tier, setTier] = useState<GuestTableTier>('full');
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      // A hidden table (a phone) measures 0: nothing to fold for
      if (entry.contentRect.width > 0) {
        setTier(guestTableTier(entry.contentRect.width));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, tier] as const;
}
