import { SettingsPage } from '@/features/settings/components';
import { getEventCollaborators } from '@/features/collaborate/queries';
import { getEventInvitations } from '@/features/collaborate/queries';
import { getEventGroups, getEventGuests } from '@/features/guests/queries';
import { createClient } from '@/lib/supabase/server';

export default async function SettingsPageRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [collaborators, invitations, groups, guests] = await Promise.all([
    getEventCollaborators(eventId),
    getEventInvitations(eventId),
    getEventGroups(eventId),
    getEventGuests(eventId),
  ]);

  return (
    <SettingsPage
      eventId={eventId}
      currentUserId={user?.id}
      collaborators={collaborators}
      invitations={invitations}
      groups={groups}
      guests={guests}
    />
  );
}
