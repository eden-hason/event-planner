/**
 * The Transportation Question's Question Wording and Transportation Group (see
 * CONTEXT.md): what a Guest is asked, and where a Guest who said yes is pointed.
 *
 * Pure and dependency-free, because four surfaces need the same answers: the
 * event-details card that edits them, the Confirmation Conversation, the RSVP
 * page and the Operator's calling surface. The Guest is only ever asked in
 * Hebrew, so Kululu's wording is Hebrew whatever language the Owner's app is in.
 */

/** Kululu's wording, as the Confirmation Conversation asks it - and the field's starting text. */
export const KULULU_TRANSPORTATION_WORDING = 'מעוניינים בהסעה לאירוע? 🚌';

/**
 * Kululu's wording as the RSVP page's opt-in checkbox reads it. Only an Event
 * whose Owner never wrote their own sees it: an Owner's wording is shown as
 * written in both places.
 */
export const KULULU_TRANSPORTATION_CHECKBOX_WORDING = 'מעוניינים בהסעה לאירוע';

/** Enough for a pickup point and a time; Meta allows 1024 in a button message body. */
export const TRANSPORTATION_WORDING_MAX_LENGTH = 300;

/**
 * What to store for what the Owner typed: their wording, or null for none.
 * Blank, or exactly Kululu's own text, is no wording of the Owner's - so an
 * Event that never really changed it keeps following Kululu's.
 */
export function ownerTransportationWording(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed === KULULU_TRANSPORTATION_WORDING) return null;
  return trimmed;
}

/** The wording a Guest reads in one place: the Owner's when there is one, else Kululu's for that place. */
export function transportationWording(
  owner: string | null | undefined,
  place: 'chat' | 'checkbox',
): string {
  return (
    ownerTransportationWording(owner) ??
    (place === 'chat' ? KULULU_TRANSPORTATION_WORDING : KULULU_TRANSPORTATION_CHECKBOX_WORDING)
  );
}

export type TransportationGroupUrlError = 'notUrl' | 'notWhatsAppGroup';

/**
 * Why a Transportation Group link cannot be saved, or null when it can.
 * Blank is allowed - it is no group. Only a WhatsApp group invite is accepted,
 * which turns away the near misses an Owner is likely to paste: a wa.me chat
 * with one number, a channel, or the group's name instead of its link.
 */
export function validateTransportationGroupUrl(
  value: string | null | undefined,
): TransportationGroupUrlError | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'notUrl';
  }
  if (url.protocol !== 'https:') return 'notUrl';
  if (url.hostname.toLowerCase() !== 'chat.whatsapp.com') return 'notWhatsAppGroup';
  // An invite is one path segment: the code. The bare host, or a deeper path
  // like /channel/..., is not one.
  if (!/^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) return 'notWhatsAppGroup';
  return null;
}

/** What to store for a Transportation Group link: the trimmed link, or null for none or an invalid one. */
export function storedTransportationGroupUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || validateTransportationGroupUrl(trimmed)) return null;
  return trimmed;
}

/**
 * The Transportation Group link one Guest Record is shown, or null.
 *
 * A confirmed record whose answer is yes, on an Event that asks the question and
 * has a group - whoever gave the answer. A record that changes to "no" stops
 * seeing it; Kululu cannot take anyone out of the group, and does not try.
 */
export function transportationGroupFor(input: {
  askTransportation: boolean;
  groupUrl: string | null | undefined;
  rsvpStatus: string | null;
  needsTransportation: boolean | null;
}): string | null {
  if (!input.askTransportation) return null;
  if (input.rsvpStatus !== 'confirmed' || input.needsTransportation !== true) return null;
  return storedTransportationGroupUrl(input.groupUrl);
}
