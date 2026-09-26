import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupSide } from '@/features/guests/schemas';
import type { RsvpStatus } from '@/features/guests/utils/rsvp-presentation';

/**
 * Bulk writes to an Event's guest list, shared by the Server Actions and the
 * `keepalive` delete route (ADR 0025). Every write is scoped to the Event as
 * well as the ids, so a stray id from another Event can never be touched; RLS
 * decides whether the caller may touch this Event at all.
 */

/**
 * PostgREST carries `in.(...)` filters in the URL, and 800 uuids would not fit
 * in one. Chunks keep each request well under the limit.
 */
const CHUNK = 150;

function chunks<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK)
    out.push(items.slice(i, i + CHUNK));
  return out;
}

export type BulkWriteResult =
  | { ok: true; count: number }
  | { ok: false; count: number };

async function eachChunk(
  ids: readonly string[],
  run: (
    chunk: string[],
  ) => PromiseLike<{ error: unknown; count: number | null }>,
): Promise<BulkWriteResult> {
  let count = 0;
  for (const chunk of chunks([...new Set(ids)])) {
    const { error, count: written } = await run(chunk);
    if (error) {
      console.error('Bulk guest write failed:', error);
      return { ok: false, count };
    }
    count += written ?? 0;
  }
  return { ok: true, count };
}

/** Hard delete (ADR 0025): Deliveries, Call Outcomes and interactions cascade with the rows. */
export function deleteGuestRecords(
  supabase: SupabaseClient,
  eventId: string,
  ids: readonly string[],
): Promise<BulkWriteResult> {
  return eachChunk(ids, (chunk) =>
    supabase
      .from('guests')
      .delete({ count: 'exact' })
      .eq('event_id', eventId)
      .in('id', chunk),
  );
}

export type RsvpAuthor = { userId: string; displayName: string | null };

/**
 * Sets the RSVP on every record whose status actually changes, attributed to
 * the Owner as a manual change - the same attribution a single edit gets.
 * Declining ends Table Assignments in the database trigger (ADR 0008); the
 * count and Special Meals a Guest gave are left as they are.
 */
export function setGuestsRsvp(
  supabase: SupabaseClient,
  eventId: string,
  ids: readonly string[],
  status: RsvpStatus,
  author: RsvpAuthor,
): Promise<BulkWriteResult> {
  const patch = {
    rsvp_status: status,
    rsvp_changed_by: author.userId,
    rsvp_changed_by_name: author.displayName,
    rsvp_changed_at: new Date().toISOString(),
    rsvp_change_source: 'manual',
  };
  return eachChunk(ids, (chunk) =>
    supabase
      .from('guests')
      .update(patch, { count: 'exact' })
      .eq('event_id', eventId)
      .neq('rsvp_status', status)
      .in('id', chunk),
  );
}

/** `null` takes the records out of any group. */
export function setGuestsGroup(
  supabase: SupabaseClient,
  eventId: string,
  ids: readonly string[],
  groupId: string | null,
): Promise<BulkWriteResult> {
  return eachChunk(ids, (chunk) =>
    supabase
      .from('guests')
      .update({ group_id: groupId }, { count: 'exact' })
      .eq('event_id', eventId)
      .in('id', chunk),
  );
}

export function setGuestsSide(
  supabase: SupabaseClient,
  eventId: string,
  ids: readonly string[],
  side: GroupSide | null,
): Promise<BulkWriteResult> {
  return eachChunk(ids, (chunk) =>
    supabase
      .from('guests')
      .update({ side }, { count: 'exact' })
      .eq('event_id', eventId)
      .in('id', chunk),
  );
}
