import { parsePhoneNumberWithError } from 'libphonenumber-js';

/**
 * The single place a phone number becomes canonical.
 *
 * Every number reaching `guests.phone_number` or `profiles.phone_number` is
 * stored in E.164 (`+972545451963`) so that equality, indexing and duplicate
 * detection all work on a plain `=`. Before this existed the column held
 * whatever the user typed - `0545451963`, `054-545-1963` and `+972545451963`
 * were three distinct strings for one person, which is how the same guest got
 * invited twice.
 *
 * Formatting for humans is a render-time concern and belongs at the component
 * layer, not here.
 */

/** Matches the `CHECK` constraint on both phone columns. Keep the two in step. */
export const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

/**
 * The region an unprefixed number is assumed to belong to.
 *
 * The product is Israel-only today. When that stops being true this has to
 * become an input captured alongside the number rather than a constant, since
 * `054...` is only unambiguous once you already know the country.
 */
export const DEFAULT_PHONE_REGION = 'IL' as const;

/**
 * Converts a number to E.164, or returns null when it cannot be parsed.
 *
 * Deliberately returns null rather than guessing: the previous implementation
 * ended with `return '+972' + cleaned`, which silently mangled anything it did
 * not recognise into a plausible-looking Israeli number.
 */
export function toE164(
  input: string | null | undefined,
  region: string = DEFAULT_PHONE_REGION,
): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = parsePhoneNumberWithError(
      trimmed,
      region as Parameters<typeof parsePhoneNumberWithError>[1],
    );
    return parsed.isValid() ? parsed.format('E.164') : null;
  } catch {
    return null;
  }
}

/**
 * Renders a stored E.164 number the way a person would write it locally:
 * `+972548129777` becomes `054-8129777`, `+97236100000` becomes `03-6100000`.
 *
 * Israeli convention is `0`, the area/mobile prefix, a hyphen, then the
 * seven-digit subscriber number. Numbers from other regions fall back to the
 * international format, and anything that does not parse is returned untouched
 * so the UI never shows a blank where a value exists.
 */
export function formatPhone(
  input: string | null | undefined,
  region: string = DEFAULT_PHONE_REGION,
): string {
  if (!input) return '';

  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    const parsed = parsePhoneNumberWithError(
      trimmed,
      region as Parameters<typeof parsePhoneNumberWithError>[1],
    );
    if (!parsed.isValid()) return trimmed;

    if (parsed.country === 'IL') {
      const nn = parsed.nationalNumber;
      return `0${nn.slice(0, -7)}-${nn.slice(-7)}`;
    }

    return parsed.formatInternational();
  } catch {
    return trimmed;
  }
}

/** True when the input parses to a real, dialable number. */
export function isValidPhone(
  input: string | null | undefined,
  region: string = DEFAULT_PHONE_REGION,
): boolean {
  return toE164(input, region) !== null;
}

/**
 * Canonical form for *comparison* - duplicate detection, set membership, map
 * keys - falling back to a whitespace-stripped copy of the input when the
 * number does not parse.
 *
 * The fallback matters: two identical unparseable strings should still collide
 * with each other rather than silently comparing as two different guests.
 */
export function phoneComparisonKey(input: string | null | undefined): string {
  if (!input) return '';
  return toE164(input) ?? input.replace(/[\s\-().]/g, '');
}
