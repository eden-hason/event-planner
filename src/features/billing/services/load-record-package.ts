import type { SupabaseClient } from '@supabase/supabase-js';
import { pageAll } from '@/lib/supabase/row-cap';
import type { PackageSplit, RecordPackage, RecordPackageChannel } from '../types';
import { recordPackage, splitByPackage } from '../utils/record-package';

export type LoadedRecordPackage = {
  /** Null when no payment was ever recorded: the Event has no package. */
  package: RecordPackage | null;
  split: PackageSplit;
  /** The channel of the latest payment: what the package is sold on now. */
  channel: RecordPackageChannel | null;
  /** True when every payment is a gift from Kululu, so no surface should talk about paying. */
  gifted: boolean;
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
      .select('record_count, channel, payment_method')
      .eq('event_id', eventId)
      .not('record_count', 'is', null)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false }),
    orNull(
      pageAll<{ id: string; phone_added_at: string | null }>((from, to) =>
        supabase
          .from('guests')
          .select('id, phone_added_at')
          .eq('event_id', eventId)
          .order('id')
          .range(from, to),
      ),
    ),
    orNull(
      pageAll<{ guest_id: string }>((from, to) =>
        supabase
          .from('event_reached_records')
          .select('guest_id')
          .eq('event_id', eventId)
          .order('guest_id')
          .range(from, to),
      ),
    ),
  ]);

  if (eventRes.error || paymentsRes.error || !guests || !reached) {
    console.error('loadRecordPackage failed:', eventRes.error ?? paymentsRes.error);
    return null;
  }

  const payments = paymentsRes.data ?? [];
  const pkg = recordPackage({
    payments: payments.map((p) => p.record_count as number),
    bonusOverride: eventRes.data.bonus_records_override as number | null,
  });

  const reachedIds = new Set(reached.map((r) => r.guest_id));
  const records = guests.map((g) => ({
    id: g.id,
    phoneAddedAt: g.phone_added_at,
    reached: reachedIds.delete(g.id),
  }));

  return {
    package: pkg,
    channel: (payments[0]?.channel as RecordPackageChannel | undefined) ?? null,
    gifted: payments.length > 0 && payments.every((p) => p.payment_method === 'gift'),
    split: splitByPackage({
      packageSize: pkg?.size ?? 0,
      records,
      // Whatever is left in the set was Reached and has since been deleted.
      reachedDeletedCount: reachedIds.size,
    }),
  };
}

/**
 * The sending gate's question (ADR 0027): which of this Event's Guest Records are outside
 * its Record Package right now. Null when it could not be worked out - callers must not
 * send on a guess, so they treat that as a failure to retry, never as "nobody is outside".
 */
export async function loadOutsidePackageIds(
  supabase: SupabaseClient,
  eventId: string,
): Promise<ReadonlySet<string> | null> {
  const loaded = await loadRecordPackage(supabase, eventId);
  return loaded ? new Set(loaded.split.outside) : null;
}

/** Null on any error, so a partial list never counts. */
async function orNull<T>(rows: Promise<T[]>): Promise<T[] | null> {
  try {
    return await rows;
  } catch (error) {
    console.error('loadRecordPackage page failed:', error);
    return null;
  }
}
