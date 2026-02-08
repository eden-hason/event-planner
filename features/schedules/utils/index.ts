import type { GuestApp } from '@/features/guests/schemas';
import type { TargetFilter } from '../schemas';

// Re-export parameter resolution utilities
export {
  buildDynamicTemplateParameters,
  buildDynamicHeaderParameters,
  extractPlaceholders,
  type ParameterResolutionContext,
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
 * @param targetFilter - Optional targeting criteria (RSVP status, group IDs)
 * @returns Filtered array of guests
 */
export function filterGuestsByTarget(
  guests: GuestApp[],
  targetFilter?: TargetFilter,
): GuestApp[] {
  if (!targetFilter) {
    return guests;
  }

  let filtered = guests;

  // Filter by RSVP status
  if (targetFilter.guestStatus && targetFilter.guestStatus.length > 0) {
    filtered = filtered.filter((guest) =>
      targetFilter.guestStatus!.includes(guest.rsvpStatus),
    );
  }

  // Filter by group IDs
  if (targetFilter.groupIds && targetFilter.groupIds.length > 0) {
    filtered = filtered.filter(
      (guest) => guest.groupId && targetFilter.groupIds!.includes(guest.groupId),
    );
  }

  // Tags filtering not implemented yet (future enhancement)

  return filtered;
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
  const cleaned = phone.replace(/[\s\-().]/g, '');

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
  const cleaned = phone.replace(/[\s\-().]/g, '');

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

/**
 * Template parameter type for WhatsApp messages.
 * Supports text and media types (image, video, document).
 */
export type MediaParameter =
  | { type: 'text'; text: string }
  | { type: 'image'; image: { link: string } }
  | { type: 'video'; video: { link: string } }
  | { type: 'document'; document: { link: string; filename?: string } };

export type TemplateParameter = MediaParameter;

/**
 * Builds template parameters by replacing placeholders with actual values.
 * Supports common placeholders: {{guest_name}}, {{event_title}}, {{event_date}}
 *
 * @param bodyText - Template body text with placeholders
 * @param eventTitle - Event title
 * @param eventDate - Event date (ISO string)
 * @param guestName - Guest name
 * @returns Array of template parameters for WhatsApp API
 */
export function buildTemplateParameters(
  bodyText: string,
  eventTitle: string,
  eventDate: string,
  guestName: string,
): TemplateParameter[] {
  const parameters: TemplateParameter[] = [];

  // Extract placeholders using regex
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = placeholderRegex.exec(bodyText)) !== null) {
    const placeholder = match[1];
    let value = '';

    switch (placeholder) {
      case 'guest_name':
        value = guestName;
        break;
      case 'event_title':
        value = eventTitle;
        break;
      case 'event_date':
        // Format date to readable format
        value = new Date(eventDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        break;
      default:
        // Unknown placeholder - use empty string
        value = '';
    }

    parameters.push({
      type: 'text',
      text: value,
    });
  }

  return parameters;
}
