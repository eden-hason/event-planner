import type { GuestApp } from '@/features/guests/schemas';

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

// Re-export template validation utilities
export {
  validateTemplateConfig,
  formatValidationIssues,
  type ValidationResult,
  type ValidationIssue,
} from './template-validation';

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export type RelativeTimeResult =
  | { type: 'justNow' }
  | { type: 'past'; unit: TimeUnit; count: number }
  | { type: 'future'; unit: TimeUnit; count: number };

export function formatRelativeTime(dateStr: string): RelativeTimeResult {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isPast = diffMs < 0;

  const minutes = Math.floor(absDiffMs / (1000 * 60));
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return { type: 'justNow' };

  let unit: TimeUnit;
  let count: number;
  if (minutes < 60) { unit = 'minutes'; count = minutes; }
  else if (hours < 24) { unit = 'hours'; count = hours; }
  else if (days < 7) { unit = 'days'; count = days; }
  else if (weeks < 5) { unit = 'weeks'; count = weeks; }
  else { unit = 'months'; count = months; }

  return { type: isPast ? 'past' : 'future', unit, count };
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
  actionType?: string,
): GuestApp[] {
  if (!targetStatus) return guests;

  if (actionType === 'initial_invitation') {
    // Offline RSVP guests receive the initial invitation even though they're not pending
    return guests.filter(
      (guest) => guest.rsvpStatus === targetStatus || guest.isOfflineRsvp,
    );
  }

  return guests.filter((guest) => guest.rsvpStatus === targetStatus);
}

/**
 * Validates if a phone number has a valid format.
 * Strips formatting characters and checks for minimum valid format.
 *
 * @param phone - Phone number to validate
 * @returns True if phone number is valid
 */
export function validatePhoneNumber(phone: string | undefined | null): boolean {
  if (!phone) {
    return false;
  }

  // Strip formatting characters
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Must have at least 7 digits and contain only digits/+
  if (cleaned.length < 7) {
    return false;
  }

  // Check if contains only valid characters (digits and optional + at start)
  if (!/^[+]?[\d]+$/.test(cleaned)) {
    return false;
  }

  return true;
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

/**
 * Formats a phone number to E.164 international format.
 * Handles Israeli numbers with special logic for 0 prefix.
 *
 * @param phone - Phone number to format
 * @returns Phone number in E.164 format (+country_code + number)
 */
export function formatPhoneE164(phone: string): string {
  // Strip all formatting characters
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Already has + prefix (international format)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Starts with country code without +
  if (cleaned.startsWith('972')) {
    return '+' + cleaned;
  }

  // Starts with 0 (Israeli local format) - replace with +972
  if (cleaned.startsWith('0')) {
    return '+972' + cleaned.substring(1);
  }

  // Default: prepend Israeli country code
  return '+972' + cleaned;
}

