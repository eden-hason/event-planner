// Components
export { HomeHeader } from './components';

// Types
export type { RecentRsvpRow, GuestStats, AnswerSourceCounts } from './types';

// Utils (pure)
export { countHeads, countAnswerSources } from './utils/counts';
export { isDetailsComplete } from './utils/featured-actions';

// Note: queries (getRecentRsvpActivity, getHomeViewer, getStatusStrip, ...)
// are exported from '@/features/home/queries' to avoid importing server-only
// code into client components. The Home sections read those queries
// themselves, so they are imported from '@/features/home/components/home-sections'.
