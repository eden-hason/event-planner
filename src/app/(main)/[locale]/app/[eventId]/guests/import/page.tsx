import { getEventGuestPhones, getEventGroups } from '@/features/guests/queries';
import { GuestImportFlow } from '@/features/guests';

/**
 * The mobile guest-import wizard - a full-screen takeover, not a page inside
 * the app shell (see `isGuestImportRoute` and `ImportWizardShell`). Reachable
 * only from mobile entry points; nothing here excludes a desktop visitor, but
 * none of the app's own navigation offers this URL below `md`'s hidden
 * source-sheet trigger.
 */
export default async function GuestImportPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [existingPhones, groups] = await Promise.all([
    getEventGuestPhones(eventId),
    getEventGroups(eventId),
  ]);

  return (
    <GuestImportFlow
      eventId={eventId}
      existingPhones={existingPhones}
      groups={groups}
    />
  );
}
