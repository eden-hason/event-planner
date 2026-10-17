import type { OwnerMessageKind, OwnerMessageStatus } from '../types';

/** Hebrew labels for the Back Office, which is Hebrew-only (ADR 0037). */
export const OWNER_MESSAGE_KIND_LABELS: Record<OwnerMessageKind, string> = {
  welcome: 'ברוכים הבאים',
  post_event: 'אחרי האירוע',
};

export const OWNER_MESSAGE_STATUS_LABELS: Record<OwnerMessageStatus, string> = {
  pending: 'ממתינה',
  sending: 'בשליחה',
  accepted: 'נשלחה',
  delivered: 'נמסרה',
  read: 'נקראה',
  failed: 'נכשלה',
  unknown: 'לא ידוע אם נשלחה',
  expired: 'פג תוקף',
};
