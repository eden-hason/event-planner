import type { SupabaseClient } from '@supabase/supabase-js';
import { DAY_MS, isDue, isTooLate, OWNER_MESSAGE_MAX_LATENESS_HOURS, postEventDueAt } from '../utils/due';
import type { OwnerMessageKind } from '../types';
import { deliverOwnerMessage } from './send-owner-message';

const TAG = '[owner-messages]';

/** At most this many sends per pass, so one pass stays well inside the cron's budget. */
const BATCH = 50;

/**
 * How far back the Post-event pass looks. The note is due one or two days after
 * the Event and expires 48 hours later, so an Event older than this can only
 * ever be expired - and it already was, on an earlier pass.
 */
const POST_EVENT_LOOKBACK_DAYS = 2 + OWNER_MESSAGE_MAX_LATENESS_HOURS / 24 + 1;

type OwnerMessageSweepResult = { sent: number; failed: number; expired: number };

/**
 * The automatic Owner Messages (ADR 0039), run by the Sweeper.
 *
 *   - **Welcome**: the billing trigger queues it as `pending` on the Event's
 *     first payment. This sends it at once - no Send Window, the Owner has just
 *     paid - unless it is over 48 hours late.
 *   - **Post-event**: never queued, because the Event date can still move. Each
 *     pass works out, for every recent paid Event, whether the note is due, and
 *     claims it then. A `canceled` Event is not `paid`, so it gets nothing.
 *
 * Every send is claimed before it is made (`claim_owner_message`), so two passes
 * at once, or a pass and the payment's own nudge, send it once.
 *
 * `eventId` narrows the Welcome pass to one Event - the nudge a payment gives so
 * the Welcome does not wait for the next pass.
 */
export async function sweepOwnerMessages(
  supabase: SupabaseClient,
  options: { now?: Date; eventId?: string } = {},
): Promise<OwnerMessageSweepResult> {
  const now = options.now ?? new Date();
  const result: OwnerMessageSweepResult = { sent: 0, failed: 0, expired: 0 };

  await sweepWelcomes(supabase, now, options.eventId, result);
  if (!options.eventId) await sweepPostEvent(supabase, now, result);

  return result;
}

async function sweepWelcomes(
  supabase: SupabaseClient,
  now: Date,
  eventId: string | undefined,
  result: OwnerMessageSweepResult,
): Promise<void> {
  let query = supabase
    .from('owner_messages')
    .select('event_id, due_at')
    .eq('status', 'pending')
    .eq('kind', 'welcome')
    .lte('due_at', now.toISOString())
    .order('due_at')
    .limit(BATCH);
  if (eventId) query = query.eq('event_id', eventId);

  const { data, error } = await query;
  if (error) {
    console.error(`${TAG} Could not read pending welcomes:`, error);
    return;
  }

  for (const row of data ?? []) {
    await claimAndSend(supabase, row.event_id as string, 'welcome', row.due_at as string, now, result);
  }
}

async function sweepPostEvent(
  supabase: SupabaseClient,
  now: Date,
  result: OwnerMessageSweepResult,
): Promise<void> {
  const since = new Date(now.getTime() - POST_EVENT_LOOKBACK_DAYS * DAY_MS);
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('billing_status', 'paid')
    .eq('status', 'published')
    .gte('event_date', since.toISOString())
    .lte('event_date', now.toISOString());
  if (error) {
    console.error(`${TAG} Could not read recent paid events:`, error);
    return;
  }

  const candidates = (events ?? []).flatMap((event) => {
    const dueAt = postEventDueAt(event.event_date as string | null);
    return dueAt && isDue(dueAt, now) ? [{ eventId: event.id as string, dueAt }] : [];
  });
  if (candidates.length === 0) return;

  // Skips the claim call for every Event already handled, which is nearly all of
  // them on any given pass.
  const { data: done, error: doneError } = await supabase
    .from('owner_messages')
    .select('event_id')
    .eq('kind', 'post_event')
    .is('sent_by', null)
    .in('event_id', candidates.map((c) => c.eventId));
  if (doneError) {
    console.error(`${TAG} Could not read sent post-event notes:`, doneError);
    return;
  }
  const handled = new Set((done ?? []).map((row) => row.event_id as string));

  for (const candidate of candidates.filter((c) => !handled.has(c.eventId)).slice(0, BATCH)) {
    await claimAndSend(supabase, candidate.eventId, 'post_event', candidate.dueAt, now, result);
  }
}

async function claimAndSend(
  supabase: SupabaseClient,
  eventId: string,
  kind: OwnerMessageKind,
  dueAt: string,
  now: Date,
  result: OwnerMessageSweepResult,
): Promise<void> {
  const tooLate = isTooLate(dueAt, now);
  const { data: id, error } = await supabase.rpc('claim_owner_message', {
    p_event_id: eventId,
    p_kind: kind,
    p_due_at: dueAt,
    p_status: tooLate ? 'expired' : 'sending',
  });
  if (error) {
    console.error(`${TAG} Could not claim ${kind} for ${eventId}:`, error);
    return;
  }
  // Someone else claimed it first, or it was already sent or expired.
  if (!id) return;

  if (tooLate) {
    console.warn(`${TAG} ${kind} for ${eventId} expired: due ${dueAt}, more than ${OWNER_MESSAGE_MAX_LATENESS_HOURS} hours ago`);
    result.expired++;
    return;
  }

  const sent = await deliverOwnerMessage(supabase, { id: id as string, eventId, kind });
  if (sent.success) result.sent++;
  else result.failed++;
}
