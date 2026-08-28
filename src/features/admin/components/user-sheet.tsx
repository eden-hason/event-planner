'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, Copy, TriangleAlert } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { AdminSheetContent } from './admin-sheet';
import { ImpersonateOwnerButton } from './impersonate-owner-button';
import { MarkTestAccountDialog } from './mark-test-account-dialog';
import { RetryButton } from './retry-button';
import type { UserDetail } from '../types';
import { formatEventDate, formatFullDate } from '@/lib/date-time';
import { ROLE_LABELS } from '@/features/collaborate/schemas';
import { avatarTint, initialsFor } from '../utils/avatar';
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
      <AdminSheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[452px]">
        {children}
      </AdminSheetContent>
    </Sheet>
  );
}

export function UserSheet({ detail }: { detail: UserDetail | 'not-found' }) {
  const isNotFound = detail === 'not-found';
  const title = isNotFound ? 'User not found' : detail.fullName || detail.email;
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
                ADMIN
              </Badge>
            )}
            {!isNotFound && detail.isTestAccount && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 px-1.5 py-0 text-[10px] tracking-[0.05em]">
                TEST
              </Badge>
            )}
          </div>
          <SheetDescription className="truncate text-[13px]">
            {isNotFound
              ? 'It may have been hidden by the test accounts toggle'
              : detail.fullName
                ? detail.email
                : 'No name provided'}
          </SheetDescription>
        </div>
        {!isNotFound && (
          <ImpersonateOwnerButton ownerId={detail.id} ownerName={title} label="View as user" />
        )}
      </div>

      {isNotFound ? (
        <div className="flex-1 px-5 py-6 text-[13.5px] text-muted-foreground">
          This user no longer exists, or is a test account currently hidden by the top bar toggle
        </div>
      ) : (
        <UserSheetBody detail={detail} title={title} />
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
            This user didn&apos;t load
          </SheetTitle>
          <SheetDescription className="text-[13px]">
            Nothing was read, so nothing here is missing - the lookup failed
          </SheetDescription>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 px-5 py-6">
        <RetryButton />
      </div>
    </>
  );
}

function UserSheetBody({ detail, title }: { detail: UserDetail; title: string }) {
  const hasOwns = detail.ownedEvents.length > 0;
  const hasShared = detail.sharedEvents.length > 0;
  const ownsVisible = detail.ownedEvents.slice(0, OWNS_VISIBLE_LIMIT);
  const ownsHiddenCount = detail.ownedEvents.length - ownsVisible.length;

  async function copyUserId() {
    await navigator.clipboard.writeText(detail.id);
    toast.success('User ID copied');
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        <SheetSection label="Contact">
          <SheetField label="Email" value={detail.email} />
          <SheetField
            label="Phone"
            value={detail.phone || 'Not provided'}
            muted={!detail.phone}
          />
        </SheetSection>

        <SheetSection label="Account">
          <SheetField label="Joined" value={formatFullDate(detail.createdAt)} />
          <SheetField
            label="Onboarding"
            value={detail.onboardingFinished ? 'Finished' : 'Not finished'}
            muted={!detail.onboardingFinished}
          />
          <div className="grid grid-cols-[96px_1fr] items-baseline gap-3">
            <span className="text-muted-foreground text-[12.5px]">User ID</span>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-muted-foreground truncate font-mono text-[12.5px]">{detail.id}</span>
              <Button type="button" variant="link" size="xs" className="text-muted-foreground h-auto shrink-0 p-0" onClick={copyUserId}>
                <Copy className="size-3" />
                Copy
              </Button>
            </div>
          </div>
        </SheetSection>

        {hasOwns && (
          <SheetSection label={`Owns (${detail.ownedEvents.length})`}>
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
                    {event.eventDate ? formatEventDate(event.eventDate) : 'no date'}
                  </span>
                  <span
                    className={cn(
                      'w-[62px] shrink-0 text-right text-[12.5px]',
                      event.status === 'draft' ? 'text-muted-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {event.status === 'draft' ? 'Draft' : 'Published'}
                  </span>
                  <ChevronRight className="text-muted-foreground/70 size-4 shrink-0" />
                </Link>
              ))}
            </div>
            {ownsHiddenCount > 0 && (
              <span className="text-muted-foreground/70 text-[12px]">
                {ownsHiddenCount} more, scroll for the rest
              </span>
            )}
          </SheetSection>
        )}

        {hasShared && (
          <SheetSection label={`Shared with them (${detail.sharedEvents.length})`}>
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
                  <span className="text-muted-foreground shrink-0 text-[12.5px]">{ROLE_LABELS[event.role]}</span>
                  <ChevronRight className="text-muted-foreground/70 size-4 shrink-0" />
                </Link>
              ))}
            </div>
          </SheetSection>
        )}

        {!hasOwns && !hasShared && (
          <SheetSection label="Events">
            <span className="text-muted-foreground text-[13.5px]">No events yet</span>
          </SheetSection>
        )}
      </div>

      <div className="bg-muted flex items-center gap-2.5 border-t px-5 py-3">
        <span className="text-muted-foreground/70 text-[12px]">
          {detail.isTestAccount ? 'Excluded from every Back Office count' : 'Counted everywhere in the Back Office'}
        </span>
        <MarkTestAccountDialog userId={detail.id} userName={title} isTestAccount={detail.isTestAccount}>
          {(open) => (
            <Button type="button" variant="outline" size="sm" className="text-muted-foreground ms-auto shrink-0" onClick={open}>
              {detail.isTestAccount ? 'Remove test account mark' : 'Mark as test account'}
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
