import { daysUntil } from '@/lib/date-time';

/**
 * Whether a Guest may still change their RSVP (see RSVP Cutoff in CONTEXT.md):
 * until the end of the Event day, Israel time. A late change the day of is
 * still worth having; one after the Event would rewrite who came.
 *
 * An Event with no date has no cutoff - there is nothing to count down to, and
 * refusing a guest's answer over a missing field would be the wrong failure.
 */
export function isRsvpOpen(eventDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!eventDate) return true;
  return daysUntil(eventDate, now) >= 0;
}

export const RSVP_CLOSED_MESSAGE = 'אישורי ההגעה נסגרו. לשינויים יש לפנות ישירות למארחים 🙏🏼';
