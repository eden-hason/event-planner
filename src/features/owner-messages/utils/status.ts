import type { OwnerMessageStatus } from '../types';

/**
 * Every status a sent Owner Message can move through, in order. A status is
 * only written over the ones before it, the same rule a Delivery Attempt
 * follows (process-whatsapp-webhook.ts), with `failed` last because Meta never
 * delivers what it reported failed. `pending` and `expired` never went out, so
 * no status moves them.
 */
const ORDER = ['sending', 'unknown', 'accepted', 'delivered', 'read', 'failed'] as const;

/** Meta says `sent`; the row already reads `accepted` for that. */
const FROM_META: Record<string, (typeof ORDER)[number]> = {
  sent: 'accepted',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
};

/**
 * How one of Meta's statuses lands on an Owner Message row: the status to write,
 * and the statuses the row may hold for that write to be an advance. Null for a
 * status this does not know.
 */
export function ownerMessageStatusUpdate(
  metaStatus: string,
): { status: OwnerMessageStatus; from: OwnerMessageStatus[] } | null {
  if (!Object.hasOwn(FROM_META, metaStatus)) return null;
  const status = FROM_META[metaStatus];
  return { status, from: ORDER.slice(0, ORDER.indexOf(status)) };
}
