import { SettingsPage } from '@/features/settings/components';
import { getEventCollaborators } from '@/features/collaborate/queries';
import { getEventInvitations } from '@/features/collaborate/queries';
import { getEventGroups, getEventGuests } from '@/features/guests/queries';

export default async function SettingsPageRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [collaborators, invitations, groups, guests] = await Promise.all([
    getEventCollaborators(eventId),
    getEventInvitations(eventId),
    getEventGroups(eventId),
    getEventGuests(eventId),
  ]);

  return (
    <SettingsPage
      eventId={eventId}
      collaborators={collaborators}
      invitations={invitations}
      groups={groups}
      guests={guests}
    />
  );
}
