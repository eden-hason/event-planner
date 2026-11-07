import Link from 'next/link';
import { Banknote } from 'lucide-react';
import { Surface } from './band';
import { LinkedTableRow } from './linked-table-row';
import { PaymentsIndexToolbar } from './payments-index-toolbar';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from '@/components/icons';
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
import { formatShekels, PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from '@/features/billing/utils';
import type { PaymentIndexRow, PaymentsIndexFilters, PaymentsIndexPage, PaymentsIndexSortKey } from '../types';
import { countLabel } from '../utils/labels';
import { formatDateTime } from '../utils/format';
import {
  amountLabel,
  DEFAULT_PAYMENTS_INDEX_FILTERS,
  DEFAULT_PAYMENTS_SORT_DIRECTION,
  hasPaymentsIndexFilters,
  paymentsIndexHref,
  periodLabel,
} from '../utils/payments-index';
import { cn } from '@/lib/utils';

const HEAD = 'h-10 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase';

function shekels(amount: number) {
  return formatShekels(amount, 'he-IL');
}

export function PaymentsIndex({ data, filters }: { data: PaymentsIndexPage; filters: PaymentsIndexFilters }) {
  const filtered = hasPaymentsIndexFilters(filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight">תשלומים</h1>
        <p className="text-muted-foreground text-[13px]">{countLabel(data.totalPayments, 'תשלום אחד', 'תשלומים')}</p>
      </div>

      {data.totalPayments === 0 ? (
        <Empty className="bg-card min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Banknote /></EmptyMedia>
            <EmptyTitle>עדיין אין תשלומים</EmptyTitle>
            <EmptyDescription>
              תשלומים מופיעים כאן ברגע שנרשם תשלום על אירוע
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <PaymentsIndexToolbar filters={filters} years={data.years} />

          {filtered && <ActiveFilters data={data} filters={filters} />}

          {data.rows.length === 0 ? (
            <Empty className="bg-card min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>לא נמצאו תשלומים</EmptyTitle>
                <EmptyDescription>{noMatchesText(filters)}</EmptyDescription>
              </EmptyHeader>
              <Button asChild variant="outline" size="sm">
                <Link href={clearAllHref(filters)}><X data-icon="inline-start" />ניקוי הכול</Link>
              </Button>
            </Empty>
          ) : (
            <Surface>
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow className="bg-muted/35 hover:bg-muted/35">
                    <TableHead className={cn(HEAD, 'w-[30%] ps-4')}>לקוח</TableHead>
                    <SortableHead label="תאריך התשלום" sortKey="date" filters={filters} />
                    <SortableHead label="סכום" sortKey="amount" filters={filters} align="end" />
                    <TableHead className={HEAD}>אמצעי תשלום</TableHead>
                    <TableHead className={HEAD}>עבור</TableHead>
                    <TableHead className={cn(HEAD, 'pe-4')}>אסמכתה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <PaymentTableRow key={row.id} row={row} />
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} filters={filters} />
            </Surface>
          )}

          <PaymentsSummary data={data} filters={filters} />
        </>
      )}
    </div>
  );
}

/** Says which period came up empty, when the date is the only thing narrowing the list. */
function noMatchesText(filters: PaymentsIndexFilters) {
  const period = periodLabel(filters);
  const onlyPeriod = !filters.q.trim() && filters.minAmount === null && filters.maxAmount === null;
  if (period && onlyPeriod) return `לא נרשמו תשלומים ב${period}. אפשר לבחור תקופה אחרת`;
  return 'אין תשלומים שמתאימים לחיפוש ולסינון. אפשר לשנות אותם או לנקות הכול';
}

/**
 * The count and the total of every payment the search and filters match, on
 * every page - not just the 50 rows above it. Zero when nothing matches.
 */
function PaymentsSummary({ data, filters }: { data: PaymentsIndexPage; filters: PaymentsIndexFilters }) {
  const narrowed = !!filters.q.trim() || filters.minAmount !== null || filters.maxAmount !== null;
  const scope = [
    periodLabel(filters) ?? 'כל התקופות',
    narrowed && 'לפי החיפוש והסינון',
    data.pageCount > 1 && 'כולל כל העמודים',
  ].filter(Boolean).join(', ');
  return (
    <Surface
      as="section"
      className="border-primary/25 bg-primary/5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4"
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[13px] font-semibold">סיכום</h2>
        <p className="text-muted-foreground text-[12.5px]">{scope}</p>
      </div>
      <dl className="flex flex-wrap items-center gap-x-10 gap-y-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground text-[12px]">סה״כ עסקאות</dt>
          <dd className="text-xl font-semibold tabular-nums">{data.totalRows.toLocaleString('he-IL')}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground text-[12px]">סה״כ לתשלום</dt>
          <dd className="text-xl font-semibold tabular-nums">{shekels(data.totalAmount)}</dd>
        </div>
      </dl>
    </Surface>
  );
}

/** "Clear all" drops search and filters but keeps the Operator's chosen sort. */
function clearAllHref(filters: PaymentsIndexFilters) {
  return paymentsIndexHref({ ...DEFAULT_PAYMENTS_INDEX_FILTERS, sort: filters.sort, dir: filters.dir });
}

