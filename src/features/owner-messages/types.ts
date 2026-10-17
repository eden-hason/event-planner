/**
 * TypeScript-only types for Owner Messages (ADR 0039). No Zod here.
 */

export type OwnerMessageKind = 'welcome' | 'post_event';

export const OWNER_MESSAGE_KINDS: readonly OwnerMessageKind[] = ['welcome', 'post_event'];

export type OwnerMessageStatus =
  | 'pending'
  | 'sending'
  | 'accepted'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'unknown'
  | 'expired';

/** One row of the Back Office list. */
export type OwnerMessageRow = {
  id: string;
  kind: OwnerMessageKind;
  status: OwnerMessageStatus;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  /** True for an Operator's "send now". */
  manual: boolean;
  phoneNumber: string | null;
  errorMessage: string | null;
};

/** What a send needs to know about the Event and its creator. */
export type OwnerMessageFacts = {
  eventId: string;
  /** The Event's creator - the only recipient (ADR 0039). */
  ownerUserId: string;
  ownerFullName: string | null;
  ownerPhone: string | null;
  /** The Plan of the latest payment, null when none was recorded. */
  channel: 'sms' | 'whatsapp' | 'whatsapp_calls' | null;
  /** Paid plus Bonus Records, null when no payment was recorded. */
  packageSize: number | null;
};

export type SendOwnerMessageResult =
  | { success: true; status: OwnerMessageStatus }
  | { success: false; message: string };
