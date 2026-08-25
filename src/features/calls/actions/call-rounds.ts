'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';

export type StartCallRoundResult = {
  success: boolean;
  message: string;
  roundId?: string;
  eventId?: string;
};

export type DeleteCallRoundResult = { success: boolean; message: string };

/**
 * Starts a planned round: claims the plan and snapshots its audience.
 *
 * The claim is an optimistic `status IS NULL -> 'sent'` update rather than a
 * read-then-write, so two Operators clicking Start at the same moment cannot
 * both get a round - one of them updates zero rows and is told so. The partial
 * unique index `call_rounds_schedule_id_key` is the backstop underneath it.
 *
 * `sent_at` is written explicitly rather than left to the
 * auto_set_schedule_sent_at trigger: that trigger tests `OLD.status != 'sent'`,
 * which is NULL rather than true when the old status is NULL, so it never fires
 * on exactly this transition.
 */
export async function startCallRound(scheduleId: string): Promise<StartCallRoundResult> {
  const operatorId = await assertAdmin();
  const supabase = createServiceClient();

  try {
    const { data: plan, error: planError } = await supabase
      .from('schedules')
      .select('id, event_id, target_status, status, schedule_types!inner(execution_kind)')
      .eq('id', scheduleId)
      .single();

    if (planError || !plan) {
      return { success: false, message: 'That plan no longer exists' };
    }

    const type = (
      Array.isArray(plan.schedule_types) ? plan.schedule_types[0] : plan.schedule_types
    ) as { execution_kind: string } | null;

    if (type?.execution_kind !== 'phone_call') {
      return { success: false, message: 'That schedule is not a call round' };
    }
    if (plan.status === 'cancelled') {
      return { success: false, message: 'That plan was cancelled' };
    }

    const { data: claimed, error: claimError } = await supabase
      .from('schedules')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', scheduleId)
      .is('status', null)
      .select('id')
      .maybeSingle();

    if (claimError) {
      console.error('Failed to claim call plan:', claimError);
      return { success: false, message: 'Failed to start the round' };
    }
    if (!claimed) {
      return { success: false, message: 'That round was already started' };
    }

    // The audience is the plan's own target_status, never a hardcoded
    // 'pending'. A seating round targets confirmed records and snapshotting
    // pending ones would call the wrong half of the guest list.
    let guestsQuery = supabase.from('guests').select('id').eq('event_id', plan.event_id);
    if (plan.target_status) {
      guestsQuery = guestsQuery.eq('rsvp_status', plan.target_status);
    }
    const { data: guests, error: guestsError } = await guestsQuery;

    if (guestsError) {
      await releasePlan(supabase, scheduleId);
      console.error('Failed to read the round audience:', guestsError);
      return { success: false, message: 'Failed to start the round' };
    }

    const { data: round, error: roundError } = await supabase
      .from('call_rounds')
      .insert({
        event_id: plan.event_id,
        schedule_id: scheduleId,
        started_by: operatorId,
        completed_at: null,
      })
      .select('id')
      .single();

    if (roundError || !round) {
      await releasePlan(supabase, scheduleId);
      console.error('Failed to create the round:', roundError);
      return { success: false, message: 'Failed to start the round' };
    }

    if (guests?.length) {
      const { error: logsError } = await supabase.from('call_logs').insert(
        guests.map((guest) => ({ round_id: round.id, guest_id: guest.id })),
      );
      if (logsError) {
        // The round exists but has no roster, which is worse than no round at
        // all - it would sit "in progress" with nothing to call.
        await supabase.from('call_rounds').delete().eq('id', round.id);
        await releasePlan(supabase, scheduleId);
        console.error('Failed to snapshot the round audience:', logsError);
        return { success: false, message: 'Failed to start the round' };
      }
    }

    revalidateOutreach(plan.event_id);

    return {
      success: true,
      message: `Round started with ${guests?.length ?? 0} ${guests?.length === 1 ? 'guest record' : 'guest records'}`,
      roundId: round.id,
      eventId: plan.event_id,
    };
  } catch (error) {
    console.error('startCallRound failed:', error);
    return { success: false, message: 'Failed to start the round' };
  }
}

/**
 * Deletes a round and returns its plan to `status = NULL`, so the plan stays
 * restartable rather than frozen as a phantom send. This exists purely to undo
 * a misclick on Start, which is why Start is a separate confirmed act.
 *
 * Releasing a claimed plan is only possible because
 * `prevent_sent_schedule_mutation` was narrowed to message schedules in
 * migration 20260814000000 - a sent message really is immutable, a claimed call
 * plan is not.
 */
export async function deleteCallRound(roundId: string): Promise<DeleteCallRoundResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const { data: round, error: roundError } = await supabase
      .from('call_rounds')
      .select('id, event_id, schedule_id')
      .eq('id', roundId)
      .single();

    if (roundError || !round) {
      return { success: false, message: 'That round no longer exists' };
    }

    // call_logs cascade on the round's delete.
    const { error: deleteError } = await supabase
      .from('call_rounds')
      .delete()
      .eq('id', roundId);

    if (deleteError) {
      console.error('Failed to delete the round:', deleteError);
      return { success: false, message: 'Failed to delete the round' };
    }

    if (round.schedule_id) await releasePlan(supabase, round.schedule_id);

    revalidateOutreach(round.event_id);
    return { success: true, message: 'Round deleted, the plan is restartable' };
  } catch (error) {
    console.error('deleteCallRound failed:', error);
    return { success: false, message: 'Failed to delete the round' };
  }
}

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Returns a claimed plan to unstarted. Never call this on a message schedule. */
async function releasePlan(supabase: ServiceClient, scheduleId: string) {
  const { error } = await supabase
    .from('schedules')
    .update({ status: null, sent_at: null })
    .eq('id', scheduleId);

  if (error) console.error('Failed to release call plan:', error);
}

/**
 * Round Completion is a deliberate act, never derived. A round with unreachable
 * guests would otherwise sit in progress forever, and deriving completion from
 * "every log has an outcome" would mark a round done that nobody finished.
 */
export async function finishCallRound(roundId: string): Promise<DeleteCallRoundResult> {
  return setRoundCompletion(roundId, new Date().toISOString(), 'Round finished');
}

/** Reopens a finished round, because finishing early is an easy mistake to make. */
export async function reopenCallRound(roundId: string): Promise<DeleteCallRoundResult> {
  return setRoundCompletion(roundId, null, 'Round reopened');
}

async function setRoundCompletion(
  roundId: string,
  completedAt: string | null,
  message: string,
): Promise<DeleteCallRoundResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const { data: round, error } = await supabase
      .from('call_rounds')
      .update({ completed_at: completedAt, updated_at: new Date().toISOString() })
      .eq('id', roundId)
      .select('event_id')
      .maybeSingle();

    if (error || !round) {
      console.error('Failed to change round completion:', error);
      return { success: false, message: 'Failed to update the round' };
    }

    revalidateOutreach(round.event_id);
    return { success: true, message };
  } catch (error) {
    console.error('setRoundCompletion failed:', error);
    return { success: false, message: 'Failed to update the round' };
  }
}
