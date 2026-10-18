'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { sendingConfig } from '@/lib/config/sending';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import {
  sendSelectedDeliveries,
  type ManualSendOutcome,
} from '@/features/schedules/services/manual-send';
import { buildLateGuestPlan, type LateGuestPlan, type LateGuestPlanResult } from '../services/late-guest-plan';

export type { LateGuestPlan, LateGuestPlanResult } from '../services/late-guest-plan';
export type { LateGuestCandidate, LateGuestExcluded } from '../utils/late-guests';

export type LateGuestSendResult = ManualSendOutcome & {
  /** The plan after the send, so the dialog shows who is left */
  plan?: LateGuestPlan;
};

/**
 * Who a sent Schedule can still reach - guests added since, mostly - and who
 * it cannot, with the reason. Fetched when the Operator picks a Schedule.
 */
export async function getLateGuestPlan(scheduleId: string): Promise<LateGuestPlanResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    return await buildLateGuestPlan(supabase, scheduleId);
  } catch (error) {
    console.error('getLateGuestPlan failed:', error);
    return { ok: false, message: 'לא הצלחנו לחשב למי עוד אפשר לשלוח' };
  }
}

/**
 * Sends a sent Schedule, now, to up to ten guest records it never reached.
 *
 * The dialog's choice is a request, not a list to trust: eligibility is
 * recomputed here, and a picked guest who was reached in the meantime is
 * dropped and counted rather than sent a second message. The send itself is
 * the existing manual path - same renderer, same package gate, same scoped
 * claim (ADR 0014) - so this adds a safe audience, not new send machinery.
 * The cap is the manual path's own (ADR 0013), refused rather than truncated.
 */
export async function sendToLateGuests(
  scheduleId: string,
  guestIds: string[],
): Promise<LateGuestSendResult> {
  await assertAdmin();
  const supabase = createServiceClient();
  const { maxManualRecipients } = sendingConfig();
  const empty = { sentCount: 0, failedCount: 0, skippedCount: 0 };

  const selected = [...new Set(guestIds)];
  if (selected.length === 0) {
    return { success: false, message: 'צריך לבחור לפחות אורח אחד', ...empty };
  }
  if (selected.length > maxManualRecipients) {
    return {
      success: false,
      message: `אפשר לבחור עד ${maxManualRecipients} רשומות אורחים בכל שליחה`,
      ...empty,
    };
  }

  try {
    const before = await buildLateGuestPlan(supabase, scheduleId);
    if (!before.ok) return { success: false, message: before.message, ...empty };

    const eligible = new Set(before.plan.eligible.map((guest) => guest.id));
    const chosen = selected.filter((id) => eligible.has(id));
    const dropped = selected.length - chosen.length;
    if (chosen.length === 0) {
      return {
        success: false,
        message: 'האורחים שנבחרו כבר לא ממתינים להודעה הזו - הרשימה עודכנה',
        ...empty,
        skippedCount: dropped,
        plan: before.plan,
      };
    }

    const outcome = await sendSelectedDeliveries(supabase, scheduleId, chosen);
    revalidateOutreach(before.plan.eventId);

    const after = await buildLateGuestPlan(supabase, scheduleId);
    return {
      ...outcome,
      message: dropped ? `${outcome.message}, ${dropped} כבר לא ממתינים ודולגו` : outcome.message,
      skippedCount: outcome.skippedCount + dropped,
      plan: after.ok ? after.plan : undefined,
    };
  } catch (error) {
    console.error('sendToLateGuests failed:', error);
    return { success: false, message: 'השליחה נכשלה', ...empty };
  }
}
