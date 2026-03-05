'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDynamicPageSize } from '@/hooks/use-dynamic-page-size';
import { fetchDeliveryActivityPage } from '../queries/message-deliveries';
import { type ActivityStatus } from '../schemas';

const ACTIVITY_ROW_HEIGHT = 55; // h-8 avatar + two-line text (38px) with p-2 cell padding (8+8) + 1px border

const STATUS_CONFIG: Record<
  ActivityStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: 'Confirmed',
    className: 'border-green-200 bg-green-100 text-green-700',
  },
  declined: {
    label: 'Declined',
    className: 'border-orange-200 bg-orange-100 text-orange-700',
  },
  read: {
    label: 'Opened',
    className: 'border-blue-200 bg-blue-100 text-blue-700',
  },
};

function formatTime(ts: string | null): string {
  if (!ts) return '—';
  try {
    return format(new Date(ts), 'h:mm a');
  } catch {
    return '—';
  }
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
      {initials || '?'}
    </div>
  );
}

interface RecentDeliveryActivityProps {
  scheduleId: string;
  eventId: string;
}

export function RecentDeliveryActivity({
  scheduleId,
  eventId,
}: RecentDeliveryActivityProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { pageSize, isCalculated } = useDynamicPageSize({
    containerRef,
    rowHeight: ACTIVITY_ROW_HEIGHT,
  });

  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Fetch page 1 with the dynamic page size once calculated
  useEffect(() => {
    if (!isCalculated) return;
    let cancelled = false;

    async function fetchInitial() {
      setLoading(true);
      const result = await fetchDeliveryActivityPage(scheduleId, 1, pageSize);
      if (!cancelled) {
        setData(result);
        setPage(1);
        setLoading(false);
        setIsReady(true);
      }
    }

    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [isCalculated, pageSize, scheduleId]);

  const totalPages = Math.ceil(data.total / pageSize);
  const showing = data.rows.length;

  async function goToPage(newPage: number) {
    setLoading(true);
    const result = await fetchDeliveryActivityPage(
      scheduleId,
      newPage,
      pageSize,
    );
    setData(result);
    setPage(newPage);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Delivery Activity</CardTitle>
        <Link
          href={`/app/${eventId}/guests`}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          View All Recipients →
        </Link>
      </CardHeader>
      <CardContent ref={containerRef}>
        {isReady && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Responded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const status = STATUS_CONFIG[row.activityStatus];
                return (
                  <TableRow
                    key={row.id}
                    className={loading ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Initials name={row.guestName} />
                        <div>
                          <p className="leading-tight font-medium">
                            {row.guestName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {row.guestPhone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTime(row.sentAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTime(row.readAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTime(row.respondedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className={`flex items-center justify-between pt-4 ${!isReady ? 'invisible' : ''}`}>
        <p className="text-muted-foreground text-sm">
          Showing {showing} of {data.total} recipients
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
