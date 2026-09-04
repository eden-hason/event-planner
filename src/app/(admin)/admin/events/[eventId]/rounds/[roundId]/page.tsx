import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getRoundDetail } from '@/features/admin/queries/call-round';
import { CallingSurface } from '@/features/admin/components/calling-surface';
import { EventBandSkeleton, EventIdentityQueryBand } from '@/features/admin';

// Somebody is on the phone looking at this. Never cached.
export const dynamic = 'force-dynamic';

export default async function CallRoundPage({
  params,
}: {
  params: Promise<{ eventId: string; roundId: string }>;
}) {
  const { eventId, roundId } = await params;
  const round = await getRoundDetail(roundId);

  if (!round || round.eventId !== eventId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<EventBandSkeleton />}>
        <EventIdentityQueryBand eventId={eventId} />
      </Suspense>
      <CallingSurface round={round} />
    </div>
  );
}
