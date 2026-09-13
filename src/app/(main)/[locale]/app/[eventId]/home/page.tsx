import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { daysUntil } from '@/lib/date-time';
import {
  getRecentRsvpActivity,
  getCollaboratorCount,
  getPendingSchedulesCount,
  getHomeEvent,
  getHomeGuests,
  getHomeGroups,
} from '@/features/home/queries';
import {
  HomeHeader,
  EventHeroBanner,
  RsvpBreakdownCard,
  RecentRsvpActivityCard,
  RsvpEngagementCard,
  OnboardingChecklistCard,
  DaysToEventCard,
  GuestsInvitedCard,
  ScheduledMessagesCard,
  GroupBreakdownCard,
  countHeads,
  isDetailsComplete,
  type OnboardingStatus,
} from '@/features/home';
// Server-only (reads queries directly), so imported here rather than through the barrel.
import { HomeMobile } from '@/features/home/components/mobile/home-mobile';

/**
 * The desktop layout predates Home's redesign, which so far covers mobile only.
 * It sits in its own Suspense boundary: both layouts render on the server, and
 * its all-at-once fetch must not hold back the mobile sections from streaming.
 * It reads the same cached event, guests and groups as the mobile sections, so
 * rendering both costs one query each.
 */
async function HomeDesktop({ eventId }: { eventId: string }) {
  const [t, event, guests, groups, recentActivity, collaboratorCount, pendingSchedulesCount] = await Promise.all([
    getTranslations('home'),
    getHomeEvent(eventId),
    getHomeGuests(eventId),
    getHomeGroups(eventId),
    getRecentRsvpActivity(eventId, 5),
    getCollaboratorCount(eventId),
    getPendingSchedulesCount(eventId),
  ]);

  const stats = countHeads(guests);

  const onboardingStatus: OnboardingStatus = {
    detailsComplete: event ? isDetailsComplete(event) : false,
    hasGuests: guests.length > 0,
    hasGroups: groups.length > 0,
    hasInvitationImage: !!event?.invitations?.imageUrl,
    hasCollaborator: collaboratorCount > 1,
  };

  return (
    <div className="hidden md:flex md:flex-col md:gap-6">
      {/* Row 1: Hero banner + stat cards */}
      {event ? (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 h-full">
            <EventHeroBanner event={event} />
          </div>
          <DaysToEventCard daysRemaining={event.eventDate ? daysUntil(event.eventDate) : null} />
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
    </div>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <>
      <HomeHeader />
      <div className="md:hidden">
        <HomeMobile eventId={eventId} />
      </div>
      <Suspense>
        <HomeDesktop eventId={eventId} />
      </Suspense>
    </>
  );
}
