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

/** Everything the WhatsApp import can fail with, as the client sees it. */
export type WhatsAppImportError = WhatsAppImportErrorReason | 'invalid_phone';

/**
 * `useWhatsAppImport`'s view of one session. `groups` and `contacts` outlive
 * the status changes they arrive during, so they sit beside the union.
 */
export type WhatsAppImportState = {
  groups: WhatsAppGroup[] | null;
  contacts: WhatsAppPerson[] | null;
} & (
  | { status: 'idle' }
  /** Waiting for WhatsApp to hand out a pairing code. */
  | { status: 'requesting' }
  /** Code on screen, waiting for the Owner to enter it on their phone. */
  | { status: 'code'; code: string }
  /** Linked, reading groups and contacts. */
  | { status: 'linked' }
  /** Everything read; the device has already been unlinked server-side. */
  | { status: 'done' }
  | { status: 'error'; error: WhatsAppImportError }
);
