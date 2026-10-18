'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, Copy, TriangleAlert } from '@/components/icons';
import { formatPhone } from '@/lib/phone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { ImpersonateOwnerButton } from './impersonate-owner-button';
import { MarkTestAccountDialog } from './mark-test-account-dialog';
import { RetryButton } from './retry-button';
import type { UserDetail } from '../types';
import { formatEventDate, formatFullDate } from '../utils/format';
import { avatarTint, initialsFor, userDisplayName } from '../utils/avatar';
import { cn } from '@/lib/utils';

const OWNS_VISIBLE_LIMIT = 6;

/**
 * The sheet's chrome, and the only part that knows how to close it. It is
 * deliberately separate from its contents: the contents are streamed in by a
 * Suspense boundary underneath (see /admin/users/page.tsx), and Radix would
 * replay the slide-in animation if the whole Sheet remounted when the fallback
 * swapped for the real thing. Keeping the shell mounted means clicking a row
 * opens the sheet immediately, and only the body waits on getUserDetail.
 */
export function UserSheetShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('user');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-[452px]">
        {children}
      </SheetContent>
    </Sheet>
  );
}

export function UserSheet({
  detail,
  testAccountsVisible,
}: {
  detail: UserDetail | 'not-found';
  /** Passed through to the footer's confirm, which changes what marking costs. */
  testAccountsVisible: boolean;
}) {
  const isNotFound = detail === 'not-found';
  const title = isNotFound ? 'המשתמש לא נמצא' : userDisplayName(detail);
  const tint = avatarTint(isNotFound ? 'not-found' : detail.id);

  return (
    <>
      <div className="flex items-start gap-3 border-b px-5 py-4 pe-12">
        <span
          className="flex size-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
          style={{ background: tint.background, color: tint.color }}
        >
          {isNotFound ? '?' : initialsFor(detail.fullName, detail.email)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <SheetTitle className="truncate text-[16px] font-semibold tracking-tight">{title}</SheetTitle>
            {!isNotFound && detail.isAdmin && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em]">
                מנהל
              </Badge>
            )}
            {!isNotFound && detail.isTestAccount && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em]">
                בדיקה
              </Badge>
            )}
          </div>
          <SheetDescription className="truncate text-[13px]">
            {isNotFound
              ? testAccountsVisible
                ? 'אין במערכת משתמש עם המזהה הזה'
                : 'ייתכן שהוא מוסתר על ידי מתג חשבונות הבדיקה'
              : detail.fullName
                ? (detail.email ?? 'לא הוזן אימייל')
                : 'לא הוזן שם'}
          </SheetDescription>
        </div>
        {!isNotFound && (
          <ImpersonateOwnerButton ownerId={detail.id} ownerName={title} label="צפייה כמשתמש" />
        )}
      </div>

      {isNotFound ? (
        <div className="text-muted-foreground flex-1 px-5 py-6 text-[13.5px]">
          {/*
           * With the toggle already on there is nothing left for it to be
           * hiding, so blaming it would send the Operator to a switch that
           * cannot help.
           */}
          {testAccountsVisible
            ? 'המשתמש הזה כבר לא קיים. חשבונות הבדיקה כבר מוצגים, כך ששום דבר לא מוסתר כאן'
            : 'המשתמש הזה כבר לא קיים, או שהוא חשבון בדיקה שמוסתר כרגע על ידי המתג בסרגל העליון'}
        </div>
      ) : (
        <UserSheetBody detail={detail} title={title} testAccountsVisible={testAccountsVisible} />
      )}
    </>
  );
}

/**
 * The sheet's third state, alongside a real user and 'not-found': the detail
 * query itself failed. It stays inside the open sheet rather than taking over
 * the page, because the directory behind it is still perfectly usable.
 */
export function UserSheetError() {
  return (
    <>
      <div className="flex items-start gap-3 border-b px-5 py-4 pe-12">
        <span className="bg-destructive/10 text-destructive flex size-[38px] shrink-0 items-center justify-center rounded-full">
          <TriangleAlert className="size-[18px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <SheetTitle className="truncate text-[16px] font-semibold tracking-tight">
            המשתמש לא נטען
          </SheetTitle>
          <SheetDescription className="text-[13px]">
            שום דבר לא נקרא, כך ששום דבר לא חסר - החיפוש נכשל
          </SheetDescription>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 px-5 py-6">
        <RetryButton />
      </div>
    </>
  );
}

