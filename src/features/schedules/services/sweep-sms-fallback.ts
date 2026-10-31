import type { SupabaseClient } from '@supabase/supabase-js';
import {
  classifySmsFallbackCandidates,
  sendSmsFallback,
  stuckSentAtRange,
  stuckWindow,
  type FallbackDeliveryRow,
  type SmsFallbackExclusionReason,
  type StuckWindow,
} from './send-sms-fallback';
import { classifyWhatsAppFailure } from '../utils/whatsapp-failures';
import { sendingConfig } from '@/lib/config/sending';

/**
 * The automatic half of the SMS Fallback (ADR 0016), for failed deliveries and
 * Stuck WhatsApps alike - the engine decides which deliveries qualify.
 *
 * ADR 0012 shipped the manual half and left the trigger for later, expecting it
 * to "evaluate a Schedule's failures together after a settle window" and call
 * the same batch. This is that trigger, and it calls `sendSmsFallback`
 * completely unchanged - the Back Office button and the sweeper run the same
 * engine, which is what keeps the button working as the override.
 *
 * "Finished failing" is judged on queue state rather than the clock: no
 * Delivery still queued, no attempt still pending, and no attempt made or
 * failed for the settle window (receipts do not count, see
 * `lastFailureActivityAt`). The first two conditions make the window
 * self-adjusting - a Schedule midway through the retry ladder simply is not
 * ready - and the settle minutes only cover webhook lag, which has been at
 * most 122 seconds across every failure observed.
 */

const MAX_SCHEDULES_PER_SWEEP = 5;
const MAX_RECIPIENTS_PER_SCHEDULE = 200;

export type FallbackSweepOutcome =
  | 'sent'
  | 'not_settled'
  | 'frozen'
  | 'nothing_eligible'
  | 'failed';

export type FallbackSweepResult = {
  scheduleId: string;
  outcome: FallbackSweepOutcome;
  reason: string | null;
  sentCount: number;
};

/**
 * The Fallback Freeze.
 *
 * A template outage or an expired token produces codes outside
 * GUEST_LEVEL_CODES, so `classifyWhatsAppFailure` already excludes them and the
 * scenario ADR 0012 feared is handled. What is not handled is a systemic
 * problem *wearing* a guest-level code: 131049 and 130472 are both WhatsApp
 * deciding something about Kululu's account rather than about one Guest, and
 * both can spike across a whole audience.
 *
 * This is a cost-and-awareness control, not a correctness one. Those Guests
 * genuinely did not receive the WhatsApp and SMS would genuinely reach them;
 * what the Freeze prevents is Kululu spending unplanned money automatically at
 * the moment its WhatsApp account is in trouble, when fixing the account and
 * resending for free may be the better remedy.
 *
 * Pure, so the thresholds can be reasoned about without a database.
 */
export function freezeDecision(params: {
  totalAttempts: number;
  guestLevelFailures: number;
  freezePct: number;
  freezeMin: number;
}): { frozen: boolean; reason: string | null } {
  const { totalAttempts, guestLevelFailures, freezePct, freezeMin } = params;

  // The floor comes first and is absolute: it stops a five-guest test Event
  // freezing over two failures, which would otherwise be 40%.
  if (guestLevelFailures < freezeMin) return { frozen: false, reason: null };
  if (totalAttempts <= 0) return { frozen: false, reason: null };

  const rate = (guestLevelFailures / totalAttempts) * 100;
  if (rate <= freezePct) return { frozen: false, reason: null };

  return {
    frozen: true,
    reason: `${guestLevelFailures} of ${totalAttempts} attempts failed at guest level (${rate.toFixed(0)}%), above the ${freezePct}% freeze threshold - check the WhatsApp account before sending SMS`,
  };
}

/**
 * The Freeze for one Schedule's attempts, with the configured thresholds. The
 * sweeper and the results screen both ask this, so the screen never promises
 * an SMS the sweeper is withholding.
 */
