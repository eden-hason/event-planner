'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { CallOutcome } from '../types';

/**
 * Refreshes both places a call round is visible.
 *
 * The Owner's schedules page shows call rounds too, so an admin action that
 * only revalidated the back office would leave the Owner looking at stale work.
 * The Owner route is a dynamic segment under a route group, so it is
 * revalidated by its path pattern with the 'page' type - a literal '/app'
 * matches no route in this app and quietly does nothing.
 */
function revalidateCallSurfaces(eventId: string) {
  revalidatePath(`/admin/events/${eventId}/calls`);
  revalidatePath('/[locale]/app/[eventId]/schedules', 'page');
}

export type StartCallRoundResult = {
  success: boolean;
  message: string;
  roundId?: string;
  count?: number;
};

/**
 * Executes a planned call round: claims the plan and snapshots the guests it
 * targets into `call_logs`.
 *
 * Takes the plan rather than the event because a round is no longer invented on
 * the spot - the Owner scheduled it. The claim is an optimistic
 * `status IS NULL -> 'sent'` update, so two admins hitting Start at once cannot
 * both win, and the audience comes from the plan's `target_status` instead of
 * the hardcoded 'pending' this used to assume. See docs/adr/0004.
 */
export async function startCallRound(
  scheduleId: string,
  eventId: string,
): Promise<StartCallRoundResult> {
  try {
    const adminId = await assertAdmin();
    const supabase = createServiceClient();

    const { data: plan, error: planError } = await supabase
      .from('schedules')
      .select('id, event_id, target_status, status, schedule_types!inner (execution_kind)')
      .eq('id', scheduleId)
      .single();

    if (planError || !plan) {
      return { success: false, message: 'Call plan not found' };
    }

    const executionKind = (
      Array.isArray(plan.schedule_types) ? plan.schedule_types[0] : plan.schedule_types
    )?.execution_kind;

    if (executionKind !== 'phone_call') {
      return { success: false, message: 'That schedule is not a call round' };
    }

    if (plan.status === 'cancelled') {
      return { success: false, message: 'This call round was cancelled' };
    }

    // Claim the plan before doing any work. A lost race means another admin is
    // already running this round, which is a no-op rather than an error.
    //
    // sent_at is set here rather than left to the auto_set_schedule_sent_at
    // trigger: that trigger tests `OLD.status != 'sent'`, which is NULL - not
    // true - when the old status is NULL, so it never fires on exactly this
    // transition. sendSchedule passes sent_at explicitly for the same reason.
    const { data: claimed, error: claimError } = await supabase
      .from('schedules')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', scheduleId)
      .is('status', null)
      .select('id')
      .single();

    if (claimError || !claimed) {
      return { success: false, message: 'This round has already been started' };
    }

    // Undo the claim so Start works again once whatever went wrong is fixed.
    const releasePlan = async () => {
      await supabase
        .from('schedules')
        .update({ status: null, sent_at: null })
        .eq('id', scheduleId);
    };

    const { data: round, error: roundError } = await supabase
      .from('call_rounds')
      .insert({
        event_id: eventId,
        schedule_id: scheduleId,
        // Deprecated - the plan's date orders and names the round now.
        round_number: null,
        started_by: adminId,
      })
      .select('id')
      .single();

    if (roundError || !round) {
      await releasePlan();
      return { success: false, message: 'Failed to create call round' };
    }

    let guestsQuery = supabase.from('guests').select('id').eq('event_id', eventId);
    if (plan.target_status) {
      guestsQuery = guestsQuery.eq('rsvp_status', plan.target_status);
    }
    const { data: targetGuests } = await guestsQuery;

    if (!targetGuests || targetGuests.length === 0) {
      await supabase.from('call_rounds').delete().eq('id', round.id);
      await releasePlan();
      return { success: false, message: 'No guests to call for this round' };
    }

    const logs = targetGuests.map((g) => ({ round_id: round.id, guest_id: g.id }));
    const { error: logsError } = await supabase.from('call_logs').insert(logs);

    if (logsError) {
      await supabase.from('call_rounds').delete().eq('id', round.id);
      await releasePlan();
      return { success: false, message: 'Failed to snapshot guests' };
    }

    revalidateCallSurfaces(eventId);

    return {
      success: true,
      message: `Round started with ${targetGuests.length} guest${targetGuests.length !== 1 ? 's' : ''}`,
      roundId: round.id,
      count: targetGuests.length,
    };
  } catch {
    return { success: false, message: 'Failed to start call round' };
  }
}

