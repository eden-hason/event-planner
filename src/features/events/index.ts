// Feature exports for events
// This file provides a clean API for importing event-related code

export * from './schemas';
export * from './actions';
export * from './types';

// Pure helpers, safe for client bundles. Queries stay out of this barrel and
// are imported from '@/features/events/queries' directly.
export {
  buildEventTitle,
  buildHostDetails,
  readEventTypeKey,
  readHostNames,
  type EventHostNames,
} from './utils/event-title';
export {
  ONBOARDING_STEPS,
  resolveResumeStep,
  hasAnswered,
} from './utils/onboarding-progress';
