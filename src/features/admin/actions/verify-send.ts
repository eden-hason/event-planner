'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { sendSchedule } from '@/features/schedules/services/send-schedule';
import { gateScheduleForSend } from '../services/schedule-send-gate';
import { buildSendPlan } from '../services/schedule-send-plan';
import type { SchedulePlan } from '../services/schedule-send-plan';

export type {
  SchedulePlan as VerifySendPlan,
  PlanRecipient as VerifySendRecipient,
} from '../services/schedule-send-plan';

export type VerifySendPlanResult =
  | { ok: true; plan: SchedulePlan }
  | { ok: false; message: string };

export type VerifySendStepResult = {
  success: boolean;
  message: string;
  /** The plan as it stands after this guest, so the dialog's counters stay true */
  plan?: SchedulePlan;
};

/**
 * The queue a verified run walks: the same one the batch send uses.
 *
 * Recomputed from `message_deliveries` on every call, so a run closed halfway
 * through reopens on the first guest who has not been sent to rather than
 * starting the list again.
 */
export async function getVerifySendPlan(
  scheduleId: string,
): Promise<VerifySendPlanResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const gate = await gateScheduleForSend(supabase, scheduleId);
    if (!gate.ok) return gate;
    if (gate.gate.status === 'cancelled') {
      return { ok: false, message: 'This message was cancelled by the owner' };
    }
    return { ok: true, plan: await buildSendPlan(supabase, scheduleId, gate.gate) };
  } catch (error) {
    console.error('getVerifySendPlan failed:', error);
    return { ok: false, message: 'Could not work out who is left to send to' };
  }
}

/**
 * Sends one message to one guest as a step in a verified run.
 *
 * Distinct from quick send, which is indifferent to the schedule's status
 * because it is rescuing a single guest on the phone. This is a walk through
 * the whole audience, so the same claim the batch send makes applies with more
 * force: a run is minutes or hours of real time, and a schedule left at
 * `status IS NULL` past its date would be picked up mid-run by the cron, which
 * sends the entire remainder in one blast. That would not only undo the pacing,
 * it would put other messages through the WhatsApp account inside the window the
 * Operator is attributing to this guest - the exact attribution the run exists
 * to establish. So the first successful step claims the schedule, and the cron
 * cannot touch it again.
 *
 * The engine still gets `markSentOnSuccess: false`: the claim is made here, once,
 * rather than letting every step push `sent_at` forward.
 */
export async function sendVerifySendStep(
  scheduleId: string,
  guestId: string,
): Promise<VerifySendStepResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const gate = await gateScheduleForSend(supabase, scheduleId);
    if (!gate.ok) return { success: false, message: gate.message };
    if (gate.gate.status === 'cancelled') {
      return { success: false, message: 'This message was cancelled by the owner' };
    }

    const before = await buildSendPlan(supabase, scheduleId, gate.gate);
    const recipient = before.remaining.find((waiting) => waiting.id === guestId);
    // A guest id from another event, from outside the target audience, or one
    // that picked up a delivery while the run sat open on this step.
    if (!recipient) {
      return {
        success: false,
        message: 'That guest is no longer waiting for this message',
        plan: before,
      };
    }

    const outcome = await sendSchedule(scheduleId, {
      supabase,
      triggeredBy: 'manual',
      claim: 'none',
      guestIds: [guestId],
      markSentOnSuccess: false,
      // Belt and braces against a double click: the engine drops a guest who
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
        console.error('sendVerifySendStep could not mark the schedule sent:', claimError);
      } else {
        after.status = 'sent';
      }
    }

    revalidateOutreach(gate.gate.eventId);

    if (outcome.sentCount === 0) {
      return {
        success: false,
        message:
          outcome.message === 'No guests with valid phone numbers'
            ? `${recipient.name} has no usable phone number`
            : outcome.message,
        plan: after,
      };
    }

    return { success: true, message: `Sent to ${recipient.name}`, plan: after };
  } catch (error) {
    console.error('sendVerifySendStep failed:', error);
    return { success: false, message: 'Failed to send the message' };
  }
}
