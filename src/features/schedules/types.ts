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
  /** Whole days from the Event, negative before it. Null without an Event date. */
  offset: number | null;
  /**
   * The Due Time's date, formatted server-side in the viewer's locale. Date
   * only: the card's meta line already carries the channel and the offset, and
   * a clock face as well pushed it into an ellipsis on a 375px screen.
   */
  when: string;
  /** The same instant with its clock face, for the detail header's one line. */
  whenDetailed: string;
  /** Who this goes to, e.g. "Guests who have not answered" */
  audience: string;
  /** How many records that audience currently holds, or null for a call plan the viewer cannot count */
  audienceCount: number | null;
  /**
   * The one result number a sent card shows: a percentage and the label it is
   * of. Null on anything not yet sent, and on a send that produced no
   * deliveries to score.
   */
  miniStat: { percent: number; kind: 'read' | 'reached' } | null;
  details: ReactNode;
};
