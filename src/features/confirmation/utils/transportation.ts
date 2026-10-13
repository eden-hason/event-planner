/**
 * The transportation answer as a FormData field: `yes`, `no`, or absent (not
 * answered). The RSVP page always sends one - its opt-in checkbox has no third
 * state - while the guest drawer can send `null` to clear it.
 */
export type TransportationField = 'yes' | 'no';

export function toTransportationField(value: boolean | null): TransportationField | null {
  if (value === null) return null;
  return value ? 'yes' : 'no';
}

/** The inverse: `yes` / `no`, and anything else (`null` included) is unanswered. */
export function fromTransportationField(value: string | null | undefined): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

/**
 * What one RSVP page submission writes to `guests.needs_transportation`, or
 * undefined to leave it untouched.
 *
 * An Event that does not ask the question never has it written, so switching it
 * off changes nothing on save. Not coming clears an answer back to unanswered,
 * as the conversation does; coming stores what was sent - the page's checkbox
 * sends `no` when left unticked, since the Guest saw it and submitted. A
 * submission with no field at all (a page loaded before the checkbox) stays
 * unanswered rather than becoming a "no".
 */
export function pageTransportationUpdate(input: {
  asked: boolean;
  confirmed: boolean;
  answer: TransportationField | undefined;
}): boolean | null | undefined {
  if (!input.asked) return undefined;
  if (!input.confirmed) return null;
  return fromTransportationField(input.answer);
}
