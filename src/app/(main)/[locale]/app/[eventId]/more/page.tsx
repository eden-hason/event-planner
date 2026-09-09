import { getAllUserEvents } from '@/features/events/queries';
import { getGuestCountsByEvent } from '@/features/guests/queries';
import { getEffectiveUser } from '@/features/auth/queries';
import { MobileMorePage } from '@/components/layout/mobile-more-page';

/**
 * The destination behind the mobile tab bar's "More" tab.
 *
 * A route rather than a sheet so the back gesture leaves it, the tab can light
 * up from the URL like every other tab, and a tool the page links to can link
 * back here.
 */
export default async function MoreRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [events, effectiveUser] = await Promise.all([
    getAllUserEvents(),
    getEffectiveUser(),
  ]);

  // Every event the switcher lists shows its headcount, so they are counted
  // together rather than one request per drawer open.
  const guestCounts = await getGuestCountsByEvent(events.map((e) => e.id));

  return (
    <MobileMorePage
      eventId={eventId}
      events={events}
      guestCounts={guestCounts}
      currentUserId={effectiveUser?.id}
      appVersion={process.env.NEXT_PUBLIC_APP_VERSION}
    />
  );
}
