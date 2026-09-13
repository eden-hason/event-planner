import type { SupabaseClient } from '@supabase/supabase-js';
import { generateConfirmationToken } from '../utils';

/**
 * The Delivery (message_deliveries) is one row per guest per schedule and owns
 * the guest's RSVP token for that schedule. Sends never write its status - that
 * is rolled up from message_delivery_attempts in the database (ADR 0011). What
 * a send does write is covered here: making sure the row exists before the
 * message goes out, and recording guests no attempt could be made for.
 */

export type ReservedDelivery = { id: string; confirmationToken: string };

const IN_CHUNK = 200;

function chunks<T>(items: T[], size = IN_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function selectDeliveries(
  supabase: SupabaseClient,
  scheduleId: string,
  guestIds: string[],
) {
  const rows: { id: string; guest_id: string; confirmation_token: string | null }[] = [];
  for (const batch of chunks(guestIds)) {
    const { data, error } = await supabase
      .from('message_deliveries')
      .select('id, guest_id, confirmation_token')
      .eq('schedule_id', scheduleId)
      .in('guest_id', batch);
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

/**
 * Ensures a delivery row with an RSVP token exists for every guest, and returns
 * them by guest id.
 *
 * Done before sending, not after, because the token goes inside the message. A
 * guest who already has a delivery for this schedule - a resend, a cron resume
 * - keeps their token, so the link in the message they already have keeps
 * working. The insert ignores conflicts, so a concurrent send that reserved the
 * row first wins and both read back the same token.
 */
export async function reserveDeliveries(
  supabase: SupabaseClient,
  scheduleId: string,
  guestIds: string[],
  triggeredBy: 'scheduled' | 'manual',
): Promise<Map<string, ReservedDelivery>> {
  if (guestIds.length === 0) return new Map();

  const existing = await selectDeliveries(supabase, scheduleId, guestIds);
  const known = new Set(existing.map((row) => row.guest_id));

  const missing = guestIds.filter((id) => !known.has(id));
  for (const batch of chunks(missing)) {
    const { error } = await supabase.from('message_deliveries').upsert(
      batch.map((guestId) => ({
        schedule_id: scheduleId,
        guest_id: guestId,
        confirmation_token: generateConfirmationToken(),
        triggered_by: triggeredBy,
      })),
      { onConflict: 'schedule_id,guest_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  // A guest recorded as not sent (no phone at the time) has a row but no token.
  // Rare, so one guarded update each is fine.
  for (const row of existing.filter((r) => !r.confirmation_token)) {
    const { error } = await supabase
      .from('message_deliveries')
      .update({ confirmation_token: generateConfirmationToken() })
      .eq('id', row.id)
      .is('confirmation_token', null);
    if (error) throw error;
  }

  const reserved = new Map<string, ReservedDelivery>();
  for (const row of await selectDeliveries(supabase, scheduleId, guestIds)) {
    if (row.confirmation_token) {
      reserved.set(row.guest_id, { id: row.id, confirmationToken: row.confirmation_token });
    }
  }
  return reserved;
}

/**
 * Records guests who were in the audience but could not be attempted (no usable
 * phone number) as not sent. Never touches a guest who already has a delivery
 * for this schedule - an earlier attempt is a stronger fact than today's
 * missing number.
 */
export async function recordNotSent(
  supabase: SupabaseClient,
  scheduleId: string,
  guestIds: string[],
  triggeredBy: 'scheduled' | 'manual',
): Promise<void> {
  for (const batch of chunks(guestIds)) {
    const { error } = await supabase.from('message_deliveries').upsert(
      batch.map((guestId) => ({
        schedule_id: scheduleId,
        guest_id: guestId,
        status: 'not_sent',
        triggered_by: triggeredBy,
      })),
      { onConflict: 'schedule_id,guest_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  }
}
