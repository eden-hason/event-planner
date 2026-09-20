// Public API for the billing feature - the per-event "Free to Plan, Pay to Send"
// boundary. Schemas and services are consumed from './schemas' / './services'
// directly (the events feature's schema reuses EVENT_BILLING_STATUSES from
// there); the payment webhook write path lives in './services'.

// Types
export type { EventBillingStatus } from './types';

// Pure utils
export { deriveHeaderStatus, BILLING_STATUS_LABELS } from './utils';

// Server Actions
export { setEventBillingStatus } from './actions';

// Components
export {
  EventBillingStatusProvider,
  useEventBillingStatus,
} from './components/event-billing-status-provider';
export { EventBillingStatusPill } from './components/event-billing-status-pill';
export { EventPlanCard } from './components/event-plan-card';
export { EventBillingStatusControl } from './components/event-billing-status-control';
// The one place the plan is explained. Exported so surfaces outside this
// feature (the schedules timeline's upsell) open the same sheet the header
// pill does, rather than inventing a second billing story.
export { EventBillingStatusSheet } from './components/event-billing-status-sheet';
