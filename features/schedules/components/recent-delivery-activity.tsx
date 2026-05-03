'use client';

import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Search, Users, Utensils } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useDynamicPageSize } from '@/hooks/use-dynamic-page-size';
import { fetchDeliveryActivityPage } from '../queries/message-deliveries';
import { type ActivityStatus, type DeliveryActivityPage } from '../types';

const ACTIVITY_ROW_HEIGHT = 55; // h-8 avatar + two-line text (38px) with p-2 cell padding (8+8) + 1px border

const STATUS_STYLE: Record<
  ActivityStatus,
  { className: string; dotColor: string; labelColor: string }
> = {
  confirmed: {
    className: 'border-green-200 bg-green-100 text-green-700',
    dotColor: 'bg-green-500',
    labelColor: 'text-green-700',
  },
  declined: {
    className: 'border-orange-200 bg-orange-100 text-orange-700',
    dotColor: 'bg-orange-500',
    labelColor: 'text-orange-700',
  },
  read: {
    className: 'border-blue-200 bg-blue-100 text-blue-700',
    dotColor: 'bg-blue-500',
    labelColor: 'text-blue-700',
  },
  failed: {
    className: 'border-red-200 bg-red-100 text-red-700',
    dotColor: 'bg-red-500',
    labelColor: 'text-red-700',
  },
};

const FAILED_ERROR_LABELS: Record<number, string> = {
  130429: 'Rate limit exceeded',
  131048: 'Rate limit exceeded',
  131056: 'Rate limit exceeded',
  131057: 'Temporary service issue',
  131021: 'Invalid phone number',
  131049: 'Recipient message cap',
};

const ALL_STATUSES: ActivityStatus[] = ['confirmed', 'declined', 'read', 'failed'];

function TimeStamp({ ts }: { ts: string | null }) {
  if (!ts) return <span>—</span>;
  try {
    const date = new Date(ts);
    return (
      <div className="flex flex-col">
        <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
        <span className="text-muted-foreground text-xs">
          {format(date, 'MMM d, h:mm a')}
        </span>
      </div>
    );
  } catch {
    return <span>—</span>;
  }
}

function FailedReason({
  errorCode,
  errorMessage,
}: {
  errorCode?: number | null;
  errorMessage?: string | null;
}) {
  const label =
    (errorCode != null && FAILED_ERROR_LABELS[errorCode]) ||
    errorMessage ||
    'Delivery failed';

  return (
    <span className="text-xs font-medium text-red-600">
      {errorCode != null ? `[${errorCode}] ` : ''}
      {label}
    </span>
  );
}

function RsvpDetails({
  status,
  metadata,
  t,
}: {
  status: ActivityStatus;
  metadata: { guestCount?: number; dietaryRestrictions?: string } | null;
  t: ReturnType<typeof useTranslations<'schedules.activity'>>;
}) {
  if (status === 'read' || status === 'failed')
    return <span className="text-muted-foreground">—</span>;
  if (!metadata || (!metadata.guestCount && !metadata.dietaryRestrictions))
    return <span className="text-muted-foreground text-xs">{t('table.noDetails')}</span>;

  return (
    <div className="flex flex-col gap-1">
      {metadata.guestCount != null && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
          <Users className="h-3 w-3" />
          {t('table.partyOf', { count: metadata.guestCount })}
        </span>
      )}
      {metadata.dietaryRestrictions && (
        <span className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground italic">
          <Utensils className="h-3 w-3 shrink-0" />
          {metadata.dietaryRestrictions}
        </span>
      )}
    </div>
  );
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

