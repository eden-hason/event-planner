// TypeScript-only view models for the schedules feature.
// Zod-backed DB<->app transforms live in schemas/.

import type { ReactNode } from 'react';

/**
 * The nav key under which call rounds are grouped on the schedules page.
 * Not a schedule_types row - call rounds are not schedules - but it slots
 * into the same type-keyed nav so the two kinds render identically.
 */
export const CALL_ROUNDS_NAV_KEY = 'phone_calls';

export type OutreachItemStatus =
  // Message schedules
  | 'pending'
  | 'sent'
  | 'cancelled'
  // Call rounds
  | 'in_progress'
  | 'completed';

/**
 * One entry in the schedules page nav: either a Message Schedule or a Call
 * Round. The two are unified here, in the read model, rather than in the
 * database - see docs/adr/0001-call-rounds-are-not-schedules.md.
 */
export type OutreachItem = {
  kind: 'message' | 'call_round';
  /** Nav label, already localized and disambiguated server-side */
  label: string;
  status: OutreachItemStatus;
  /** Anchors the relative-time text beside the status dot; omitted when there is nothing meaningful to date */
  timestamp?: string;
  details: ReactNode;
};

/**
 * One labelled section of the schedules nav. Message schedules and call rounds
 * are two different kinds of outreach, so they get their own lists rather than
 * sharing one flat menu - the grouping is explicit in the read model instead of
 * being inferred from the position of {@link CALL_ROUNDS_NAV_KEY}.
 */
export type OutreachNavGroup = {
  key: 'messages' | 'calls';
  /** Section heading, already localized server-side */
  label: string;
  /** Type keys into `contentByType`, in display order */
  types: string[];
};
