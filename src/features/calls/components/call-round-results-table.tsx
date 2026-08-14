'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPhoneOff,
  IconX,
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { CallRoundGuestRow } from '../types';

const PAGE_SIZE = 10;

export type CallRoundResultsLabels = {
  columnGuest: string;
  columnOutcome: string;
  columnRsvp: string;
  columnAmount: string;
  outcomeConfirmed: string;
  outcomeDeclined: string;
  outcomeNoAnswer: string;
  outcomeNotCalled: string;
  rsvpConfirmed: string;
  rsvpDeclined: string;
  rsvpPending: string;
};

function OutcomeBadge({
  outcome,
  labels,
}: {
  outcome: CallRoundGuestRow['outcome'];
  labels: CallRoundResultsLabels;
}) {
  if (outcome === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
        <IconCheck size={11} strokeWidth={2.5} />
        {labels.outcomeConfirmed}
      </span>
    );
  }
  if (outcome === 'declined') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
        <IconX size={11} strokeWidth={2.5} />
        {labels.outcomeDeclined}
      </span>
    );
  }
  if (outcome === 'no_answer') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
        <IconPhoneOff size={11} strokeWidth={2.5} />
        {labels.outcomeNoAnswer}
      </span>
    );
  }
  return <span className="text-muted-foreground text-xs">{labels.outcomeNotCalled}</span>;
}

/**
 * Sibling of the schedules feature's GuestInteractionsTable rather than a
 * shared component: "viewed / responded" and "called / outcome" are different
 * domain facts that merely look alike in a table, and a shared row type would
 * be a union of nullable fields every cell has to narrow.
 */
export function CallRoundResultsTable({
  guests,
  labels,
}: {
  guests: CallRoundGuestRow[];
  labels: CallRoundResultsLabels;
}) {
  const [page, setPage] = useState(0);
  const isRTL = useLocale() === 'he';
  const totalPages = Math.ceil(guests.length / PAGE_SIZE);
  const slice = guests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const rsvpLabels: Record<CallRoundGuestRow['currentRsvpStatus'], string> = {
    confirmed: labels.rsvpConfirmed,
    declined: labels.rsvpDeclined,
    pending: labels.rsvpPending,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Below sm the four columns cannot fit, so each guest becomes a row of
          its own with the same facts stacked instead of side by side. */}
      <ItemGroup className="gap-2 sm:hidden">
        {slice.map((row) => (
          <Item key={row.guestId} variant="outline" size="sm">
            <ItemContent className="min-w-0 gap-1">
              <ItemTitle className="w-full min-w-0">
                <span className="truncate">{row.guestName}</span>
              </ItemTitle>
              <ItemDescription className="text-xs">
                {rsvpLabels[row.currentRsvpStatus]}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {row.outcome === 'confirmed' && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {labels.columnAmount} {row.amount}
                </span>
              )}
              <OutcomeBadge outcome={row.outcome} labels={labels} />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {labels.columnGuest}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {labels.columnOutcome}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {labels.columnRsvp}
              </TableHead>
              <TableHead className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                {labels.columnAmount}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((row) => (
              <TableRow key={row.guestId}>
                <TableCell className="font-medium">{row.guestName}</TableCell>
                <TableCell>
                  <OutcomeBadge outcome={row.outcome} labels={labels} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {rsvpLabels[row.currentRsvpStatus]}
                </TableCell>
                {/* Keyed to the call outcome, not the current RSVP, so the column
                    sums to the headcount in the confirmed chip. A guest who
                    confirmed by WhatsApp instead belongs to that schedule's
                    numbers, not this round's. */}
                <TableCell className="text-center text-xs tabular-nums">
                  {row.outcome === 'confirmed' ? (
                    row.amount
                  ) : (
                    <span className="text-muted-foreground/40">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Sits outside the table so the card list is paged by the same control */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 rtl:justify-start">
          <span className="text-muted-foreground text-xs">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            {isRTL ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages - 1}
          >
            {isRTL ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
          </Button>
        </div>
      )}
    </div>
  );
}
