// Components
export {
  DashboardHeader,
  EventHeroBanner,
  GuestStatCards,
  RsvpBreakdownCard,
  RecentRsvpActivityCard,
  OnboardingChecklistCard,
  RsvpEngagementCard,
  DaysToEventCard,
  GuestsInvitedCard,
  ScheduledMessagesCard,
  GroupBreakdownCard,
} from './components';

// Types
export type { RecentRsvpRow, GuestStats, OnboardingStatus } from './types';

// Utils (pure)
export {
  computeGroupRsvpData,
  type GroupRsvpEntry,
} from './utils/rsvp-engagement';

// Note: getRecentRsvpActivity, getCollaboratorCount, and getPendingSchedulesCount
// are exported from '@/features/dashboard/queries' to avoid importing server-only
// code into client components