function UserSheetBody({
  detail,
  title,
  testAccountsVisible,
}: {
  detail: UserDetail;
  title: string;
  testAccountsVisible: boolean;
}) {
  const hasOwns = detail.ownedEvents.length > 0;
  const hasShared = detail.sharedEvents.length > 0;
  const ownsVisible = detail.ownedEvents.slice(0, OWNS_VISIBLE_LIMIT);
  const ownsHiddenCount = detail.ownedEvents.length - ownsVisible.length;

  async function copyUserId() {
    // The clipboard API is unavailable outside a secure context and can be
    // refused by permissions, and a rejected promise here would otherwise
    // surface as an unhandled rejection with the Operator still believing the
    // id is on their clipboard.
    try {
      await navigator.clipboard.writeText(detail.id);
      toast.success('מזהה המשתמש הועתק');
    } catch {
      toast.error('לא הצלחנו להעתיק את מזהה המשתמש - אפשר לסמן ולהעתיק ידנית');
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        <SheetSection label="פרטי קשר">
          <SheetField label="אימייל" value={detail.email ?? 'לא הוזן'} muted={!detail.email} />
          <SheetField
            label="טלפון"
            value={detail.phone ? formatPhone(detail.phone) : 'לא הוזן'}
            muted={!detail.phone}
          />
        </SheetSection>

        <SheetSection label="חשבון">
          <SheetField label="הצטרפות" value={formatFullDate(detail.createdAt)} />
          <SheetField
            label="הרשמה"
            value={detail.onboardingFinished ? 'הושלמה' : 'לא הושלמה'}
            muted={!detail.onboardingFinished}
          />
          <div className="grid grid-cols-[96px_1fr] items-baseline gap-3">
            <span className="text-muted-foreground text-[12.5px]">מזהה משתמש</span>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-muted-foreground truncate font-mono text-[12.5px]">{detail.id}</span>
              <Button type="button" variant="link" size="xs" className="text-muted-foreground h-auto shrink-0 p-0" onClick={copyUserId}>
                <Copy className="size-3" />
                העתקה
              </Button>
            </div>
          </div>
        </SheetSection>

        {hasOwns && (
          <SheetSection label={`בבעלות (${detail.ownedEvents.length})`}>
            <div className="overflow-hidden rounded-lg border">
              {ownsVisible.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className={cn(
                    'hover:bg-accent flex items-center gap-2.5 px-3 py-2.5',
                    index > 0 && 'border-t',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{event.title}</span>
                  <span className="text-muted-foreground shrink-0 text-[12.5px] tabular-nums">
                    {formatEventDate(event.eventDate)}
                  </span>
                  <span
                    className={cn(
                      'w-[62px] shrink-0 text-end text-[12.5px]',
                      event.status === 'draft' ? 'text-muted-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {event.status === 'draft' ? 'טיוטה' : 'פורסם'}
                  </span>
                  <ChevronLeft className="text-muted-foreground/70 size-4 shrink-0" />
                </Link>
              ))}
            </div>
            {ownsHiddenCount > 0 && (
              <span className="text-muted-foreground/70 text-[12px]">
                ועוד {ownsHiddenCount}, אפשר לגלול לשאר
              </span>
            )}
          </SheetSection>
        )}

        {hasShared && (
          <SheetSection label={`משותפים איתו (${detail.sharedEvents.length})`}>
            <div className="overflow-hidden rounded-lg border">
              {detail.sharedEvents.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className={cn(
                    'hover:bg-accent flex items-center gap-2.5 px-3 py-2.5',
                    index > 0 && 'border-t',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{event.title}</span>
                  <ChevronLeft className="text-muted-foreground/70 size-4 shrink-0" />
                </Link>
              ))}
            </div>
          </SheetSection>
        )}

        {!hasOwns && !hasShared && (
          <SheetSection label="אירועים">
            <span className="text-muted-foreground text-[13.5px]">עדיין אין אירועים</span>
          </SheetSection>
        )}
      </div>

      <div className="bg-muted flex items-center gap-2.5 border-t px-5 py-3">
        <span className="text-muted-foreground/70 text-[12px]">
          {detail.isTestAccount ? 'לא נספר באף מספר במערכת הניהול' : 'נספר בכל מקום במערכת הניהול'}
        </span>
        <MarkTestAccountDialog
          userId={detail.id}
          userName={title}
          isTestAccount={detail.isTestAccount}
          testAccountsVisible={testAccountsVisible}
        >
          {(open) => (
            <Button type="button" variant="outline" size="sm" className="text-muted-foreground ms-auto shrink-0" onClick={open}>
              {detail.isTestAccount ? 'הסרת סימון חשבון בדיקה' : 'סימון כחשבון בדיקה'}
            </Button>
          )}
        </MarkTestAccountDialog>
      </div>
    </>
  );
}

function SheetSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">{label}</span>
      {children}
    </div>
  );
}

function SheetField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-baseline gap-3">
      <span className="text-muted-foreground text-[12.5px]">{label}</span>
      <span className={cn('text-[13.5px] break-words', muted ? 'text-muted-foreground' : 'text-foreground')}>{value}</span>
    </div>
  );
}
