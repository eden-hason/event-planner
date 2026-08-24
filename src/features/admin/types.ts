/**
 * Back Office view models. Vocabulary is defined in CONTEXT.md - in particular
 * Signal, Operator and the Guest Record / Guest distinction.
 */

export type OverviewCounts = {
  users: number;
  /** Published events only. Draft Events are interest, not events. */
  events: number;
  /** Guest Records: one row per guest list entry, the billable unit. */
  guestRecords: number;
};

export type SignalKind = 'overdue_schedule' | 'failed_delivery' | 'stale_call_round';

/**
 * A condition derived at read time that an Operator should look at. Never
 * stored: there is no signals table and nothing to dismiss. A Signal exists
 * exactly as long as the condition producing it is true.
 */
export type Signal = {
  /** `${kind}:${sourceRowId}`. A React key only - never persist it or route on it. */
  id: string;
  kind: SignalKind;
  eventId: string;
  eventTitle: string;
  /** What is wrong, in one line */
  headline: string;
  /** The supporting fact */
  detail: string;
  /** When the condition began. Drives sort order and the age label. */
  occurredAt: string;
  /** Where the Operator goes to act on it */
  href: string;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  eventTypeName: string;
  ownerName: string;
  guestRecords: number;
  confirmed: number;
  /** 0-1, or null when there is no guest list yet. Never render null as 0%. */
  confirmationRate: number | null;
};
