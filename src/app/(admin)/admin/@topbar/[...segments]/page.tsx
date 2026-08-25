import Link from 'next/link';
import { ImpersonateOwnerButton, OperatorSearch, resolveAdminTopBar } from '@/features/admin';
import { getEventIdentity } from '@/features/admin/queries/events';
import { getRoundDetail } from '@/features/admin/queries/call-round';

export default async function AdminTopBarRoute({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  const mode = resolveAdminTopBar(segments);

  if (mode.kind === 'search') return <OperatorSearch />;

  if (mode.kind === 'event') {
    const event = await getEventIdentity(mode.eventId);
    return (
      <>
        <TopBarBreadcrumb>
          <Link href="/admin/events" className="hover:text-foreground">Events</Link>
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

  const round = await getRoundDetail(mode.roundId);
  return (
    <TopBarBreadcrumb>
      <Link href="/admin/events" className="hover:text-foreground">Events</Link>
      <BreadcrumbSeparator />
      <Link
        href={`/admin/events/${round?.eventId ?? mode.eventId}`}
        className="hover:text-foreground truncate"
      >
        {round?.eventTitle ?? 'Event'}
      </Link>
      <BreadcrumbSeparator />
      <span className="text-foreground truncate font-medium">
        {round?.title ?? 'Call round'}
      </span>
    </TopBarBreadcrumb>
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
