'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { IconCheck, IconChevronLeft, IconChevronRight, IconEye, IconX } from '@tabler/icons-react';

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

import type { GuestInteractionRow } from '../queries/guest-interactions';

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ResponseBadge({
  row,
  labels,
}: {
  row: GuestInteractionRow;
  labels: { confirmed: string; declined: string; pending: string };
}) {
  if (row.response === 'rsvp_confirm') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
        <IconCheck size={11} strokeWidth={2.5} />
        {labels.confirmed}
      </span>
    );
  }
  if (row.response === 'rsvp_decline') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
        <IconX size={11} strokeWidth={2.5} />
        {labels.declined}
      </span>
    );
  }
  return <span className="text-muted-foreground text-xs">{labels.pending}</span>;
}

interface GuestInteractionsTableProps {
  guests: GuestInteractionRow[];
  labels: {
    columnGuest: string;
    columnViewed: string;
    columnResponse: string;
    columnAmount: string;
    columnDate: string;
    responseConfirmed: string;
    responseDeclined: string;
    responsePending: string;
  };
}

export function GuestInteractionsTable({ guests, labels }: GuestInteractionsTableProps) {
  const [page, setPage] = useState(0);
  const isRTL = useLocale() === 'he';
  const totalPages = Math.ceil(guests.length / PAGE_SIZE);
  const slice = guests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatRowDate = (row: GuestInteractionRow) =>
    row.respondedAt
      ? formatDate(row.respondedAt)
      : row.viewedAt
        ? formatDate(row.viewedAt)
        : '-';

  return (
    <div className="flex flex-col gap-3">
      {/* Below sm the five columns cannot fit, so each guest becomes a row of
          its own with the same facts stacked instead of side by side. */}
      <ItemGroup className="gap-2 sm:hidden">
        {slice.map((row) => (
          <Item key={row.guestId} variant="outline" size="sm">
            <ItemContent className="min-w-0 gap-1">
              <ItemTitle className="w-full min-w-0">
                <span className="truncate">{row.guestName}</span>
                {row.viewed && <IconEye size={14} className="shrink-0 text-blue-500" />}
              </ItemTitle>
              <ItemDescription className="text-xs">{formatRowDate(row)}</ItemDescription>
            </ItemContent>
            <ItemActions>
              {row.response === 'rsvp_confirm' && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {labels.columnAmount} {row.amount}
                </span>
              )}
              <ResponseBadge
                row={row}
                labels={{
                  confirmed: labels.responseConfirmed,
                  declined: labels.responseDeclined,
                  pending: labels.responsePending,
                }}
              />
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
              <TableHead className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                {labels.columnViewed}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {labels.columnResponse}
              </TableHead>
              <TableHead className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                {labels.columnAmount}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {labels.columnDate}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((row) => (
              <TableRow key={row.guestId}>
                <TableCell className="font-medium">{row.guestName}</TableCell>
                <TableCell className="text-center">
                  {row.viewed ? (
                    <IconEye size={15} className="inline text-blue-500" />
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <ResponseBadge
                    row={row}
                    labels={{
                      confirmed: labels.responseConfirmed,
                      declined: labels.responseDeclined,
                      pending: labels.responsePending,
                    }}
                  />
                </TableCell>
                {/* Headcount only reads as a number of attendees once they have
                    said yes - showing it beside a decline is noise. */}
                <TableCell className="text-center text-xs tabular-nums">
                  {row.response === 'rsvp_confirm' ? (
                    row.amount
                  ) : (
                    <span className="text-muted-foreground/40">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatRowDate(row)}
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
