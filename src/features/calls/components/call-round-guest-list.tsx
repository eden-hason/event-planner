'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconMessage,
  IconNote,
  IconPhoneOff,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
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
import { rsvpPresentation } from '@/features/guests';

import type { CallRoundGuestRow } from '../types';
import { callOutcomePresentation } from '../utils/outcome-presentation';
import {
  availableFilters,
  filterGuestRows,
  isAlreadyAnswered,
  type GuestFilter,
} from '../utils/round-results';

/** Rows shown before "show more" on a phone, and how many each press adds. */
const PHONE_FIRST = 6;
const PHONE_STEP = 20;
/** Rows per page in the table. */
const TABLE_PAGE = 10;

const OUTCOME_GLYPH = {
  confirmed: IconCheck,
  declined: IconX,
  no_answer: IconPhoneOff,
  guest_will_update: IconMessage,
} as const;

const OUTCOME_KEY = {
  confirmed: 'confirmed',
  declined: 'declined',
  no_answer: 'noAnswer',
  guest_will_update: 'willUpdate',
} as const;

function OutcomeChip({ outcome, large }: { outcome: CallRoundGuestRow['outcome']; large?: boolean }) {
  const t = useTranslations('calls.outcome');
  const Glyph = outcome ? OUTCOME_GLYPH[outcome] : IconDots;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold whitespace-nowrap',
        large ? 'px-[9px] py-1 text-xs' : 'px-[9px] py-1 text-[11.5px]',
        callOutcomePresentation(outcome).chip,
      )}
    >
      <Glyph size={12} stroke={2.4} />
      {outcome ? t(OUTCOME_KEY[outcome]) : t('notCalled')}
    </span>
  );
}

function RsvpChip({ status }: { status: CallRoundGuestRow['currentRsvpStatus'] }) {
  const t = useTranslations('calls.rsvp');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap',
        rsvpPresentation(status).chip,
      )}
    >
      {t(status)}
    </span>
  );
}

/**
 * Every guest the round was put to, with how the call ended and where their
 * RSVP stands now.
 *
 * The two are separate on purpose. A guest on the call list can confirm by
 * WhatsApp the next day and be skipped, leaving the call outcome empty for
 * good; showing only the outcome would read as "your planner never called
 * them", so the row says they answered first.
 *
 * Built for a hundred guests: search and outcome filters narrow the list, a
 * phone reveals it in steps, and a wide screen pages a table.
 */
