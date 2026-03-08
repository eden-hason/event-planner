import { getEventById } from '@/features/events/queries';
import { getEventGuests, getEventGroupsWithGuests } from '@/features/guests/queries';
import { getRecentRsvpActivity } from '@/features/dashboard/queries';
import {
  DashboardHeader,
  EventHeroBanner,
  GuestStatCards,
  RsvpBreakdownCard,
  GroupsCard,
  RecentRsvpActivityCard,
  QuickActionsCard,
} from '@/features/dashboard/components';
import type { GuestStats } from '@/features/dashboard/types';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event, guests, groups, recentActivity] = await Promise.all([
    getEventById(eventId),
    getEventGuests(eventId),
    getEventGroupsWithGuests(eventId),
    getRecentRsvpActivity(eventId, 8),
  ]);

  const stats: GuestStats = {
    total: guests.reduce((sum, g) => sum + g.amount, 0),
    confirmed: guests.filter((g) => g.rsvpStatus === 'confirmed').reduce((sum, g) => sum + g.amount, 0),
    pending: guests.filter((g) => g.rsvpStatus === 'pending').reduce((sum, g) => sum + g.amount, 0),
    declined: guests.filter((g) => g.rsvpStatus === 'declined').reduce((sum, g) => sum + g.amount, 0),
  };

  return (
    <>
      <DashboardHeader />

      {/* Row 1: Hero banner */}
      {event ? (
        <EventHeroBanner event={event} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border bg-card text-muted-foreground">
          Event not found
        </div>
      )}

      {/* Row 2: Guest stat cards */}
      <GuestStatCards stats={stats} />

      {/* Row 3: RSVP Breakdown + Quick Actions */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <RsvpBreakdownCard stats={stats} />
        </div>
        <div className="col-span-5">
          <QuickActionsCard eventId={eventId} />
        </div>
      </div>

      {/* Row 4: Guest Groups + Recent Activity */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <GroupsCard groups={groups} eventId={eventId} />
        </div>
        <div className="col-span-5">
          <RecentRsvpActivityCard activity={recentActivity} eventId={eventId} />
        </div>
      </div>
    </>
  );
}
