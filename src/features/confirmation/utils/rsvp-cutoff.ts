import { daysUntil } from '@/lib/date-time';

/**
 * Whether a Guest may still change their RSVP (see RSVP Cutoff in CONTEXT.md):
 * until the end of the day before the Event, Israel time.
 *
 * An Event with no date has no cutoff - there is nothing to count down to, and
 * refusing a guest's answer over a missing field would be the wrong failure.
 */
export function isRsvpOpen(eventDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!eventDate) return true;
  return daysUntil(eventDate, now) >= 1;
}

export const RSVP_CLOSED_MESSAGE = 'אישורי ההגעה נסגרו. לשינויים יש לפנות ישירות למארחים 🙏🏼';
