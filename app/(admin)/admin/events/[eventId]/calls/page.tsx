import { getCallRounds } from '@/features/admin/queries/calls';
import { PhoneCallsView } from '@/features/admin/components/phone-calls-view';

export default async function AdminEventCallsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const rounds = await getCallRounds(eventId);

  return <PhoneCallsView eventId={eventId} initialRounds={rounds} />;
}
