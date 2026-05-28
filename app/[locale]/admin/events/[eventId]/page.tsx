import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconChevronLeft } from '@tabler/icons-react';
import { getAdminEvent, getAdminEventSchedules, getGuestCountsForEvent } from '@/features/admin/queries/event-detail';
import { ManualSendCard } from '@/features/admin/components/manual-send-card';
import { TriggerScheduleCard } from '@/features/admin/components/trigger-schedule-card';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, schedules, guestCounts] = await Promise.all([
    getAdminEvent(eventId),
    getAdminEventSchedules(eventId),
    getGuestCountsForEvent(eventId),
  ]);

  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/events">
            <IconChevronLeft className="mr-1 h-4 w-4" />
            Events
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatDate(event.eventDate)}</span>
            <Badge variant={STATUS_VARIANT[event.status] ?? 'outline'}>{event.status}</Badge>
            <Link href={`/admin/users/${event.ownerId}`} className="text-blue-600 hover:underline">
              {event.ownerEmail}
            </Link>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <ManualSendCard eventId={eventId} schedules={schedules} />
          <TriggerScheduleCard schedules={schedules} guestCounts={guestCounts} />
        </div>
      </div>
    </div>
  );
}
