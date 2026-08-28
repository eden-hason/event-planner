import { Suspense } from 'react';
import Link from 'next/link';
import { ImpersonateOwnerButton, OperatorSearch, resolveAdminTopBar } from '@/features/admin';
import { Skeleton } from '@/components/ui/skeleton';
import { getEventIdentity } from '@/features/admin/queries/events';
import { getRoundDetail } from '@/features/admin/queries/call-round';

/**
 * This route must not await anything before it returns.
 *
 * A parallel slot only gets a Suspense boundary if its own subtree defines a
 * loading.tsx - LoadingBoundary in Next's layout-router renders a bare Fragment
 * otherwise - and this slot has none. So an await out here has no boundary
 * below the root: navigation runs in a transition, React cannot commit a
 * suspended tree with nowhere to put a fallback, and the whole route change is
 * held back. That includes events/[eventId]/loading.tsx, which is ready to
 * paint and cannot, so clicking an event sat on the events list doing nothing
 * visible until the breadcrumb's own query came back.
 *
 * Each branch therefore returns immediately and streams its title in. The
 * boundaries are keyed on the id so moving between two events resets to the
 * skeleton rather than leaving the previous event's title over the new page.
 */
export default async function AdminTopBarRoute({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  const mode = resolveAdminTopBar(segments);

  if (mode.kind === 'search') return <OperatorSearch />;

  if (mode.kind === 'event') {
    return (
      <Suspense key={mode.eventId} fallback={<EventCrumbSkeleton />}>
        <EventCrumb eventId={mode.eventId} />
      </Suspense>
    );
  }

  return (
    <Suspense key={mode.roundId} fallback={<RoundCrumbSkeleton />}>
      <RoundCrumb eventId={mode.eventId} roundId={mode.roundId} />
    </Suspense>
  );
}

async function EventCrumb({ eventId }: { eventId: string }) {
  const event = await getEventIdentity(eventId);

  return (
    <>
      <TopBarBreadcrumb>
        <EventsCrumbLink />
        <BreadcrumbSeparator />
        <span className="text-foreground truncate font-medium">{event?.title ?? 'Event'}</span>
      </TopBarBreadcrumb>
      {event && (
        <div className="ms-auto shrink-0">
          <ImpersonateOwnerButton ownerId={event.ownerId} ownerName={event.owner.name} />
        </div>
      )}
    </>
  );
}

async function RoundCrumb({ eventId, roundId }: { eventId: string; roundId: string }) {
  const round = await getRoundDetail(roundId);

  return (
    <TopBarBreadcrumb>
      <EventsCrumbLink />
      <BreadcrumbSeparator />
      <Link
        href={`/admin/events/${round?.eventId ?? eventId}`}
        className="hover:text-foreground truncate"
      >
        {round?.eventTitle ?? 'Event'}
      </Link>
      <BreadcrumbSeparator />
      <span className="text-foreground truncate font-medium">{round?.title ?? 'Call round'}</span>
    </TopBarBreadcrumb>
  );
}

/**
 * Everything that does not depend on the query stays in the fallback - the
 * crumb rail, the Events link and the space the action takes - so the bar keeps
 * its shape and only the parts that are genuinely unknown are skeletons.
 */
function EventCrumbSkeleton() {
  return (
    <>
      <TopBarBreadcrumb>
        <EventsCrumbLink />
        <BreadcrumbSeparator />
        <Skeleton className="h-3.5 w-40" />
      </TopBarBreadcrumb>
      <div className="ms-auto shrink-0">
        <Skeleton className="h-8 w-[124px] rounded-md" />
      </div>
    </>
  );
}

function RoundCrumbSkeleton() {
  return (
    <TopBarBreadcrumb>
      <EventsCrumbLink />
      <BreadcrumbSeparator />
      <Skeleton className="h-3.5 w-32" />
      <BreadcrumbSeparator />
      <Skeleton className="h-3.5 w-24" />
    </TopBarBreadcrumb>
  );
}

function EventsCrumbLink() {
  return (
    <Link href="/admin/events" className="hover:text-foreground">
      Events
    </Link>
  );
}

function TopBarBreadcrumb({ children }: { children: React.ReactNode }) {
  return (
    <nav className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[13px]">
      {children}
    </nav>
  );
}

function BreadcrumbSeparator() {
  return <span className="text-muted-foreground/50">/</span>;
}
