import { getEventGuestPhones, getEventGroups } from '@/features/guests/queries';
import { getUserProfile } from '@/features/auth/queries';
import { GuestImportFlow } from '@/features/guests';
import { formatPhone } from '@/lib/phone';

/**
 * The mobile guest-import wizard - a full-screen takeover, not a page inside
 * the app shell (see `isGuestImportRoute` and `ImportWizardShell`). Reachable
 * only from mobile entry points; nothing here excludes a desktop visitor, but
 * none of the app's own navigation offers this URL below `md`'s hidden
 * source-sheet trigger.
 */
export default async function GuestImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const [{ eventId }, { source }] = await Promise.all([params, searchParams]);
  const [existingPhones, groups, profile] = await Promise.all([
    getEventGuestPhones(eventId),
    getEventGroups(eventId),
    // Only the WhatsApp step uses it, to pre-fill the number to link.
    source === 'whatsapp' ? getUserProfile() : null,
  ]);

  return (
    <GuestImportFlow
      eventId={eventId}
      existingPhones={existingPhones}
      groups={groups}
      ownerPhone={formatPhone(profile?.phoneNumber)}
    />
  );
}
