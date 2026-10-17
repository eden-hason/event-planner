import type { OwnerMessageStatus } from '../types';

/**
 * How one of Meta's statuses lands on an Owner Message row: the status to write,
 * and the statuses the row may hold for that write to be an advance.
 *
 * The same order as a Delivery Attempt's (process-whatsapp-webhook.ts), with
 * `failed` at the top because Meta never delivers what it reported failed. Meta
 * says `sent`; the row already reads `accepted` for that, so `sent` only lifts a
 * row still `sending` (the status beat the send call's answer) or `unknown`
 * (the answer was lost). `pending` and `expired` never went out and stay put.
 *
 * Null for a status this does not know.
 */
export function ownerMessageStatusUpdate(
  metaStatus: string,
): { status: OwnerMessageStatus; from: OwnerMessageStatus[] } | null {
  switch (metaStatus) {
    case 'sent':
      return { status: 'accepted', from: ['sending', 'unknown'] };
    case 'delivered':
      return { status: 'delivered', from: ['sending', 'unknown', 'accepted'] };
    case 'read':
      return { status: 'read', from: ['sending', 'unknown', 'accepted', 'delivered'] };
    case 'failed':
      return { status: 'failed', from: ['sending', 'unknown', 'accepted', 'delivered', 'read'] };
    default:
      return null;
  }
}
