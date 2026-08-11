// Public API for the calls feature.
//
// Queries and CallRoundResultsCard are NOT re-exported here: both pull in
// getEffectiveClient -> next/headers, which would leak server-only code into
// any client bundle importing this barrel. Import those from
// '@/features/calls/queries' and '@/features/calls/components' directly.

// Components (client-safe)
export {
  CallRoundResultsTable,
  type CallRoundResultsLabels,
} from './components/call-round-results-table';

// Types
export {
  CALL_OUTCOMES,
  type CallOutcome,
  type CallRoundGuestRow,
  type CallRoundResults,
  type CallRoundStatus,
  type CallRoundSummary,
} from './types';
