// Public API for the calls feature.
//
// Queries and CallRoundPane are NOT re-exported here: both pull in
// getEffectiveClient -> next/headers, which would leak server-only code into
// any client bundle importing this barrel. Import those from
// '@/features/calls/queries' and '@/features/calls/components' directly.

// Components (client-safe)
export { CallProgressBar } from './components/call-progress-bar';

// Types
export {
  CALL_OUTCOMES,
  type CallOutcome,
  type CallRoundGuestRow,
  type CallRoundPeople,
  type CallRoundResults,
  type CallRoundStatus,
  type CallRoundSummary,
} from './types';

// Presentation (pure)
export {
  callOutcomePresentation,
  callPaneState,
  type CallOutcomePresentation,
  type CallPaneState,
} from './utils';
