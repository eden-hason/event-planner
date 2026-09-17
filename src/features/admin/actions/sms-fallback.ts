'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import {
  buildSmsFallbackPlan,
  sendSmsFallback,
  type SmsFallbackOutcome,
  type SmsFallbackPlan,
} from '@/features/schedules/services/send-sms-fallback';
import { gateScheduleForSend } from '../services/schedule-send-gate';
import { MAX_BATCH_SIZE } from '../utils/sms-fallback';

export type {
  SmsFallbackPlan,
  SmsFallbackRecipient,
} from '@/features/schedules/services/send-sms-fallback';

export type SmsFallbackPlanResult =
  | { ok: true; plan: SmsFallbackPlan }
  | { ok: false; message: string };

export type SmsFallbackResult = SmsFallbackOutcome & {
  /** The plan after the batch, so the dialog shows what is left */
  plan?: SmsFallbackPlan;
};

/**
 * Who a schedule's SMS Fallback would reach, who it leaves out and why, and the
 * SMS itself. Fetched when the dialog opens, like the batch send plan.
 */
export async function getSmsFallbackPlan(scheduleId: string): Promise<SmsFallbackPlanResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const gate = await gateScheduleForSend(supabase, scheduleId);
    if (!gate.ok) return gate;
    return { ok: true, plan: await buildSmsFallbackPlan(supabase, scheduleId) };
  } catch (error) {
    console.error('getSmsFallbackPlan failed:', error);
    return { ok: false, message: 'Could not work out who can fall back to SMS' };
  }
}

/**
 * Sends the SMS Fallback for a schedule, now, to every eligible delivery up to
 * one batch. Eligibility is recomputed server-side rather than taken from the
 * dialog: the Operator confirms a count, and anyone already handled in the
 * meantime is simply not in it any more. See ADR 0012.
 */
export async function launchSmsFallback(scheduleId: string): Promise<SmsFallbackResult> {
  await assertAdmin();
  const supabase = createServiceClient();
  const empty = { sentCount: 0, failedCount: 0, skippedCount: 0 };

  try {
    const gate = await gateScheduleForSend(supabase, scheduleId);
    if (!gate.ok) return { success: false, message: gate.message, ...empty };

    const outcome = await sendSmsFallback(supabase, scheduleId, { limit: MAX_BATCH_SIZE });
    revalidateOutreach(gate.gate.eventId);
    return { ...outcome, plan: await buildSmsFallbackPlan(supabase, scheduleId) };
  } catch (error) {
    console.error('launchSmsFallback failed:', error);
    return { success: false, message: 'SMS fallback failed', ...empty };
  }
}