export type FinishCallRoundResult = {
  success: boolean;
  message: string;
};

/**
 * Declares a round over. Explicit rather than derived from the logs: a round
 * that ends with guests still on no_answer is genuinely finished - the team
 * stopped calling - and deriving completion would leave it showing "in
 * progress" on the Owner's schedules page forever.
 */
export async function finishCallRound(
  roundId: string,
  eventId: string,
): Promise<FinishCallRoundResult> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('call_rounds')
      .update({ completed_at: now, updated_at: now })
      .eq('id', roundId);

    if (error) {
      return { success: false, message: 'Failed to finish round' };
    }

    revalidateCallSurfaces(eventId);
    return { success: true, message: 'Round finished' };
  } catch {
    return { success: false, message: 'Failed to finish round' };
  }
}

export async function reopenCallRound(
  roundId: string,
  eventId: string,
): Promise<FinishCallRoundResult> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('call_rounds')
      .update({ completed_at: null, updated_at: new Date().toISOString() })
      .eq('id', roundId);

    if (error) {
      return { success: false, message: 'Failed to reopen round' };
    }

    revalidateCallSurfaces(eventId);
    return { success: true, message: 'Round reopened' };
  } catch {
    return { success: false, message: 'Failed to reopen round' };
  }
}

export type DeleteCallRoundResult = {
  success: boolean;
  message: string;
};

export async function deleteCallRound(roundId: string, eventId: string): Promise<DeleteCallRoundResult> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();

    // Deletion exists to undo a misclick, not to rewrite history. Once an
    // outcome is recorded the Owner may already have seen the round on their
    // schedules page, and making it vanish is the opposite of observability.
    const { count, error: countError } = await supabase
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId)
      .not('outcome', 'is', null);

    if (countError) {
      return { success: false, message: 'Failed to delete round' };
    }

    if ((count ?? 0) > 0) {
      return {
        success: false,
        message: 'This round has recorded outcomes - finish it instead of deleting it',
      };
    }

    // Read the plan before the round goes, so the claim can be released after.
    const { data: round } = await supabase
      .from('call_rounds')
      .select('schedule_id')
      .eq('id', roundId)
      .single();

    const { error } = await supabase.from('call_rounds').delete().eq('id', roundId);

    if (error) {
      return { success: false, message: 'Failed to delete round' };
    }

    // Undoing the round undoes the Start that created it, so the plan goes back
    // to planned and can be started again. Leaving it 'sent' with no round
    // would be dead work nobody could pick up.
    if (round?.schedule_id) {
      await supabase
        .from('schedules')
        .update({ status: null, sent_at: null })
        .eq('id', round.schedule_id);
    }

    revalidateCallSurfaces(eventId);
    return { success: true, message: 'Round deleted' };
  } catch {
    return { success: false, message: 'Failed to delete round' };
  }
}

export type RecordCallOutcomeResult = {
  success: boolean;
  message: string;
};

