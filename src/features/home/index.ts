// Components
export {
  HomeHeader,
  EventHeroBanner,
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
export { countHeads } from './utils/counts';
export { isDetailsComplete } from './utils/featured-actions';

// Note: queries (getRecentRsvpActivity, getHomeViewer, getStatusStrip, ...)
// are exported from '@/features/home/queries' to avoid importing server-only
// code into client components. The mobile layout reads those queries itself,
// so it is imported from '@/features/home/components/mobile/home-mobile'.