export function CallRoundGuestList({ guests }: { guests: CallRoundGuestRow[] }) {
  const t = useTranslations('calls.guests');
  const isRTL = useLocale() === 'he';

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [phoneCount, setPhoneCount] = useState(PHONE_FIRST);
  const [page, setPage] = useState(0);

  const filters = useMemo(() => availableFilters(guests), [guests]);
  const rows = useMemo(() => filterGuestRows(guests, { filter, query }), [guests, filter, query]);

  // Most rounds produce no remarks at all, and an empty column squeezes the
  // others for nothing. Keyed to the whole round rather than the current page
  // so it does not appear and vanish as the host pages through.
  const hasNotes = guests.some((g) => g.notes);

  const totalPages = Math.ceil(rows.length / TABLE_PAGE);
  // A filter can leave fewer pages than the one being viewed.
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const tableRows = rows.slice(safePage * TABLE_PAGE, (safePage + 1) * TABLE_PAGE);
  const phoneRows = rows.slice(0, phoneCount);
  const remaining = rows.length - phoneRows.length;

  const narrow = (next: () => void) => {
    next();
    setPhoneCount(PHONE_FIRST);
    setPage(0);
  };

  return (
    <section className="bg-card flex flex-col overflow-hidden rounded-[14px] border xl:rounded-2xl">
      <div className="flex flex-col gap-2.5 px-3.5 pt-3.5 pb-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold xl:text-[15px]">{t('title')}</h3>
          <span className="text-muted-foreground text-xs">
            {t('count', { count: guests.length })}
          </span>
        </div>

        <div className="relative">
          <IconSearch
            size={16}
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(e) => narrow(() => setQuery(e.target.value))}
            placeholder={t('search')}
            aria-label={t('search')}
            className="bg-background h-10 rounded-[10px] ps-9 text-[13px]"
          />
        </div>

        {filters.length > 2 && (
          <div className="flex flex-wrap gap-1.5">
            {filters.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => narrow(() => setFilter(key))}
                className={cn(
                  'rounded-full px-[11px] py-[5px] text-xs transition-colors',
                  filter === key
                    ? 'bg-foreground text-background font-bold'
                    : 'bg-muted text-muted-foreground hover:bg-accent font-medium',
                )}
              >
                {t(`filters.${key}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 && (
        <p className="text-muted-foreground border-t px-3.5 py-6 text-center text-[13px]">
          {t('none')}
        </p>
      )}

      {/* Below xl the columns cannot sit side by side beside the timeline, so
          each guest becomes a row of its own with the same facts stacked. */}
      <div className="xl:hidden">
        {phoneRows.map((row) => (
          <div key={row.guestId} className="flex flex-col gap-1.5 border-t px-3.5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-sm font-semibold">{row.guestName}</span>
                <span className="text-muted-foreground/80 text-[11.5px]">
                  {t('people', { count: row.amount })}
                </span>
              </div>
              <OutcomeChip outcome={row.outcome} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground/80 text-[11.5px]">{t('rsvpNow')}</span>
              <RsvpChip status={row.currentRsvpStatus} />
              {isAlreadyAnswered(row) && (
                <span className="text-muted-foreground text-[11px]">{t('answeredFirst')}</span>
              )}
            </div>
            {row.notes && (
              <div className="bg-warning-tint text-warning-strong flex items-start gap-1.5 rounded-[9px] px-2 py-1.5">
                <IconNote size={13} className="mt-0.5 shrink-0" />
                <span className="text-xs leading-relaxed break-words whitespace-pre-line">
                  {row.notes}
                </span>
              </div>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setPhoneCount((n) => n + PHONE_STEP)}
            className="bg-background/60 text-primary w-full border-t py-3 text-[13.5px] font-bold"
          >
            {t('showMore', { count: Math.min(remaining, PHONE_STEP) })}
          </button>
        )}
      </div>

      <div className="hidden xl:block">
        {rows.length > 0 && (
          <Table>
            <TableHeader className="bg-background/60">
              <TableRow>
                {(['guest', 'amount', 'outcome', 'rsvp'] as const).map((column) => (
                  <TableHead key={column} className="text-muted-foreground text-[11.5px] font-bold">
                    {t(`columns.${column}`)}
                  </TableHead>
                ))}
                {hasNotes && (
                  <TableHead className="text-muted-foreground text-[11.5px] font-bold">
                    {t('columns.note')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow key={row.guestId}>
                  <TableCell className="text-[13.5px] font-semibold">{row.guestName}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px] tabular-nums">
                    {row.amount}
                  </TableCell>
                  <TableCell>
                    <OutcomeChip outcome={row.outcome} large />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <RsvpChip status={row.currentRsvpStatus} />
                      {isAlreadyAnswered(row) && (
                        <span className="text-muted-foreground text-[11px]">
                          {t('answeredFirst')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {hasNotes && (
                    <TableCell className="text-muted-foreground max-w-56 text-[12.5px] leading-snug break-words whitespace-pre-line">
                      {row.notes ?? <span className="text-muted-foreground/40">-</span>}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-3.5 py-3">
            <span className="text-muted-foreground text-[12.5px] tabular-nums">
              {t('pager', {
                from: safePage * TABLE_PAGE + 1,
                to: Math.min((safePage + 1) * TABLE_PAGE, rows.length),
                total: rows.length,
              })}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-[9px]"
                aria-label={t('previous')}
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
              >
                {isRTL ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-[9px]"
                aria-label={t('next')}
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
              >
                {isRTL ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
