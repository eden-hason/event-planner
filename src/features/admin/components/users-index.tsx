import Link from 'next/link';
import { Search, Users as UsersIcon, X } from '@/components/icons';
import { EyeOff } from 'lucide-react';
import { formatPhone } from '@/lib/phone';
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserRow, UsersIndexFilters, UsersIndexPage } from '../types';
import { formatEventDate } from '@/lib/date-time';
import { avatarTint, initialsFor } from '../utils/avatar';
import { cn } from '@/lib/utils';
import { ToggleTestAccountsLink } from './toggle-test-accounts-link';

function hrefFor(filters: UsersIndexFilters, patch: Partial<UsersIndexFilters & { user: string | null }>) {
  const next = { ...filters, user: null as string | null, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.page > 1) params.set('page', String(next.page));
  if (next.user) params.set('user', next.user);
  const query = params.toString();
  return query ? `/admin/users?${query}` : '/admin/users';
}

function countLabel(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString('en-GB')} ${value === 1 ? singular : plural}`;
}

export function UsersIndex({
  data,
  filters,
  openUserId,
  testAccountsVisible,
}: {
  data: UsersIndexPage;
  filters: UsersIndexFilters;
  openUserId: string | null;
  testAccountsVisible: boolean;
}) {
  const hasAnyUsers = data.totalUsers > 0;
  const hasQuery = !!filters.q;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-lg font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-[13px]">Everyone with an account, newest first</p>
        {hasAnyUsers && (
          <span className="text-muted-foreground ms-auto shrink-0 text-[13px] tabular-nums">
            {countLabel(data.totalUsers, 'user')}
          </span>
        )}
      </div>

      {hasAnyUsers && (
        <div className="flex items-center gap-2.5">
          <form action="/admin/users" className="w-full max-w-[320px]">
            {openUserId && <input type="hidden" name="user" value={openUserId} />}
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput name="q" defaultValue={filters.q} placeholder="Search name, email or phone" />
            </InputGroup>
          </form>
          {hasQuery && (
            <Button asChild variant="link" size="sm" className="text-muted-foreground h-auto p-1">
              <Link href={hrefFor(filters, { q: '', page: 1, user: openUserId })}>Clear search</Link>
            </Button>
          )}
        </div>
      )}

      {!hasAnyUsers ? (
        <Empty className="bg-card min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
            <EmptyTitle>No users yet</EmptyTitle>
            <EmptyDescription>
              Accounts appear here the moment someone signs in for the first time
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.rows.length === 0 ? (
        <Empty className="bg-card min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Search /></EmptyMedia>
            <EmptyTitle>No users match &quot;{filters.q.trim()}&quot;</EmptyTitle>
            <EmptyDescription>
              Search covers name, email and phone. {countLabel(data.totalUsers, 'user')} exist
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(filters, { q: '', page: 1, user: openUserId })}>
              <X data-icon="inline-start" />Clear search
            </Link>
          </Button>
        </Empty>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35">
                <TableHead className="px-4 text-[11px] tracking-[0.06em] uppercase">User</TableHead>
                <TableHead className="w-[168px] text-[11px] tracking-[0.06em] uppercase">Phone</TableHead>
                <TableHead className="w-[128px] text-[11px] tracking-[0.06em] uppercase">Events</TableHead>
                <TableHead className="w-[84px] px-4 text-right text-[11px] tracking-[0.06em] uppercase">
                  Joined
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <UserTableRow key={row.id} row={row} filters={filters} isOpen={row.id === openUserId} />
              ))}
            </TableBody>
          </Table>
          <div className="text-muted-foreground flex items-center gap-2.5 border-t px-4 py-2.5 text-[12px] tabular-nums">
            <span>
              {data.totalRows === 0
                ? 'No rows on this page'
                : `Showing ${(data.page - 1) * data.pageSize + 1}-${Math.min(data.page * data.pageSize, data.totalRows)} of ${data.totalRows}, 50 per page`}
            </span>
            <span className="text-muted-foreground/70 ms-auto">Rows open the user sheet</span>
            {data.pageCount > 1 && (
              <div className="flex gap-2">
                <Button asChild={data.page > 1} variant="outline" size="sm" disabled={data.page <= 1}>
                  {data.page > 1 ? (
                    <Link href={hrefFor(filters, { page: data.page - 1, user: openUserId })}>Previous</Link>
                  ) : (
                    <span>Previous</span>
                  )}
                </Button>
                <Button asChild={data.page < data.pageCount} variant="outline" size="sm" disabled={data.page >= data.pageCount}>
                  {data.page < data.pageCount ? (
                    <Link href={hrefFor(filters, { page: data.page + 1, user: openUserId })}>Next</Link>
                  ) : (
                    <span>Next</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {data.testAccountsTotal > 0 && (
        <div className="flex items-center gap-1.5 px-0.5 text-[12.5px]">
          <EyeOff className="text-muted-foreground size-3.5" />
          <span className="text-muted-foreground tabular-nums">
            {testAccountsVisible
              ? `${countLabel(data.testAccountsTotal, 'test account')} shown, counted nowhere else`
              : `${countLabel(data.testAccountsTotal, 'test account')} hidden`}
          </span>
          <ToggleTestAccountsLink visible={testAccountsVisible} />
        </div>
      )}
    </div>
  );
}

function UserTableRow({
  row,
  filters,
  isOpen,
}: {
  row: UserRow;
  filters: UsersIndexFilters;
  isOpen: boolean;
}) {
  const tint = avatarTint(row.id);
  const hasName = !!row.fullName;

  return (
    <TableRow className={cn('group relative', isOpen && 'bg-accent hover:bg-accent')}>
      <TableCell className="relative px-4 py-2.5">
        <Link href={hrefFor(filters, { user: row.id })} className="flex min-w-0 items-center gap-2.5 after:absolute after:inset-0">
          <span
            className="flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold"
            style={{ background: tint.background, color: tint.color }}
          >
            {initialsFor(row.fullName, row.email)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[14px] font-medium group-hover:underline">
                {row.fullName || row.email}
              </span>
              {row.isAdmin && (
                <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em]">
                  ADMIN
                </Badge>
              )}
              {row.isTestAccount && (
                <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em]">
                  TEST
                </Badge>
              )}
            </span>
            <span className={cn('truncate text-[12.5px]', hasName ? 'text-muted-foreground' : 'text-muted-foreground/70')}>
              {hasName ? row.email : 'No name provided'}
            </span>
          </span>
        </Link>
      </TableCell>
      <TableCell className={cn('text-[13px] tabular-nums', !row.phone && 'text-muted-foreground/70')}>
        {row.phone ? formatPhone(row.phone) : 'not provided'}
      </TableCell>
      <TableCell>
        <span className={cn('block text-[13px] tabular-nums', row.ownedEvents === 0 && 'text-muted-foreground')}>
          {row.ownedEvents > 0 ? countLabel(row.ownedEvents, 'owned', 'owned') : 'None'}
        </span>
        {row.sharedEvents > 0 && (
          <span className="text-muted-foreground block text-[12px] tabular-nums">
            +{row.sharedEvents} shared
          </span>
        )}
      </TableCell>
      <TableCell className="px-4 text-right text-[13px] tabular-nums">
        {formatEventDate(row.createdAt, { year: false })}
      </TableCell>
    </TableRow>
  );
}
