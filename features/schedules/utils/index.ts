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

