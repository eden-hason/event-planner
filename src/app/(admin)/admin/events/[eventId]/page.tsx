import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import {
  DraftEventQueryBand,
  EventBandSkeleton,
  EventDetailsQueryBand,
  EventGuestListBand,
  EventIdentityQueryBand,
  EventOutreachBand,
  EventSignalsBand,
} from '@/features/admin';
import { getEventRouteState } from '@/features/admin/queries/events';

export const dynamic = 'force-dynamic';

export default async function EventWorkspacePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEventRouteState(eventId);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-4">
      {event.status === 'published' && (
        <Suspense fallback={<EventBandSkeleton />}><EventSignalsBand eventId={eventId} outreachEnabled={event.canCreateSchedules} /></Suspense>
      )}
      <Suspense fallback={<EventBandSkeleton />}><EventIdentityQueryBand eventId={eventId} /></Suspense>
      {event.status === 'draft' ? (
        <Suspense fallback={<EventBandSkeleton />}><DraftEventQueryBand eventId={eventId} /></Suspense>
      ) : (
        <>
          <Suspense fallback={<EventBandSkeleton />}><EventGuestListBand eventId={eventId} /></Suspense>
          <Suspense fallback={<EventBandSkeleton />}><EventOutreachBand eventId={eventId} /></Suspense>
          <Suspense fallback={<EventBandSkeleton />}><EventDetailsQueryBand eventId={eventId} /></Suspense>
        </>
      )}
    </div>
  );
}