function StatusFilterTrigger({
  selected,
  t,
}: {
  selected: ActivityStatus[];
  t: ReturnType<typeof useTranslations<'schedules.activity'>>;
}) {
  if (selected.length === 0) {
    return (
      <span className="flex items-center gap-1.5">
        {t('allStatuses')}
        <IconChevronDown className="h-3.5 w-3.5 opacity-50" />
      </span>
    );
  }

  if (selected.length === 1) {
    const style = STATUS_STYLE[selected[0]];
    return (
      <span className="flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', style.dotColor)} />
        <span className={style.labelColor}>{t(`statuses.${selected[0]}`)}</span>
        <IconChevronDown className="h-3.5 w-3.5 opacity-50" />
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="flex gap-0.5">
        {selected.map((s) => (
          <span
            key={s}
            className={cn('h-2 w-2 rounded-full', STATUS_STYLE[s].dotColor)}
          />
        ))}
      </span>
      <span>{t('statusCount', { count: selected.length })}</span>
      <IconChevronDown className="h-3.5 w-3.5 opacity-50" />
    </span>
  );
}

interface RecentDeliveryActivityProps {
  scheduleId: string;
  eventId: string;
  showRsvpDetails?: boolean;
  selectedStatuses: ActivityStatus[];
  onStatusChange: (statuses: ActivityStatus[]) => void;
}

export function RecentDeliveryActivity({
  scheduleId,
  eventId,
  showRsvpDetails = true,
  selectedStatuses,
  onStatusChange,
}: RecentDeliveryActivityProps) {
  const t = useTranslations('schedules.activity');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { pageSize, isCalculated } = useDynamicPageSize({
    containerRef,
    rowHeight: ACTIVITY_ROW_HEIGHT,
  });

  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeliveryActivityPage>({
    rows: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch page 1 with the dynamic page size once calculated
  useEffect(() => {
    if (!isCalculated) return;
    let cancelled = false;

    async function fetchInitial() {
      setLoading(true);
      const result = await fetchDeliveryActivityPage(
        scheduleId,
        1,
        pageSize,
        debouncedSearch,
        selectedStatuses,
      );
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
  }, [isCalculated, pageSize, scheduleId, debouncedSearch, selectedStatuses]);

  const totalPages = Math.ceil(data.total / pageSize);
  const showing = data.rows.length;

  async function goToPage(newPage: number) {
    setLoading(true);
    const result = await fetchDeliveryActivityPage(
      scheduleId,
      newPage,
      pageSize,
      debouncedSearch,
      selectedStatuses,
    );
    setData(result);
    setPage(newPage);
    setLoading(false);
  }

  function toggleStatus(status: ActivityStatus) {
    onStatusChange(
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((s) => s !== status)
        : [...selectedStatuses, status],
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('cardTitle')}</CardTitle>
          <Link
            href={`/app/${eventId}/guests`}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t('viewAllRecipients')}
          </Link>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="relative w-56">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          {showRsvpDetails && <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 shrink-0">
                <StatusFilterTrigger selected={selectedStatuses} t={t} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              {ALL_STATUSES.map((status) => {
                const style = STATUS_STYLE[status];
                const isChecked = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        isChecked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input',
                      )}
                    >
                      {isChecked && <IconCheck className="h-3 w-3" />}
                    </span>
                    <span className={cn('flex items-center gap-1.5', style.labelColor)}>
                      <span className={cn('h-2 w-2 rounded-full', style.dotColor)} />
                      {t(`statuses.${status}`)}
                    </span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>}
        </div>
      </CardHeader>
      <CardContent ref={containerRef}>
        {isReady && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.guestName')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.sent')}</TableHead>
                <TableHead>{t('table.read')}</TableHead>
                <TableHead>{t('table.error')}</TableHead>
                {showRsvpDetails && <TableHead>{t('table.responded')}</TableHead>}
                {showRsvpDetails && <TableHead>{t('table.rsvpDetails')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const status = STATUS_STYLE[row.activityStatus];
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
                        {t(`statuses.${row.activityStatus}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <TimeStamp ts={row.sentAt} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <TimeStamp ts={row.readAt} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.activityStatus === 'failed' ? (
                        <FailedReason
                          errorCode={row.errorCode}
                          errorMessage={row.errorMessage}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {showRsvpDetails && (
                      <TableCell className="text-muted-foreground text-sm">
                        <TimeStamp ts={row.respondedAt} />
                      </TableCell>
                    )}
                    {showRsvpDetails && (
                      <TableCell>
                        <RsvpDetails
                          status={row.activityStatus}
                          metadata={row.interactionMetadata}
                          t={t}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter
        className={`flex items-center justify-between pt-4 ${!isReady ? 'invisible' : ''}`}
      >
        <p className="text-muted-foreground text-sm">
          {t('showing', { showing, total: data.total })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
          >
            {t('previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => goToPage(page + 1)}
          >
            {t('next')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
