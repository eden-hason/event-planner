import { getTranslations } from 'next-intl/server';
import { getEventById } from '@/features/events/queries';
import { getEventGuests, getEventGroupsWithGuests } from '@/features/guests/queries';
import { getRecentRsvpActivity, getCollaboratorCount, getPendingSchedulesCount } from '@/features/dashboard/queries';
import {
  DashboardHeader,
  EventHeroBanner,
  RsvpBreakdownCard,
  RecentRsvpActivityCard,
  RsvpEngagementCard,
  OnboardingChecklistCard,
  DaysToEventCard,
  GuestsInvitedCard,
  ScheduledMessagesCard,
  GroupBreakdownCard,
} from '@/features/dashboard/components';
import type { GuestStats, OnboardingStatus } from '@/features/dashboard/types';

function getDaysRemaining(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  return Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [t, event, guests, groups, recentActivity, collaboratorCount, pendingSchedulesCount] = await Promise.all([
    getTranslations('dashboard'),
    getEventById(eventId),
    getEventGuests(eventId),
    getEventGroupsWithGuests(eventId),
    getRecentRsvpActivity(eventId, 5),
    getCollaboratorCount(eventId),
    getPendingSchedulesCount(eventId),
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

      {/* Row 1: Hero banner + stat cards */}
      {event ? (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 h-full">
            <EventHeroBanner event={event} />
          </div>
          <DaysToEventCard daysRemaining={getDaysRemaining(event.eventDate)} />
          <GuestsInvitedCard total={stats.total} estimate={event.guestsEstimate} />
          <ScheduledMessagesCard count={pendingSchedulesCount} />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border bg-card text-muted-foreground">
          {t('eventNotFound')}
        </div>
      )}

      {/* Row 2: RSVP Breakdown + Quick Actions + Group Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <RsvpBreakdownCard stats={stats} />
        <RsvpEngagementCard groups={groups} />
        <GroupBreakdownCard groups={groups} />
      </div>

      {/* Row 3: Onboarding Checklist + Recent Activity */}
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
