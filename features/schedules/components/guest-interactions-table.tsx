'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { IconCheck, IconChevronLeft, IconChevronRight, IconEye, IconX } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{labels.columnGuest}</TableHead>
          <TableHead className="text-muted-foreground text-center text-xs font-medium uppercase tracking-wide">{labels.columnViewed}</TableHead>
          <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{labels.columnResponse}</TableHead>
          <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{labels.columnDate}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {slice.map((row) => (
          <TableRow key={row.guestId}>
            <TableCell className="font-medium">{row.guestName}</TableCell>
            <TableCell className="text-center">
              {row.viewed ? (
                <IconEye size={15} className="text-blue-500 inline" />
              ) : (
                <span className="text-muted-foreground/40 text-xs">-</span>
              )}
            </TableCell>
            <TableCell>
              <ResponseBadge
                row={row}
                labels={{ confirmed: labels.responseConfirmed, declined: labels.responseDeclined, pending: labels.responsePending }}
              />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {row.respondedAt
                ? formatDate(row.respondedAt)
                : row.viewedAt
                  ? formatDate(row.viewedAt)
                  : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {totalPages > 1 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>
              <div className="flex items-center justify-end gap-2 rtl:justify-start">
                <span className="text-muted-foreground text-xs">{page + 1} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                >
                  {isRTL ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages - 1}
                >
                  {isRTL ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
