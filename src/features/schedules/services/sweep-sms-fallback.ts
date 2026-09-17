import type { SupabaseClient } from '@supabase/supabase-js';
import { sendSmsFallback } from './send-sms-fallback';
import { classifyWhatsAppFailure } from '../utils/whatsapp-failures';
import { sendingConfig } from '@/lib/config/sending';

/**
 * The automatic half of the SMS Fallback (ADR 0016).
 *
 * ADR 0012 shipped the manual half and left the trigger for later, expecting it
 * to "evaluate a Schedule's failures together after a settle window" and call
 * the same batch. This is that trigger, and it calls `sendSmsFallback`
 * completely unchanged - the Back Office button and the sweeper run the same
 * engine, which is what keeps the button working as the override.
 *
 * "Finished failing" is judged on queue state rather than the clock: no
 * Delivery still queued, no attempt still pending, and no attempt activity for
 * the settle window. The first two conditions make the window self-adjusting -
 * a Schedule midway through the retry ladder simply is not ready - and the
 * settle minutes only cover webhook lag, which has been at most 122 seconds
 * across every failure observed.
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

/** Schedules that have at least one failed Delivery and might be ready. */
async function candidateScheduleIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('message_deliveries')
    .select('schedule_id')
    .eq('status', 'failed')
    .limit(2_000);
  if (error) throw error;
  return [...new Set((data ?? []).map((row: { schedule_id: string }) => row.schedule_id))];
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
  const lastActivityAt = attempts.reduce<string | null>((latest, attempt) => {
    const stamp = attempt.updated_at > attempt.created_at ? attempt.updated_at : attempt.created_at;
    return latest === null || stamp > latest ? stamp : latest;
  }, null);

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

  const whatsAppAttempts = attempts.filter((a) => a.channel === 'whatsapp');
  const guestLevelFailures = whatsAppAttempts.filter(
    (a) => a.status === 'failed' && classifyWhatsAppFailure(a.error_code) === 'guest',
  ).length;

  const freeze = freezeDecision({
    totalAttempts: whatsAppAttempts.length,
    guestLevelFailures,
    freezePct: config.smsFallbackFreezePct,
    freezeMin: config.smsFallbackFreezeMin,
  });
  if (freeze.frozen) {
    console.warn(`[sms-fallback-sweep] Frozen for schedule ${scheduleId}: ${freeze.reason}`);
    return { ...nothing, outcome: 'frozen', reason: freeze.reason };
  }

  // The engine recomputes eligibility itself and claims each Delivery before
  // its SMS goes out, so this is safe to call even if the sweep overlaps with
  // an Operator pressing the button.
  const outcome = await sendSmsFallback(supabase, scheduleId, {
    limit: MAX_RECIPIENTS_PER_SCHEDULE,
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
    candidates = await candidateScheduleIds(supabase);
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
