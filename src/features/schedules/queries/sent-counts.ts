import { getEffectiveClient } from '@/lib/supabase/admin';

/**
 * Guest records each Schedule of an Event actually went out to, keyed by
 * schedule id: every Delivery but the ones recorded as not sent (no usable
 * phone at send time). This is the audience of a sent Schedule - the live
 * target count keeps moving as guests answer, this does not.
 *
 * The whole event in a single round trip rather than a query per card.
 * Counted in JavaScript on purpose: PostgREST has no GROUP BY, and one event's
 * deliveries is a few hundred rows.
 *
 * A sent card shows no result percentage. Read rate undercounts by an
 * unknowable amount - a guest who turned off read receipts never reports one -
 * and the results tab is where the full picture lives.
 */
export async function getSentCountByScheduleId(
  scheduleIds: string[],
): Promise<Map<string, number>> {
  const sent = new Map<string, number>();
  if (scheduleIds.length === 0) return sent;

  const { supabase } = await getEffectiveClient();

  const { data, error } = await supabase
    .from('message_deliveries')
    .select('schedule_id, status')
    .in('schedule_id', scheduleIds);

  if (error) {
    // A missing count is a card without its audience number, not a broken page.
    console.error('[sent-counts] Query failed:', error);
    return sent;
  }

  for (const row of data ?? []) {
    if (row.status === 'not_sent') continue;
    const key = row.schedule_id as string;
    sent.set(key, (sent.get(key) ?? 0) + 1);
  }

  return sent;
}
