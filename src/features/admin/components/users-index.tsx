import Link from 'next/link';
import { Surface } from './band';
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
import { formatEventDate } from '../utils/format';
import { avatarTint, initialsFor, userDisplayName } from '../utils/avatar';
import { cn } from '@/lib/utils';
import { ToggleTestAccountsLink } from './toggle-test-accounts-link';
import { countLabel } from '../utils/labels';

function hrefFor(filters: UsersIndexFilters, patch: Partial<UsersIndexFilters & { user: string | null }>) {
  const next = { ...filters, user: null as string | null, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.page > 1) params.set('page', String(next.page));
  if (next.user) params.set('user', next.user);
  const query = params.toString();
  return query ? `/admin/users?${query}` : '/admin/users';
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
        <h1 className="text-lg font-semibold tracking-tight">משתמשים</h1>
        <p className="text-muted-foreground text-[13px]">כל מי שיש לו חשבון, מהחדש לישן</p>
        {hasAnyUsers && (
          <span className="text-muted-foreground ms-auto shrink-0 text-[13px] tabular-nums">
            {countLabel(data.totalUsers, 'משתמש אחד', 'משתמשים')}
          </span>
        )}
      </div>

      {hasAnyUsers && (
        <div className="flex items-center gap-2.5">
          <form action="/admin/users" className="w-full max-w-[320px]">
            {openUserId && <input type="hidden" name="user" value={openUserId} />}
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput name="q" defaultValue={filters.q} placeholder="חיפוש לפי שם, אימייל או טלפון" />
            </InputGroup>
          </form>
          {hasQuery && (
            <Button asChild variant="link" size="sm" className="text-muted-foreground h-auto p-1">
              <Link href={hrefFor(filters, { q: '', page: 1, user: openUserId })}>ניקוי החיפוש</Link>
            </Button>
          )}
        </div>
      )}

      {!hasAnyUsers ? (
        <Empty className="bg-card min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
            <EmptyTitle>עדיין אין משתמשים</EmptyTitle>
            <EmptyDescription>
              חשבונות מופיעים כאן ברגע שמישהו מתחבר בפעם הראשונה
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.rows.length === 0 ? (
        <Empty className="bg-card min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Search /></EmptyMedia>
            <EmptyTitle>אין משתמשים שמתאימים ל-&quot;{filters.q.trim()}&quot;</EmptyTitle>
            <EmptyDescription>
              החיפוש עובר על שם, אימייל וטלפון. יש {countLabel(data.totalUsers, 'משתמש אחד', 'משתמשים')}
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(filters, { q: '', page: 1, user: openUserId })}>
              <X data-icon="inline-start" />ניקוי החיפוש
            </Link>
          </Button>
        </Empty>
      ) : (
        <Surface>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35">
                <TableHead className="px-4 text-[11px] tracking-[0.06em] uppercase">משתמש</TableHead>
                <TableHead className="w-[168px] text-[11px] tracking-[0.06em] uppercase">טלפון</TableHead>
                <TableHead className="w-[128px] text-[11px] tracking-[0.06em] uppercase">אירועים</TableHead>
                <TableHead className="w-[96px] px-4 text-end text-[11px] tracking-[0.06em] uppercase">
                  הצטרפות
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
                ? 'אין שורות בעמוד הזה'
                : `מוצגים ${(data.page - 1) * data.pageSize + 1}-${Math.min(data.page * data.pageSize, data.totalRows)} מתוך ${data.totalRows}, 50 בעמוד`}
            </span>
            <span className="text-muted-foreground/70 ms-auto">לחיצה על שורה פותחת את כרטיס המשתמש</span>
            {data.pageCount > 1 && (
              <div className="flex gap-2">
                <Button asChild={data.page > 1} variant="outline" size="sm" disabled={data.page <= 1}>
                  {data.page > 1 ? (
                    <Link href={hrefFor(filters, { page: data.page - 1, user: openUserId })}>הקודם</Link>
                  ) : (
                    <span>הקודם</span>
                  )}
                </Button>
                <Button asChild={data.page < data.pageCount} variant="outline" size="sm" disabled={data.page >= data.pageCount}>
                  {data.page < data.pageCount ? (
                    <Link href={hrefFor(filters, { page: data.page + 1, user: openUserId })}>הבא</Link>
                  ) : (
                    <span>הבא</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Surface>
      )}

      {data.testAccountsTotal > 0 && (
        <div className="flex items-center gap-1.5 px-0.5 text-[12.5px]">
          <EyeOff className="text-muted-foreground size-3.5" />
          <span className="text-muted-foreground tabular-nums">
            {testAccountsVisible
              ? `${countLabel(data.testAccountsTotal, 'חשבון בדיקה אחד מוצג', 'חשבונות בדיקה מוצגים')}, לא נספרים בשום מקום אחר`
              : `${countLabel(data.testAccountsTotal, 'חשבון בדיקה אחד מוסתר', 'חשבונות בדיקה מוסתרים')}`}
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
                {userDisplayName(row)}
              </span>
              {row.isAdmin && (
                <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em]">
                  מנהל
                </Badge>
              )}
              {row.isTestAccount && (
                <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em]">
                  בדיקה
                </Badge>
              )}
            </span>
            <span className={cn('truncate text-[12.5px]', hasName ? 'text-muted-foreground' : 'text-muted-foreground/70')}>
              {hasName ? (row.email ?? 'לא הוזן אימייל') : 'לא הוזן שם'}
            </span>
          </span>
        </Link>
      </TableCell>
      <TableCell className={cn('text-[13px] tabular-nums', !row.phone && 'text-muted-foreground/70')}>
        {row.phone ? formatPhone(row.phone) : 'לא הוזן'}
      </TableCell>
      <TableCell>
        <span className={cn('block text-[13px] tabular-nums', row.ownedEvents === 0 && 'text-muted-foreground')}>
          {row.ownedEvents > 0 ? countLabel(row.ownedEvents, 'אירוע אחד בבעלות', 'בבעלות') : 'אין'}
        </span>
        {row.sharedEvents > 0 && (
          <span className="text-muted-foreground block text-[12px] tabular-nums">
            +{row.sharedEvents} משותפים
          </span>
        )}
      </TableCell>
      <TableCell className="px-4 text-end text-[13px] tabular-nums">
        {formatEventDate(row.createdAt, { year: false })}
      </TableCell>
    </TableRow>
  );
}
