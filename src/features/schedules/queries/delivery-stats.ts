import { getEffectiveClient } from '@/lib/supabase/admin';

/**
 * The one number a sent Schedule shows on the timeline.
 *
 * The results tab already answers this in full, per guest, but it only does so
 * once the organiser opens it - and the question the timeline has to answer is
 * "did that one work?", asked while scanning seven cards. So this is the whole
 * event in a single round trip rather than a query per card.
 *
 * Aggregated in JavaScript on purpose: PostgREST has no GROUP BY, and the
 * alternative is a database view that would have to be kept in step with
 * `getScheduleInteractionData`'s definitions of reached and seen. One event's
 * deliveries is a few hundred rows.
 */
export type ScheduleDeliveryStats = {
  /** Deliveries created for this Schedule, over both channels. */
  total: number;
  /** Deliveries that got to the guest - delivered or read, or accepted over SMS. */
  reached: number;
  /** WhatsApp deliveries with a read receipt. */
  read: number;
  /**
   * Deliveries that could ever report a read receipt: WhatsApp, not failed, not
   * skipped. The denominator `read` is honest against - scoring it out of the
   * whole audience would count every SMS guest as unread.
   */
  readCapable: number;
};

function empty(): ScheduleDeliveryStats {
  return { total: 0, reached: 0, read: 0, readCapable: 0 };
}

/**
 * Delivery stats for every Schedule of an Event, keyed by schedule id.
 *
 * A Schedule with no deliveries is absent from the map rather than present and
 * zeroed, so a caller can tell "nothing was sent" from "everything failed".
 */
export async function getDeliveryStatsByScheduleId(
  scheduleIds: string[],
): Promise<Map<string, ScheduleDeliveryStats>> {
  const stats = new Map<string, ScheduleDeliveryStats>();
  if (scheduleIds.length === 0) return stats;

  const { supabase } = await getEffectiveClient();

  const { data, error } = await supabase
    .from('message_deliveries')
    .select('schedule_id, status, delivery_method')
    .in('schedule_id', scheduleIds);

  if (error) {
    // A missing mini-stat is a card without a percentage, not a broken page.
    console.error('[delivery-stats] Query failed:', error);
    return stats;
  }

  for (const row of data ?? []) {
    const key = row.schedule_id as string;
    const status = row.status as string | null;
    const isWhatsApp = row.delivery_method === 'whatsapp';

    let entry = stats.get(key);
    if (!entry) {
      entry = empty();
      stats.set(key, entry);
    }

    entry.total += 1;

    // Matches toOutcome in queries/guest-interactions.ts: SMS never reports
    // past accepted, so an accepted SMS counts as reached while an accepted
    // WhatsApp is still only on its way.
    if (
      status === 'delivered' ||
      status === 'read' ||
      (status === 'sent' && !isWhatsApp)
    ) {
      entry.reached += 1;
    }

    if (isWhatsApp && status !== 'failed' && status !== 'not_sent') {
      entry.readCapable += 1;
      if (status === 'read') entry.read += 1;
    }
  }

  return stats;
}
