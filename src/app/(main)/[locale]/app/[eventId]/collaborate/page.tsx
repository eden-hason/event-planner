import { CollaboratePage } from '@/features/collaborate';
import { getCoPlannerLink, getEventCollaborators } from '@/features/collaborate/queries';
import { createClient } from '@/lib/supabase/server';

export default async function CollaboratePageRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [collaborators, coPlannerLink] = await Promise.all([
    getEventCollaborators(eventId),
    getCoPlannerLink(eventId),
  ]);

  return (
    <CollaboratePage
      eventId={eventId}
      currentUserId={user?.id}
      collaborators={collaborators}
      coPlannerLink={coPlannerLink}
    />
  );
}