/** Why these rows are showing: the count and their total, then one removable chip per criterion. */
function ActiveFilters({ data, filters }: { data: PaymentsIndexPage; filters: PaymentsIndexFilters }) {
  const chips: { key: string; label: string; href: string }[] = [];
  const chip = (key: string, label: string, patch: Partial<PaymentsIndexFilters>) =>
    chips.push({ key, label, href: paymentsIndexHref(filters, patch) });

  if (filters.q.trim()) chip('q', `"${filters.q.trim()}"`, { q: '' });
  // One chip for the period: removing "אוקטובר 2026" clears the date entirely.
  const period = periodLabel(filters);
  if (period) chip('period', period, { year: null, month: null });
  const amount = amountLabel(filters);
  if (amount) chip('amount', `סכום ${amount}`, { minAmount: null, maxAmount: null });

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px]">
      <span className="text-muted-foreground me-1">
        מוצגים <strong className="text-foreground font-semibold tabular-nums">{data.totalRows.toLocaleString('he-IL')}</strong> מתוך{' '}
        {countLabel(data.totalPayments, 'תשלום אחד', 'תשלומים')}
        {data.totalRows > 0 && (
          <>
            {', '}בסך <strong className="text-foreground font-semibold tabular-nums">{shekels(data.totalAmount)}</strong>
          </>
        )}
      </span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          aria-label={`הסרת הסינון ${chip.label}`}
          className="bg-card hover:bg-accent inline-flex h-7 items-center gap-1 rounded-full border ps-3 pe-2 text-[12.5px] font-medium transition-colors"
        >
          {chip.label}
          <X className="text-muted-foreground size-3.5" />
        </Link>
      ))}
      <Link
        href={clearAllHref(filters)}
        scroll={false}
        className="text-muted-foreground hover:text-foreground ms-1 text-[12.5px] font-medium underline-offset-4 hover:underline"
      >
        ניקוי הכול
      </Link>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  filters,
  className,
  align = 'start',
}: {
  label: string;
  sortKey: PaymentsIndexSortKey;
  filters: PaymentsIndexFilters;
  className?: string;
  align?: 'start' | 'end';
}) {
  const active = filters.sort === sortKey;
  const nextDir = active ? (filters.dir === 'asc' ? 'desc' : 'asc') : DEFAULT_PAYMENTS_SORT_DIRECTION[sortKey];
  const Icon = !active ? ArrowUpDown : filters.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(HEAD, align === 'end' && 'text-end', className)}
      aria-sort={active ? (filters.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Link
        href={paymentsIndexHref(filters, { sort: sortKey, dir: nextDir })}
        scroll={false}
        className={cn(
          'hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
          active && 'text-foreground',
          align === 'end' && 'flex-row-reverse',
        )}
      >
        {label}
        <Icon className={cn('size-3.5', !active && 'opacity-40')} aria-hidden="true" />
      </Link>
    </TableHead>
  );
}

/** The row opens the Event the payment was recorded on, where its full record lives. */
function PaymentTableRow({ row }: { row: PaymentIndexRow }) {
  const href = `/admin/events/${row.eventId}`;
  return (
    <LinkedTableRow href={href} className="group">
      <TableCell className="max-w-0 py-3 ps-4">
        <Link href={href} className="block truncate font-medium group-hover:underline">
          {row.ownerName}
        </Link>
        <div className="text-muted-foreground mt-0.5 truncate text-[12px]">{row.eventTitle}</div>
      </TableCell>
      <TableCell className="py-3 text-[13px] tabular-nums">{formatDateTime(row.occurredAt)}</TableCell>
      <TableCell className="py-3 text-end text-[13px] font-medium tabular-nums">{shekels(row.amount)}</TableCell>
      <TableCell className="py-3 text-[13px]">{PAYMENT_METHOD_LABELS[row.method]}</TableCell>
      <TableCell className="py-3 text-[13px]">{PAYMENT_KIND_LABELS[row.kind]}</TableCell>
      <TableCell className="max-w-[180px] py-3 pe-4 text-[13px] tabular-nums">
        {row.reference ? (
          <span dir="ltr" className="block truncate" title={row.reference}>{row.reference}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </LinkedTableRow>
  );
}

function Pagination({ data, filters }: { data: PaymentsIndexPage; filters: PaymentsIndexFilters }) {
  const first = (data.page - 1) * data.pageSize + 1;
  const last = Math.min(data.page * data.pageSize, data.totalRows);
  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[12.5px]">
      <span className="tabular-nums">
        {first.toLocaleString('he-IL')}-{last.toLocaleString('he-IL')} מתוך {countLabel(data.totalRows, 'תשלום אחד', 'תשלומים')}
      </span>
      <div className="flex items-center gap-3">
        {data.pageCount > 1 && (
          <span className="tabular-nums">עמוד {data.page} מתוך {data.pageCount}</span>
        )}
        <div className="flex gap-2">
          <PageLink label="הקודם" page={data.page - 1} data={data} filters={filters} />
          <PageLink label="הבא" page={data.page + 1} data={data} filters={filters} />
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
  data: PaymentsIndexPage;
  filters: PaymentsIndexFilters;
}) {
  const enabled = page >= 1 && page <= data.pageCount;
  return (
    <Button asChild={enabled} variant="outline" size="sm" disabled={!enabled}>
      {enabled ? <Link href={paymentsIndexHref(filters, { page })}>{label}</Link> : <span>{label}</span>}
    </Button>
  );
}
