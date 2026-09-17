import type { GuestApp } from '@/features/guests/schemas';
import { isValidPhone } from '@/lib/phone';
import { israelWallClockToIso } from '@/lib/date-time';

// Re-export parameter resolution utilities
export {
  buildDynamicTemplateParameters,
  buildDynamicHeaderParameters,
  buildDynamicButtonParameters,
  extractPlaceholders,
  type MediaParameter,
  type ParameterResolutionContext,
  type ButtonComponent,
} from './parameter-resolvers';

// Re-export event-configuration predicates
export {
  isGiftingEnabled,
  shouldSendTableNumbers,
  type GiftingSettings,
  type TableNumberSettings,
} from './event-config';

// Re-export send helpers
export {
  sendToGuest,
  sendSmsToGuest,
  buildSmsBody,
  sendInChunks,
  buildAttemptRecord,
  generateConfirmationToken,
  type AttemptTrigger,
  type GuestSendResult,
} from './send-helpers';

export {
  classifyWhatsAppFailure,
  describeGuestLevelFailure,
  type WhatsAppFailureSide,
} from './whatsapp-failures';

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export type RelativeTimeResult =
  | { type: 'justNow' }
  | { type: 'past'; unit: TimeUnit; count: number }
  | { type: 'future'; unit: TimeUnit; count: number };

const MINUTE_MS = 1000 * 60;
const HOUR_MS = MINUTE_MS * 60;
const DAY_MS = HOUR_MS * 24;

/**
 * Whole calendar days from one instant to another, in the viewer's local zone.
 *
 * Counts midnight boundaries rather than elapsed time, which is what a person
 * means by "in 4 days" - the time of day on either end does not change the
 * answer.
 */
function calendarDaysBetween(from: Date, to: Date): number {
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((midnight(to) - midnight(from)) / DAY_MS);
}

/**
 * How far away an instant is, as a unit and a count for the i18n catalog to
 * phrase.
 *
 * Anything a day or more out is counted in *calendar* days. Flooring elapsed
 * milliseconds instead made a round planned for the 18th read "in 3d" on the
 * 14th, because the gap was 3.8 days - always short by up to a day, and always
 * in the direction that makes work look further away than it is. Sub-day gaps
 * round rather than floor, for the same reason.
 */
export function formatRelativeTime(dateStr: string): RelativeTimeResult {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const type = diffMs < 0 ? ('past' as const) : ('future' as const);

  const minutes = Math.round(absDiffMs / MINUTE_MS);
  if (minutes < 1) return { type: 'justNow' };
  if (absDiffMs < HOUR_MS) return { type, unit: 'minutes', count: minutes };

  const hours = Math.round(absDiffMs / HOUR_MS);
  if (hours < 24) return { type, unit: 'hours', count: hours };

  // Floored at 1: reaching here means the instants are at least ~24h apart, but
  // a 25-hour local day (DST) can still leave them on adjacent midnights.
  const days = Math.max(1, Math.abs(calendarDaysBetween(now, date)));
  if (days < 7) return { type, unit: 'days', count: days };
  if (days < 35) return { type, unit: 'weeks', count: Math.round(days / 7) };
  return { type, unit: 'months', count: Math.round(days / 30) };
}

/**
 * The Due Time a catalog default implies: the event date shifted by the
 * offset, at the catalog's clock face, in Israel.
 *
 * The catalog's "10:00" is a wall clock and has to be applied as one. This
 * used to call `setHours`, which on a Vercel server means 10:00 UTC and so
 * 13:00 in Israel - the bug that put the two old columns out of step on most
 * rows (ADR 0015).
 *
 * @param eventDate - The event date in ISO format (YYYY-MM-DD)
 * @param daysOffset - Number of days before (negative) or after (positive) the event
 * @param time - Israel wall clock in HH:mm format
 * @returns ISO 8601 instant
 */
export function calculateScheduledDate(
  eventDate: string,
  daysOffset: number,
  time: string,
): string {
  // event_date is a calendar date at 00:00 UTC, so the day is shifted in UTC
  // and only the clock face is interpreted in Israel.
  const day = new Date(eventDate);
  day.setUTCDate(day.getUTCDate() + daysOffset);

  return (
    israelWallClockToIso(day.toISOString().slice(0, 10), time) ?? day.toISOString()
  );
}

/**
 * Filters guests based on targeting criteria.
 *
 * @param guests - Array of guests to filter
 * @param targetStatus - Optional RSVP status to filter by (null means all guests)
 * @returns Filtered array of guests
 */
export function filterGuestsByTarget(
  guests: GuestApp[],
  targetStatus?: 'pending' | 'confirmed' | null,
): GuestApp[] {
  if (!targetStatus) return guests;

  return guests.filter((guest) => guest.rsvpStatus === targetStatus);
}

/**
 * Whether a schedule is executed by the message send engine, as opposed to by a
 * human (a phone call round) or a future non-message process.
 *
 * Deliberately a positive test on the catalog's `execution_kind` rather than a
 * list of keys to exclude: a kind this build has never heard of is treated as
 * not-a-message, so it is never sent by accident. See
 * docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md.
 */
export function isMessageSchedule(schedule: { executionKind: string }): boolean {
  return schedule.executionKind === 'message';
}

/**
 * Validates if a phone number is real and dialable.
 *
 * Re-exported under the old name because it is the audience filter used across
 * schedules and admin; the logic now lives in `@/lib/phone` so validation and
 * canonicalisation cannot drift apart.
 */
export function validatePhoneNumber(phone: string | undefined | null): boolean {
  return isValidPhone(phone);
}

/**
 * Returns a human-readable label for a schedule's target audience.
 *
 * @param targetStatus - Optional RSVP status filter
 * @returns Display label string
 */
export function getAudienceLabel(targetStatus?: 'pending' | 'confirmed' | null): string {
  if (targetStatus === 'confirmed') return 'Confirmed Guests';
  if (targetStatus === 'pending') return 'Pending Guests';
  return 'All Guests';
}
