// TypeScript-only view models for the schedules feature.
// Zod-backed DB<->app transforms live in schemas/.

import type { ReactNode } from 'react';

export type OutreachItemStatus =
  // Message schedules
  | 'pending'
  | 'sent'
  | 'cancelled'
  // The Dispatcher decided this one's moment had passed (ADR 0015)
  | 'expired'
  // Seeded but never enabled, because the Event cannot send yet. Rendered as
  // "locked" rather than "off": the organiser has not declined this schedule,
  // they have not been offered it.
  | 'locked'
  // Outstanding, but the Owner has not picked a Due Time yet, so nothing will
  // go out (ADR 0029). A locked Schedule reads as locked whether dated or not.
  | 'undated'
  // Call rounds: a plan that has been started, and one that is finished
  | 'in_progress'
  | 'completed';

/**
 * One card on the schedules timeline.
 *
 * Every entry is a `schedules` row - both message sends and planned call rounds
 * (docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md) - and
 * everything here is resolved on the server, including the details pane. The
 * client component that renders the timeline does no data work at all; it
 * chooses which pane to show.
 */
export type OutreachItem = {
  /** The Schedule's own id. Addresses the open pane as `?schedule=<id>`. */
  id: string;
  /** Card label, already localized and disambiguated server-side */
  label: string;
  status: OutreachItemStatus;
  /** Which kind of outreach this is - it picks the icon and the channel line */
  kind: 'message' | 'call';
  /** The Schedule type key, for the icon lookup */
  typeKey: string;
  /**
   * Whole days from the Event, negative before it. Null without an Event date,
   * and for an Undated Schedule.
   */
  offset: number | null;
  /**
   * Whether the Schedule has no Due Time yet (ADR 0029). An undated card sits
   * in its own group above the dated timeline - it has no place on it - and
   * keeps this flag while locked, when its status reads 'locked' instead.
   */
  undated: boolean;
  /**
   * The Due Time's date, formatted server-side in the viewer's locale. Date
   * only: the card's meta line already carries the channel and the offset, and
   * a clock face as well pushed it into an ellipsis on a 375px screen. Says
   * that there is no date yet for an Undated Schedule.
   */
  when: string;
  /** The same instant with its clock face, for the detail header's one line. */
  whenDetailed: string;
  /** Who this goes to, e.g. "Guests who have not answered" */
  audience: string;
  /** How many records that audience currently holds, or null for a call plan the viewer cannot count */
  audienceCount: number | null;
  /**
   * How a started call round is going, in records. Null for a message and for
   * a call plan that has not started - the card has nothing to report until
   * the Operator presses Start.
   */
  callProgress: {
    total: number;
    awaiting: number;
    confirmed: number;
    declined: number;
    noAnswer: number;
    willUpdate: number;
  } | null;
  details: ReactNode;
};
