'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { sendSchedule } from '@/features/schedules/services/send-schedule';
import { gateScheduleForSend } from '../services/schedule-send-gate';
import { buildSendPlan } from '../services/schedule-send-plan';
import type { SchedulePlan } from '../services/schedule-send-plan';
import { MAX_BATCH_SIZE } from '../utils/batch-send';

/**
 * The plan shape lives in `services/schedule-send-plan` now that the verified
 * one-by-one send walks the same queue. Re-exported under the names the batch
 * dialog already imports.
 */
export type {
  SchedulePlan as BatchSendPlan,
  PlanRecipient as BatchSendRecipient,
} from '../services/schedule-send-plan';

export type BatchSendPlanResult =
  | { ok: true; plan: SchedulePlan }
  | { ok: false; message: string };

export type BatchSendResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  /** The plan as it stands after the batch, so the dialog can go straight into the next one */
  plan?: SchedulePlan;
};

/**
 * What is left to send, and to whom.
 *
 * Fetched when the dialog opens rather than shipped with the page: a full guest
 * list on every workspace render is a large RSC payload nobody asked for, and
 * the numbers go stale the moment a batch lands anyway.
 */
export async function getBatchSendPlan(scheduleId: string): Promise<BatchSendPlanResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const gate = await gateScheduleForSend(supabase, scheduleId);
    if (!gate.ok) return gate;
    return { ok: true, plan: await buildSendPlan(supabase, scheduleId, gate.gate) };
  } catch (error) {
    console.error('getBatchSendPlan failed:', error);
    return { ok: false, message: 'Could not work out who is left to send to' };
  }
}

/**
 * Sends one message to part of its audience, now.
 *
 * The case is a WhatsApp sending limit that will not carry the whole list in
 * one go: the Operator sends a few hundred, waits out the window, and comes
 * back for the rest. Every batch writes the same `message_deliveries` rows and
 * confirmation tokens a single send would have, so the owner's schedule page
 * fills in as the batches land rather than all at once at the end.
 *
 * The first successful batch marks the schedule sent. That is a claim on the
 * row rather than a statement that everyone has it: a schedule left at
 * `status IS NULL` past its date is picked up by the cron, which would send the
 * entire remainder in one blast and undo the pacing this feature exists to
 * provide. `schedule_completion_status` has only `sent` and `cancelled`, so
 * there is no third state to park it in. The dialog says as much, and both it
 * and the outreach timeline show how much of the audience is still waiting.
 */
export async function sendScheduleBatch(
  scheduleId: string,
  guestIds: string[],
): Promise<BatchSendResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  const selected = [...new Set(guestIds)];
  if (!selected.length) {
    return { success: false, message: 'Select at least one guest' };
  }
  if (selected.length > MAX_BATCH_SIZE) {
    return {
      success: false,
      message: `A batch can carry at most ${MAX_BATCH_SIZE} guests`,
    };
  }

  try {
    const gate = await gateScheduleForSend(supabase, scheduleId);
    if (!gate.ok) return { success: false, message: gate.message };
    if (gate.gate.status === 'cancelled') {
      return { success: false, message: 'This message was cancelled by the owner' };
    }

    const before = await buildSendPlan(supabase, scheduleId, gate.gate);
    const queued = new Set(before.remaining.map((recipient) => recipient.id));
    // A guest id from another event, from outside the target audience, or one
    // that was already delivered while the dialog sat open. Refusing the whole
    // batch is right: the Operator picked a list, and silently sending a
    // different one is worse than making them re-pick.
    if (selected.some((id) => !queued.has(id))) {
      return {
        success: false,
        message: 'Some selected guests are no longer waiting for this message - reload and pick again',
      };
    }

    const outcome = await sendSchedule(scheduleId, {
      supabase,
      triggeredBy: 'manual',
      claim: 'none',
      guestIds: selected,
      // The batch decides when the schedule closes out, below - the engine
      // would otherwise mark it sent on the first batch and move `sent_at`
      // forward on every one after it.
      markSentOnSuccess: false,
      // Belt and braces against a double submit: the engine drops anyone who
      // already has a successful delivery for this schedule.
      skipAlreadyDelivered: true,
    });

    const after = await buildSendPlan(supabase, scheduleId, gate.gate);

    if (outcome.sentCount > 0 && gate.gate.status === null) {
      const { error: claimError } = await supabase
        .from('schedules')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', scheduleId)
        .is('status', null);
      if (claimError) {
        console.error('sendScheduleBatch could not mark the schedule sent:', claimError);
      } else {
        after.status = 'sent';
      }
    }

    revalidateOutreach(gate.gate.eventId);

    if (!outcome.success) {
      return { success: false, message: outcome.message, plan: after };
    }

    const sent = outcome.sentCount;
    // The engine reports success having sent nothing when every guest in the
    // batch picked up a delivery between the plan being built and the send -
    // a second Operator working the same list. Say so rather than claiming a
    // batch of zero went out.
    if (sent === 0) {
      return { success: false, message: outcome.message, plan: after };
    }
    const left = after.remaining.length;
    return {
      success: true,
      message: left
        ? `Sent to ${sent} ${sent === 1 ? 'guest' : 'guests'} - ${left} still to go`
        : `Sent to ${sent} ${sent === 1 ? 'guest' : 'guests'} - everyone has now received this message`,
      sentCount: outcome.sentCount,
      failedCount: outcome.failedCount,
      plan: after,
    };
  } catch (error) {
    console.error('sendScheduleBatch failed:', error);
    return { success: false, message: 'Failed to send the batch' };
  }
}
