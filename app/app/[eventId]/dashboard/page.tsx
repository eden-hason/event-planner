import { getEventById } from '@/features/events/queries';
import { getEventGuests, getEventGroupsWithGuests } from '@/features/guests/queries';
import { getRecentRsvpActivity, getCollaboratorCount } from '@/features/dashboard/queries';
import {
  DashboardHeader,
  EventHeroBanner,
  GuestStatCards,
  RsvpBreakdownCard,
  RecentRsvpActivityCard,
  QuickActionsCard,
  OnboardingChecklistCard,
} from '@/features/dashboard/components';
import type { GuestStats, OnboardingStatus } from '@/features/dashboard/types';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event, guests, groups, recentActivity, collaboratorCount] = await Promise.all([
    getEventById(eventId),
    getEventGuests(eventId),
    getEventGroupsWithGuests(eventId),
    getRecentRsvpActivity(eventId, 5),
    getCollaboratorCount(eventId),
  ]);

  const stats: GuestStats = {
    total: guests.reduce((sum, g) => sum + g.amount, 0),
    confirmed: guests.filter((g) => g.rsvpStatus === 'confirmed').reduce((sum, g) => sum + g.amount, 0),
    pending: guests.filter((g) => g.rsvpStatus === 'pending').reduce((sum, g) => sum + g.amount, 0),
    declined: guests.filter((g) => g.rsvpStatus === 'declined').reduce((sum, g) => sum + g.amount, 0),
  };

  const onboardingStatus: OnboardingStatus = {
    detailsComplete: !!event?.ceremonyTime,
    hasGuests: guests.length > 0,
    hasGroups: groups.length > 0,
    hasInvitationImage: !!event?.invitations?.imageUrl,
    hasCollaborator: collaboratorCount > 1,
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

      {/* Row 4: Onboarding Checklist + Recent Activity */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <OnboardingChecklistCard eventId={eventId} status={onboardingStatus} />
        </div>
        <div className="col-span-5">
          <RecentRsvpActivityCard activity={recentActivity} eventId={eventId} />
        </div>
      </div>
    </>
  );
}
