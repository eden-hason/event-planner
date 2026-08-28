import type { GuestApp } from '@/features/guests/schemas';
import { isValidPhone } from '@/lib/phone';

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
  categoriseWhatsAppError,
  sendToGuest,
  sendSmsToGuest,
  buildSmsBody,
  sendInChunks,
  buildDeliveryRecord,
  generateConfirmationToken,
  type WhatsAppErrorCategory,
  type GuestSendResult,
} from './send-helpers';

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
 * Calculates the scheduled date/time based on the event date and offset.
 *
 * @param eventDate - The event date in ISO format (YYYY-MM-DD)
 * @param daysOffset - Number of days before (negative) or after (positive) the event
 * @param time - Time in HH:mm format
 * @returns ISO 8601 timestamp string
 */
export function calculateScheduledDate(
  eventDate: string,
  daysOffset: number,
  time: string,
): string {
  const date = new Date(eventDate);
  date.setDate(date.getDate() + daysOffset);

  // Parse time and set it
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);

  return date.toISOString();
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
