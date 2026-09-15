'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { rsvpPresentation } from '@/features/guests';
import { useLocale } from 'next-intl';
import {
  IconCheck,
  IconChecks,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
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

import type {
  GuestDeliveryOutcome,
  GuestInteractionRow,
  ScheduleInteractionData,
} from '../queries/guest-interactions';

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
  // A response of confirm/decline *is* an RSVP, so it speaks that vocabulary.
  if (row.response === 'rsvp_confirm') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          rsvpPresentation('confirmed').chip,
        )}
      >
        <IconCheck size={11} strokeWidth={2.5} />
        {labels.confirmed}
      </span>
    );
  }
  if (row.response === 'rsvp_decline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          rsvpPresentation('declined').chip,
        )}
      >
        <IconX size={11} strokeWidth={2.5} />
        {labels.declined}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-xs">{labels.pending}</span>
  );
}

type NotReachedOutcome = Extract<
  GuestDeliveryOutcome,
  'on_its_way' | 'not_delivered' | 'no_phone'
>;

function DeliveryLabel({
  outcome,
  labels,
}: {
  outcome: GuestDeliveryOutcome | null;
  labels: GuestInteractionsTableProps['labels'];
}) {
  if (!outcome)
    return <span className="text-muted-foreground/40 text-xs">-</span>;
  const text = {
    whatsapp: labels.deliveryWhatsapp,
    sms: labels.deliverySms,
    on_its_way: labels.deliveryOnItsWay,
    not_delivered: labels.deliveryNotDelivered,
    no_phone: labels.deliveryNoPhone,
  }[outcome];
  const reached = outcome === 'whatsapp' || outcome === 'sms';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        reached ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {reached && (
        <IconCheck size={11} strokeWidth={2.5} className="text-primary" />
      )}
      {text}
    </span>
  );
}

/**
 * The WhatsApp read receipt. Only WhatsApp reports one, so an SMS guest is
 * blank here rather than unseen - the two are different facts and a cross would
 * claim the second.
 */
function SeenMark({ row }: { row: GuestInteractionRow }) {
  if (row.delivery === 'sms' || !row.seen)
    return <span className="text-muted-foreground/40 text-xs">-</span>;
  return <IconChecks size={15} className="inline text-primary" />;
}

interface GuestInteractionsTableProps {
  guests: GuestInteractionRow[];
  notReached: ScheduleInteractionData['summary']['notReached'];
  /** Show the Response and Guests columns - only a Confirmation round collects them */
  collectsRsvp: boolean;
  /** Show the WhatsApp read receipt - never on an SMS schedule */
  showSeen: boolean;
  /** Show whether the guest opened the RSVP link - only where the message carries one */
  showViews: boolean;
  labels: {
    columnGuest: string;
    columnSeen: string;
    columnViewed: string;
    columnResponse: string;
    columnAmount: string;
    columnDate: string;
    responseConfirmed: string;
    responseDeclined: string;
    responsePending: string;
    columnDelivery: string;
    deliveryWhatsapp: string;
    deliverySms: string;
    deliveryOnItsWay: string;
    deliveryNotDelivered: string;
    deliveryNoPhone: string;
    /** Already counted, e.g. "14 not reached" */
    notReached: string;
    filterAll: string;
  };
}

