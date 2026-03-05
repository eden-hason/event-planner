import { getEventById } from '@/features/events/queries';
import { getEventGuests, getEventGroupsWithGuests } from '@/features/guests/queries';
import { getSchedulesByEventId } from '@/features/schedules/queries';
import { getRecentRsvpActivity } from '@/features/dashboard/queries';
import {
  DashboardHeader,
  EventCountdownCard,
  GuestStatCards,
  RsvpBreakdownCard,
  UpcomingSchedulesCard,
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

  const [event, guests, schedules, groups, recentActivity] = await Promise.all([
    getEventById(eventId),
    getEventGuests(eventId),
    getSchedulesByEventId(eventId),
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

      {/* Row 1: Countdown + Guest Stats */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          {event ? (
            <EventCountdownCard event={event} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border bg-card p-6 text-muted-foreground">
              Event not found
            </div>
          )}
        </div>
        <div className="col-span-6">
          <GuestStatCards stats={stats} />
        </div>
      </div>

      {/* Row 2: RSVP Breakdown + Upcoming Schedules + Groups */}
      <div className="grid grid-cols-3 gap-4">
        <RsvpBreakdownCard stats={stats} />
        <UpcomingSchedulesCard schedules={schedules} eventId={eventId} />
        <GroupsCard groups={groups} />
      </div>

      {/* Row 3: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <RecentRsvpActivityCard activity={recentActivity} eventId={eventId} />
        </div>
        <div className="col-span-4">
          <QuickActionsCard eventId={eventId} />
        </div>
      </div>
    </>
  );
}
