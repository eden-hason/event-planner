/**
 * Why an Operator's transportation answer from a call cannot be written, or
 * null when it can.
 *
 * The Transportation Question belongs to a confirmed Guest Record, so a call
 * records an answer only while the Event asks it and the record is confirmed.
 * Clearing an answer back to unanswered is always allowed: it can never put a
 * "yes" or "no" where one does not belong.
 */
export function callTransportationRefusal(input: {
  asked: boolean;
  rsvpStatus: string | null;
  value: boolean | null;
}): string | null {
  if (input.value === null) return null;
  if (!input.asked) return 'האירוע לא שואל על הסעה';
  if (input.rsvpStatus !== 'confirmed') return 'אפשר לסמן הסעה רק למי שאישר הגעה';
  return null;
}
