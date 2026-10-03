/**
 * One person read from the Owner's WhatsApp during a linked-device import
 * (backlog 0017). `phone` is international digits with no `+`
 * (`972548129777`), the form WhatsApp addresses people by.
 *
 * The two names come from different places and are rarely both present:
 * `savedName` is what the Owner saved the person as on their phone (only a
 * small share of contacts reach a linked device this way), `pushName` is what
 * the person calls themselves on WhatsApp.
 */
export interface WhatsAppPerson {
  phone: string;
  savedName: string | null;
  pushName: string | null;
}

export interface WhatsAppGroup {
  id: string;
  subject: string;
  members: WhatsAppPerson[];
  /** Members whose phone number could not be resolved - shown, never imported. */
  unresolvedCount: number;
}

export type WhatsAppImportErrorReason =
  /** The code was never entered, or the phone rejected it. */
  | 'pairing_timeout'
  /** WhatsApp refused the link or closed the session. */
  | 'connection_closed'
  /** The whole import ran past its deadline. */
  | 'timeout'
  | 'unknown';

/**
 * The newline-delimited JSON stream `POST /api/events/[eventId]/whatsapp-import`
 * sends. `groups` can arrive twice: once right after linking (phones complete,
 * names thin) and again once the sync settles (names filled in) - the later
 * one replaces the earlier.
 */
export type WhatsAppImportEvent =
  | { type: 'code'; code: string }
  | { type: 'linked' }
  | { type: 'groups'; groups: WhatsAppGroup[] }
  | { type: 'contacts'; contacts: WhatsAppPerson[] }
  | { type: 'done' }
  | { type: 'error'; reason: WhatsAppImportErrorReason };
