import { eventDaysFromToday } from '@/lib/date-time';
// Deep import: pure, and the schedules barrel carries the send path.
import { hasInvitationImage } from '@/features/schedules/utils/event-config';
import type { MessagePlan } from '@/features/schedules/utils/message-plan-kind';

/**
 * An Extra Schedule on the current Message Plan grants one more Follow-up
 * (ADR 0053): undated, to the Guests who have not answered, attaching the
 * invitation image when the Event has one - the same row the seed writes for
 * the first two. Pure so the action and its test agree.
 */

export type ExtraFollowUpEvent = {
  status: string | null;
  eventDate: string | null;
  messagePlan: MessagePlan;
  canCreateSchedules: boolean;
  imageUrl: string | null | undefined;
};

/** Why an Operator cannot add a Follow-up to this Event, or null when they can. */
export function extraFollowUpRejection(event: ExtraFollowUpEvent, now = new Date()): string | null {
  if (event.messagePlan !== 'current') {
    return 'אפשר להוסיף הודעת עדיין מחכים לתשובה רק לאירוע על תוכנית ההודעות החדשה';
  }
  // A Draft Event cannot have schedules - it is interest, not an event.
  if (event.status !== 'published') return 'האירוע הזה לא פורסם';
  if (!event.eventDate) return 'לאירוע הזה אין תאריך';
  const days = eventDaysFromToday(event.eventDate, now);
  if (days !== null && days < 0) return 'האירוע כבר עבר';
  return null;
}

/** The new Follow-up's row, as seed_current_message_plan_schedules writes a Follow-up. */
export function extraFollowUpRow(event: ExtraFollowUpEvent) {
  return {
    scheduled_date: null,
    target_status: 'pending' as const,
    wording: 'kululu' as const,
    // The image when the Event has one the header could carry, judged as the send judges it.
    attachment: hasInvitationImage({ imageUrl: event.imageUrl ?? undefined })
      ? ('image' as const)
      : ('none' as const),
    // Locked like the rest of the plan while the Event cannot send.
    status: event.canCreateSchedules ? null : ('disabled' as const),
  };
}