export function scheduleFreeze(
  attempts: Pick<AttemptRow, 'channel' | 'status' | 'error_code'>[],
): { frozen: boolean; reason: string | null } {
  const config = sendingConfig();
  const whatsAppAttempts = attempts.filter((a) => a.channel === 'whatsapp');
  return freezeDecision({
    totalAttempts: whatsAppAttempts.length,
    guestLevelFailures: whatsAppAttempts.filter(
      (a) => a.status === 'failed' && classifyWhatsAppFailure(a.error_code) === 'guest',
    ).length,
    freezePct: config.smsFallbackFreezePct,
    freezeMin: config.smsFallbackFreezeMin,
  });
}

type AttemptRow = {
  delivery_id: string;
  status: string;
  channel: string;
  error_code: number | null;
  created_at: string;
  updated_at: string;
};

/**
 * Whether a Schedule has stopped producing new outcomes.
 *
 * Deliberately not "is it old enough": a Schedule whose retries are still
 * laddering out is not settled however long ago it was dispatched.
 */
export function settleDecision(params: {
  queuedDeliveries: number;
  pendingAttempts: number;
  lastActivityAt: string | null;
  settleMinutes: number;
  now: Date;
}): { settled: boolean; reason: string | null } {
  const { queuedDeliveries, pendingAttempts, lastActivityAt, settleMinutes, now } = params;

  if (queuedDeliveries > 0) {
    return { settled: false, reason: `${queuedDeliveries} delivery(ies) still queued` };
  }
  if (pendingAttempts > 0) {
    return { settled: false, reason: `${pendingAttempts} attempt(s) still in flight` };
  }
  if (!lastActivityAt) {
    return { settled: false, reason: 'No attempt activity to settle on' };
  }

  const quietFor = now.getTime() - Date.parse(lastActivityAt);
  if (quietFor < settleMinutes * 60_000) {
    const minutes = Math.floor(quietFor / 60_000);
    return {
      settled: false,
      reason: `Last attempt activity was ${minutes} minute(s) ago, inside the ${settleMinutes} minute settle window`,
    };
  }

  return { settled: true, reason: null };
}

/**
 * The last moment a Schedule's attempts did something that could still change
 * who the Fallback should reach: an attempt being made, or one failing.
 *
 * Delivered and read receipts are deliberately left out. They also bump an
 * attempt's `updated_at`, and on a real audience they trickle in for hours as
 * guests open the message - counting them kept restarting the settle window,
 * so a busy Schedule never went quiet long enough to fall back. A receipt can
 * only ever say a message arrived, never that one failed, so it has nothing
 * to settle.
 *
 * A failed attempt is not written to again, so its `updated_at` is when the
 * failure landed.
 */
export function lastFailureActivityAt(
  attempts: Pick<AttemptRow, 'status' | 'created_at' | 'updated_at'>[],
): string | null {
  let latest: string | null = null;
  for (const attempt of attempts) {
    const failing = attempt.status === 'failed' || attempt.status === 'pending';
    const stamp =
      failing && attempt.updated_at > attempt.created_at ? attempt.updated_at : attempt.created_at;
    if (latest === null || stamp > latest) latest = stamp;
  }
  return latest;
}

type StuckCandidateRow = {
  message_deliveries: {
    schedule_id: string;
    message_delivery_attempts: { channel: string }[];
  };
};

export type FailedCandidateRow = FallbackDeliveryRow & {
  schedule_id: string;
  updated_at: string;
};

/**
 * Why the engine leaves a failed Delivery out that no later sweep can change:
 * an SMS was already tried (the sweeper never retries one, ADR 0038 - this is
 * also every Delivery of a Schedule sent by SMS in the first place), there is
 * no failed WhatsApp to fall back from, the failure was system-level, or the
 * number is from abroad and SMS is Israeli-only. A missing phone is not on the
 * list - an Owner can still fix the number.
 */
const SETTLED_EXCLUSIONS: SmsFallbackExclusionReason[] = [
  'already_sms',
  'not_whatsapp',
  'system_failure',
  'not_israeli',
];

