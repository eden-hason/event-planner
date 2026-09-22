/**
 * What is still standing in an Event's outreach plan, and therefore what a
 * change to the Event's date would leave behind.
 *
 * A Schedule's Due Time is computed from `events.event_date` once, at seed time,
 * and never recomputed (docs/backlog/0008). Moving the date does not move the
 * plan, so the details page has to say so - and to say so it needs to know how
 * much of the plan is still outstanding.
 */

/** The one Schedule whose date being wrong is worth naming on its own. */
export const EVENT_REMINDER_KEY = 'event_reminder';

export interface OutstandingPlanSummary {
  /** Outstanding message Schedules: the number the warning counts. */
  messageCount: number;
  /** Whether the day-of reminder is one of them. */
  includesEventReminder: boolean;
}

interface PlanRow {
  /** `null` is an armed Schedule; see SCHEDULE_STATUSES for the rest. */
  status: string | null;
  scheduleTypeKey: string;
  executionKind?: string | null;
}

/**
 * A Schedule still points at a date that matters when nothing has happened to
 * it yet. `sent` is history, `cancelled` is a decision, `expired` has already
 * missed its window - none of the three would move if the date moved. A
 * `disabled` row does count: it is dated and simply waiting on payment, so it
 * carries the stale date forward the moment the Event can send.
 */
function isOutstanding(row: PlanRow): boolean {
  return row.status === null || row.status === 'disabled';
}

export function summariseOutstandingPlan(
  schedules: readonly PlanRow[],
): OutstandingPlanSummary {
  const outstanding = schedules.filter(isOutstanding);

  return {
    // Call Rounds are dated off the same Event date, but the warning offers one
    // action - going to the messages - so it counts only what that page shows.
    messageCount: outstanding.filter(
      (row) => !row.executionKind || row.executionKind === 'message',
    ).length,
    includesEventReminder: outstanding.some(
      (row) => row.scheduleTypeKey === EVENT_REMINDER_KEY,
    ),
  };
}
