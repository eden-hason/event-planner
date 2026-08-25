import { notFound } from 'next/navigation';
import { getRoundDetail } from '@/features/admin/queries/call-round';
import { CallingSurface } from '@/features/admin/components/calling-surface';

// Somebody is on the phone looking at this. Never cached.
export const dynamic = 'force-dynamic';

export default async function CallRoundPage({
  params,
}: {
  params: Promise<{ eventId: string; roundId: string }>;
}) {
  const { roundId } = await params;
  const round = await getRoundDetail(roundId);

  if (!round) notFound();

  return <CallingSurface round={round} />;
}