export async function recordCallOutcome({
  logId,
  guestId,
  eventId,
  outcome,
  notes,
  amount,
}: {
  logId: string;
  guestId: string;
  eventId: string;
  outcome: CallOutcome;
  notes?: string;
  amount?: number;
}): Promise<RecordCallOutcomeResult> {
  try {
    const adminId = await assertAdmin();
    const supabase = createServiceClient();

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', adminId)
      .single();

    const adminName = adminProfile?.full_name ?? adminProfile?.email ?? 'Admin';
    const now = new Date().toISOString();

    const { error: logError } = await supabase
      .from('call_logs')
      .update({ outcome, notes: notes ?? null, called_by: adminId, called_at: now, updated_at: now })
      .eq('id', logId);

    if (logError) {
      return { success: false, message: 'Failed to save outcome' };
    }

    if (outcome === 'confirmed' || outcome === 'declined') {
      const guestUpdate: Record<string, unknown> = {
        rsvp_status: outcome,
        rsvp_change_source: 'admin_call',
        rsvp_changed_by: adminId,
        rsvp_changed_by_name: adminName,
        rsvp_changed_at: now,
        updated_at: now,
      };
      if (outcome === 'confirmed' && amount !== undefined && amount >= 1) {
        guestUpdate.amount = amount;
      }

      const { error: guestError } = await supabase
        .from('guests')
        .update(guestUpdate)
        .eq('id', guestId);

      if (guestError) {
        return { success: false, message: 'Outcome saved but failed to update RSVP' };
      }
    }

    revalidateCallSurfaces(eventId);

    return { success: true, message: 'Outcome saved' };
  } catch {
    return { success: false, message: 'Failed to record outcome' };
  }
}

export type CallPlanMutationResult = {
  success: boolean;
  message: string;
  scheduleId?: string;
};

/**
 * Plans a new call round on an event.
 *
 * The setup wizard is the Owner's only creation path and it renders only from
 * the schedules page empty state, so an event that already has schedules could
 * never acquire a call plan without this. It is also the path used to add call
 * rounds to events that predate the feature.
 */
export async function createCallPlan(
  eventId: string,
  {
    scheduledDate,
    scheduledTime,
    targetStatus,
  }: {
    scheduledDate: string;
    scheduledTime: string;
    targetStatus: 'pending' | 'confirmed';
  },
): Promise<CallPlanMutationResult> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const { data: type, error: typeError } = await supabase
      .from('schedule_types')
      .select('id')
      .eq('key', 'phone_call')
      .single();

    if (typeError || !type) {
      return { success: false, message: 'Call round schedule type is missing' };
    }

    const { data: plan, error } = await supabase
      .from('schedules')
      .insert({
        event_id: eventId,
        schedule_type_id: type.id,
        // A call round has nothing to send.
        template_id: null,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        target_status: targetStatus,
        status: null,
      })
      .select('id')
      .single();

    if (error || !plan) {
      return { success: false, message: 'Failed to plan call round' };
    }

    revalidateCallSurfaces(eventId);
    return { success: true, message: 'Call round planned', scheduleId: plan.id };
  } catch {
    return { success: false, message: 'Failed to plan call round' };
  }
}

/**
 * Moves a planned call round to a different date.
 *
 * Only the back office can do this - the Owner is blocked by a restrictive RLS
 * policy - so a date picked wrongly in the wizard is still correctable. Refuses
 * once the round has started, because the date then describes something that
 * already happened.
 */
export async function rescheduleCallPlan(
  scheduleId: string,
  eventId: string,
  { scheduledDate, scheduledTime }: { scheduledDate: string; scheduledTime: string },
): Promise<CallPlanMutationResult> {
  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const { data: plan, error: planError } = await supabase
      .from('schedules')
      .select('id, status, schedule_types!inner (execution_kind)')
      .eq('id', scheduleId)
      .single();

    if (planError || !plan) {
      return { success: false, message: 'Call plan not found' };
    }

    const executionKind = (
      Array.isArray(plan.schedule_types) ? plan.schedule_types[0] : plan.schedule_types
    )?.execution_kind;

    if (executionKind !== 'phone_call') {
      return { success: false, message: 'That schedule is not a call round' };
    }

    if (plan.status === 'sent') {
      return {
        success: false,
        message: 'This round has already started - delete it to plan a new date',
      };
    }

    const { error } = await supabase
      .from('schedules')
      .update({ scheduled_date: scheduledDate, scheduled_time: scheduledTime })
      .eq('id', scheduleId);

    if (error) {
      return { success: false, message: 'Failed to reschedule call round' };
    }

    revalidateCallSurfaces(eventId);
    return { success: true, message: 'Call round rescheduled', scheduleId };
  } catch {
    return { success: false, message: 'Failed to reschedule call round' };
  }
}
