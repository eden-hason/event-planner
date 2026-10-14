import type { SupabaseClient } from '@supabase/supabase-js';
import { pageAll } from '@/lib/supabase/row-cap';
import type { RecordPackageChannel } from '../types';
import { includesCallRounds } from '../utils/record-package';

/**
 * Which of these Events are on the WhatsApp + calls Plan (ADR 0034), and so may have Call
 * Rounds planned and started. The Plan is the channel of the newest payment - the same
 * reading the Record Package and the Back Office events list use - so a top-up decides it.
 *
 * Shared by the Server Actions that create and start a round and by every surface that
 * shows one, so they all agree. Takes its client as a parameter: payments are Owner-only
 * under RLS, so a caller showing this to a collaborator passes the service client after
 * proving access. Null when it could not be worked out - a caller must not start a round
 * on a guess.
 */
export async function loadCallRoundEventIds(
  supabase: SupabaseClient,
  eventIds: readonly string[],
): Promise<ReadonlySet<string> | null> {
  if (!eventIds.length) return new Set();

  try {
    const events = await pageAll<{
      id: string;
      event_billing_events: { channel: RecordPackageChannel | null }[];
    }>((from, to) =>
      supabase
        .from('events')
        .select('id, event_billing_events(channel)')
        .in('id', [...eventIds])
        .not('event_billing_events.record_count', 'is', null)
        .order('occurred_at', { referencedTable: 'event_billing_events', ascending: false })
        .order('created_at', { referencedTable: 'event_billing_events', ascending: false })
        .limit(1, { referencedTable: 'event_billing_events' })
        .order('id')
        .range(from, to),
    );

    return new Set(
      events
        .filter((event) => includesCallRounds(event.event_billing_events[0]?.channel ?? null))
        .map((event) => event.id),
    );
  } catch (error) {
    console.error('loadCallRoundEventIds failed:', error);
    return null;
  }
}
