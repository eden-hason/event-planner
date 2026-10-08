import { eventDaysFromToday } from '@/lib/date-time';
// The rule's own file rather than the feature barrel, which also carries the
// Server Actions and their mail client - this stays pure and testable.
import { hasNoAskPlanned, type AskPlanRow } from '@/features/schedules/utils/ask-plan';

/**
 * How close the Event has to be before an undated plan becomes an Operator's
 * problem. Matches the first Confirmation Kululu used to seed on its own (-21
 * days): by then it would already have asked for RSVPs, so an Owner who still
 * has not is worth a call. A judgement, kept in one place.
 */
export const NO_ASK_PLANNED_DAYS = 21;

/**
 * The **No Ask Planned** Signal (CONTEXT.md, Undated Schedule): an Event that
 * can send, on or before its day and within the window, with none of its
 * Initial Invitations or Confirmations dated (ADR 0029). An Event already over
 * has nothing left to ask, and one that cannot send cannot date them.
 */
export function isNoAskPlanned(params: {
  eventDate: string | null;
  canSend: boolean;
  schedules: readonly AskPlanRow[];
  now?: Date;
}): boolean {
  if (!params.canSend) return false;
  const days = eventDaysFromToday(params.eventDate, params.now);
  if (days === null || days < 0 || days > NO_ASK_PLANNED_DAYS) return false;
  return hasNoAskPlanned(params.schedules);
}