/**
 * The Schedules worth a slot for their failed Deliveries, newest failure first.
 *
 * A failed Delivery stays failed forever, and most of them can never fall
 * back. Asking the engine's own classifier leaves those out, so a Schedule only
 * takes a slot while it has a Delivery the engine might still send to. On
 * 2026-10-15 five old SMS Schedules held every slot on every sweep, and a
 * WhatsApp Schedule with two fresh guest-level failures was never looked at.
 *
 * The Stuck window's ceiling bounds failures too, and newest first keeps
 * anything the classifier cannot rule out (no SMS version of the template, a
 * Freeze) from crowding out fresh work. A Delivery's `updated_at` is when it
 * last changed, which for a failed one is when it failed.
 */
export function failedCandidateScheduleIds(
  rows: FailedCandidateRow[],
  window: StuckWindow,
): string[] {
  const since = stuckSentAtRange(window).from.getTime();
  const ids: string[] = [];
  const newestFirst = rows
    .filter((row) => Date.parse(row.updated_at) >= since)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  for (const row of newestFirst) {
    if (ids.includes(row.schedule_id)) continue;
    const { eligible, excluded } = classifySmsFallbackCandidates([row], window);
    const open =
      eligible.length > 0 || excluded.some((e) => !SETTLED_EXCLUSIONS.includes(e.exclusion));
    if (open) ids.push(row.schedule_id);
  }
  return ids;
}

/**
 * Schedules that might be ready: those with a Stuck WhatsApp (accepted inside
 * the Stuck window, still Sent) and those with a failed Delivery the engine
 * would still send to (see `failedCandidateScheduleIds`). Both newest first.
 *
 * An Event under an SMS Fallback Opt-out is left out of both here, in the
 * query: the engine would refuse it anyway, and a Schedule it refuses must not
 * hold one of the per-sweep slots.
 */
async function candidateScheduleIds(supabase: SupabaseClient, now: Date): Promise<string[]> {
  const window = stuckWindow(now);
  const { from, to } = stuckSentAtRange(window);

  const [stuck, failed] = await Promise.all([
    supabase
      .from('message_delivery_attempts')
      .select(
        'message_deliveries!inner(schedule_id, message_delivery_attempts(channel), schedules!inner(events!inner(sms_fallback_enabled)))',
      )
      .eq('message_deliveries.schedules.events.sms_fallback_enabled', true)
      .eq('channel', 'whatsapp')
      .eq('status', 'sent')
      .eq('message_deliveries.status', 'sent')
      .gte('sent_at', from.toISOString())
      .lte('sent_at', to.toISOString())
      .order('sent_at', { ascending: false })
      .limit(2_000),
    supabase
      .from('message_deliveries')
      .select(
        'id, schedule_id, status, guest_id, confirmation_token, updated_at, guests(name, phone_number), message_delivery_attempts(channel, status, error_code, error_message, sent_at, created_at), schedules!inner(events!inner(sms_fallback_enabled))',
      )
      .eq('schedules.events.sms_fallback_enabled', true)
      .eq('status', 'failed')
      .gte('updated_at', from.toISOString())
      .order('updated_at', { ascending: false })
      .limit(2_000),
  ]);
  if (stuck.error) throw stuck.error;
  if (failed.error) throw failed.error;

  // A stuck delivery the Fallback already sent to can stay Sent - its SMS may
  // be unconfirmed or failed - and would match for the rest of the window.
  // Leaving it out keeps handled schedules from taking the per-sweep slots.
  const stuckIds = ((stuck.data ?? []) as unknown as StuckCandidateRow[])
    .map((row) => row.message_deliveries)
    .filter((delivery) => !delivery.message_delivery_attempts.some((a) => a.channel === 'sms'))
    .map((delivery) => delivery.schedule_id);

  const failedIds = failedCandidateScheduleIds(
    (failed.data ?? []) as unknown as FailedCandidateRow[],
    window,
  );

  return [...new Set([...stuckIds, ...failedIds])];
}