export function GuestInteractionsTable({
  guests,
  notReached,
  collectsRsvp,
  showSeen,
  showViews,
  labels,
}: GuestInteractionsTableProps) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<NotReachedOutcome | null>(null);
  const isRTL = useLocale() === 'he';
  const visible = filter ? guests.filter((g) => g.delivery === filter) : guests;
  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const slice = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const reasons: {
    outcome: NotReachedOutcome;
    label: string;
    count: number;
  }[] = [
    {
      outcome: 'on_its_way' as const,
      label: labels.deliveryOnItsWay,
      count: notReached.onItsWay,
    },
    {
      outcome: 'not_delivered' as const,
      label: labels.deliveryNotDelivered,
      count: notReached.notDelivered,
    },
    {
      outcome: 'no_phone' as const,
      label: labels.deliveryNoPhone,
      count: notReached.noPhone,
    },
  ].filter((reason) => reason.count > 0);

  const applyFilter = (next: NotReachedOutcome | null) => {
    setFilter(next);
    setPage(0);
  };

  const formatRowDate = (row: GuestInteractionRow) =>
    row.respondedAt
      ? formatDate(row.respondedAt)
      : row.viewedAt
        ? formatDate(row.viewedAt)
        : row.seenAt
          ? formatDate(row.seenAt)
          : row.sentAt
            ? formatDate(row.sentAt)
            : '-';

  return (
    <div className="flex flex-col gap-3">
      {/* The gap between audience and reached, with its reasons. Each reason
          filters the list to the guests behind it - the ones an Owner may want
          to contact personally. */}
      {reasons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground font-medium">
            {labels.notReached}:
          </span>
          {reasons.map((reason) => (
            <Button
              key={reason.outcome}
              type="button"
              variant={filter === reason.outcome ? 'secondary' : 'outline'}
              size="xs"
              onClick={() =>
                applyFilter(filter === reason.outcome ? null : reason.outcome)
              }
            >
              {reason.label}{' '}
              <span className="tabular-nums">{reason.count}</span>
            </Button>
          ))}
          {filter && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => applyFilter(null)}
            >
              {labels.filterAll}
            </Button>
          )}
        </div>
      )}

      {/* Below sm the columns cannot fit, so each guest becomes a row of
          its own with the same facts stacked instead of side by side. */}
      <ItemGroup className="gap-2 sm:hidden">
        {slice.map((row) => (
          <Item key={row.guestId} variant="outline" size="sm">
            <ItemContent className="min-w-0 gap-1">
              <ItemTitle className="w-full min-w-0">
                <span className="truncate">{row.guestName}</span>
                {showSeen && row.seen && row.delivery !== 'sms' && (
                  <IconChecks
                    size={14}
                    className="text-primary shrink-0"
                    aria-label={labels.columnSeen}
                  />
                )}
                {showViews && row.viewed && (
                  <IconEye size={14} className="shrink-0 text-blue-500" />
                )}
              </ItemTitle>
              <ItemDescription className="flex flex-wrap items-center gap-x-2 text-xs">
                <DeliveryLabel outcome={row.delivery} labels={labels} />
                <span>{formatRowDate(row)}</span>
              </ItemDescription>
            </ItemContent>
            {collectsRsvp && (
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
            )}
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
                {labels.columnDelivery}
              </TableHead>
              {showSeen && (
                <TableHead className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                  {labels.columnSeen}
                </TableHead>
              )}
              {showViews && (
                <TableHead className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                  {labels.columnViewed}
                </TableHead>
              )}
              {collectsRsvp && (
                <>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {labels.columnResponse}
                  </TableHead>
                  <TableHead className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                    {labels.columnAmount}
                  </TableHead>
                </>
              )}
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {labels.columnDate}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((row) => (
              <TableRow key={row.guestId}>
                <TableCell className="font-medium">{row.guestName}</TableCell>
                <TableCell>
                  <DeliveryLabel outcome={row.delivery} labels={labels} />
                </TableCell>
                {showSeen && (
                  <TableCell className="text-center">
                    <SeenMark row={row} />
                  </TableCell>
                )}
                {showViews && (
                  <TableCell className="text-center">
                    {row.viewed ? (
                      <IconEye size={15} className="inline text-blue-500" />
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">-</span>
                    )}
                  </TableCell>
                )}
                {collectsRsvp && (
                  <>
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
                  </>
                )}
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
            {isRTL ? (
              <IconChevronRight size={14} />
            ) : (
              <IconChevronLeft size={14} />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages - 1}
          >
            {isRTL ? (
              <IconChevronLeft size={14} />
            ) : (
              <IconChevronRight size={14} />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
