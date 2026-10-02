import type { SupabaseClient } from '@supabase/supabase-js';
import type { PackageSplit, RecordPackage } from '../types';
import { recordPackage, splitByPackage } from '../utils/record-package';

const PAGE = 1000;

export type LoadedRecordPackage = {
  /** Null when no payment was ever recorded: the Event has no package. */
  package: RecordPackage | null;
  split: PackageSplit;
};

/**
 * Reads the facts behind an Event's Record Package - its payments, the bonus override, the
 * guest list and which records were Reached - and derives the package and the split.
 *
 * Lives in `services/` because the Back Office, the Owner's pages and the sending gate all
 * need the same answer, and the gate runs as the service role from cron. Takes its client as
 * a parameter and does not authorize: RLS (or the caller) decides what it may read.
 */
export async function loadRecordPackage(
  supabase: SupabaseClient,
  eventId: string,
): Promise<LoadedRecordPackage | null> {
  const [eventRes, paymentsRes, guests, reached] = await Promise.all([
    supabase.from('events').select('bonus_records_override').eq('id', eventId).single(),
    supabase
      .from('event_billing_events')
      .select('record_count')
      .eq('event_id', eventId)
      .not('record_count', 'is', null),
    pageAll<{ id: string; created_at: string }>((from) =>
      supabase
        .from('guests')
        .select('id, created_at')
        .eq('event_id', eventId)
        .order('id')
        .range(from, from + PAGE - 1),
    ),
    pageAll<{ guest_id: string }>((from) =>
      supabase
        .from('event_reached_records')
        .select('guest_id')
        .eq('event_id', eventId)
        .order('guest_id')
        .range(from, from + PAGE - 1),
    ),
  ]);

  if (eventRes.error || paymentsRes.error || !guests || !reached) {
    console.error('loadRecordPackage failed:', eventRes.error ?? paymentsRes.error);
    return null;
  }

  const pkg = recordPackage({
    payments: (paymentsRes.data ?? []).map((p) => p.record_count as number),
    bonusOverride: eventRes.data.bonus_records_override as number | null,
  });

  const reachedIds = new Set(reached.map((r) => r.guest_id));
  const records = guests.map((g) => ({
    id: g.id,
    createdAt: g.created_at,
    reached: reachedIds.delete(g.id),
  }));

  return {
    package: pkg,
    split: splitByPackage({
      packageSize: pkg?.size ?? 0,
      records,
      // Whatever is left in the set was Reached and has since been deleted.
      reachedDeletedCount: reachedIds.size,
    }),
  };
}

/** Pages past PostgREST's 1000-row cap. Null on any error, so a partial list never counts. */
async function pageAll<T>(
  fetchPage: (
    from: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from);
    if (error) {
      console.error('loadRecordPackage page failed:', error);
      return null;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}