async function evaluateSchedule(
  supabase: SupabaseClient,
  scheduleId: string,
  now: Date,
): Promise<FallbackSweepResult> {
  const config = sendingConfig();
  const nothing = { scheduleId, sentCount: 0 };

  const { count: queuedDeliveries, error: queuedError } = await supabase
    .from('message_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('schedule_id', scheduleId)
    .not('next_attempt_at', 'is', null);
  if (queuedError) throw queuedError;

  const { data: deliveryRows, error: deliveryError } = await supabase
    .from('message_deliveries')
    .select('id')
    .eq('schedule_id', scheduleId);
  if (deliveryError) throw deliveryError;
  const deliveryIds = (deliveryRows ?? []).map((row: { id: string }) => row.id);
  if (deliveryIds.length === 0) {
    return { ...nothing, outcome: 'nothing_eligible', reason: 'No deliveries' };
  }

  const { data: attemptRows, error: attemptError } = await supabase
    .from('message_delivery_attempts')
    .select('delivery_id, status, channel, error_code, created_at, updated_at')
    .in('delivery_id', deliveryIds);
  if (attemptError) throw attemptError;
  const attempts = (attemptRows ?? []) as AttemptRow[];

  const pendingAttempts = attempts.filter((a) => a.status === 'pending').length;
  const lastActivityAt = lastFailureActivityAt(attempts);

  const settle = settleDecision({
    queuedDeliveries: queuedDeliveries ?? 0,
    pendingAttempts,
    lastActivityAt,
    settleMinutes: config.smsFallbackSettleMinutes,
    now,
  });
  if (!settle.settled) {
    return { ...nothing, outcome: 'not_settled', reason: settle.reason };
  }

  const freeze = scheduleFreeze(attempts);
  if (freeze.frozen) {
    console.warn(`[sms-fallback-sweep] Frozen for schedule ${scheduleId}: ${freeze.reason}`);
    return { ...nothing, outcome: 'frozen', reason: freeze.reason };
  }

  // The engine recomputes eligibility itself and claims each Delivery before
  // its SMS goes out, so this is safe to call even if the sweep overlaps with
  // an Operator pressing the button.
  const outcome = await sendSmsFallback(supabase, scheduleId, {
    limit: MAX_RECIPIENTS_PER_SCHEDULE,
    triggeredBy: 'fallback_auto',
  });

  if (outcome.sentCount === 0) {
    return { ...nothing, outcome: 'nothing_eligible', reason: outcome.message };
  }
  return {
    scheduleId,
    outcome: 'sent',
    reason: outcome.message,
    sentCount: outcome.sentCount,
  };
}

export async function sweepSmsFallback(
  supabase: SupabaseClient,
  options: { now?: Date } = {},
): Promise<{ considered: number; sent: number; results: FallbackSweepResult[] }> {
  const now = options.now ?? new Date();
  const results: FallbackSweepResult[] = [];

  let candidates: string[];
  try {
    candidates = await candidateScheduleIds(supabase, now);
  } catch (error) {
    console.error('[sms-fallback-sweep] Could not find candidates:', error);
    return { considered: 0, sent: 0, results };
  }

  let sent = 0;
  for (const scheduleId of candidates.slice(0, MAX_SCHEDULES_PER_SWEEP)) {
    try {
      const result = await evaluateSchedule(supabase, scheduleId, now);
      results.push(result);
      sent += result.sentCount;
    } catch (error) {
      results.push({
        scheduleId,
        outcome: 'failed',
        reason: error instanceof Error ? error.message : 'Fallback sweep failed',
        sentCount: 0,
      });
    }
  }

  for (const result of results) {
    console.log(
      `[sms-fallback-sweep] ${result.scheduleId}: ${result.outcome}` +
        (result.reason ? ` - ${result.reason}` : ''),
    );
  }

  return { considered: results.length, sent, results };
}
