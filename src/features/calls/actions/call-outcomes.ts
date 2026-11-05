'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { CALL_OUTCOMES, type CallOutcome } from '../types';
import { callTransportationRefusal } from '../utils/transportation';

export type CallOutcomeResult = { success: boolean; message: string };

/**
 * Records what happened on one call, and propagates it to the guest's RSVP.
 *
 * Only `confirmed` and `declined` move `rsvp_status`. `no_answer` is a fact
 * about the call, not about the guest's intention: writing it through would
 * silently reclassify a guest who has not actually decided.
 *
 * Clearing an outcome (passing null) deliberately does **not** revert the RSVP.
 * The guest really did say yes on the phone; undoing the operator's bookkeeping
 * is not the same as the guest changing their mind.
 */
export async function recordCallOutcome(input: {
  roundId: string;
  guestId: string;
  eventId: string;
  outcome: CallOutcome | null;
  amount?: number;
}): Promise<CallOutcomeResult> {
  const operatorId = await assertAdmin();
  const supabase = createServiceClient();

  if (input.outcome !== null && !CALL_OUTCOMES.includes(input.outcome)) {
    return { success: false, message: 'זו לא תוצאת שיחה' };
  }

  try {
    const now = new Date().toISOString();

    const { error: logError } = await supabase
      .from('call_logs')
      .update({
        outcome: input.outcome,
        called_by: input.outcome ? operatorId : null,
        called_at: input.outcome ? now : null,
        updated_at: now,
      })
      .eq('round_id', input.roundId)
      .eq('guest_id', input.guestId);

    if (logError) {
      console.error('Failed to record call outcome:', logError);
      return { success: false, message: 'שמירת התוצאה נכשלה' };
    }

    if (input.outcome === 'confirmed' || input.outcome === 'declined') {
      const { data: operator } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', operatorId)
        .single();

      const guestUpdate: Record<string, unknown> = {
        rsvp_status: input.outcome,
        rsvp_change_source: 'admin_call',
        rsvp_changed_by: operatorId,
        rsvp_changed_by_name: operator?.full_name ?? operator?.email ?? 'Operator',
        rsvp_changed_at: now,
        updated_at: now,
      };

      // Headcount only lands on confirm, and only when the caller learned one.
      // A record covers a whole family, so this is the number the couple plans
      // against - it is not a count of records.
      if (input.outcome === 'confirmed' && input.amount !== undefined && input.amount >= 1) {
        guestUpdate.amount = input.amount;
      }

      // A Guest Record that declines goes back to unanswered on the
      // Transportation Question, as it does in the Confirmation Conversation.
      if (input.outcome === 'declined') {
        guestUpdate.needs_transportation = null;
      }

      const { error: guestError } = await supabase
        .from('guests')
        .update(guestUpdate)
        .eq('id', input.guestId);

      if (guestError) {
        console.error('Failed to propagate RSVP:', guestError);
        return { success: false, message: 'התוצאה נשמרה אבל אישור ההגעה לא התעדכן' };
      }
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'התוצאה נשמרה' };
  } catch (error) {
    console.error('recordCallOutcome failed:', error);
    return { success: false, message: 'שמירת התוצאה נכשלה' };
  }
}

/**
 * Notes are host-visible: the couple reads them in their own app. This is
 * deliberate and dates from 2026-08-17, so nothing here treats them as operator
 * scratch space.
 */
export async function saveCallNote(input: {
  roundId: string;
  guestId: string;
  eventId: string;
  notes: string;
}): Promise<CallOutcomeResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const trimmed = input.notes.trim();

    const { error } = await supabase
      .from('call_logs')
      .update({ notes: trimmed || null, updated_at: new Date().toISOString() })
      .eq('round_id', input.roundId)
      .eq('guest_id', input.guestId);

    if (error) {
      console.error('Failed to save call note:', error);
      return { success: false, message: 'שמירת ההערה נכשלה' };
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'ההערה נשמרה' };
  } catch (error) {
    console.error('saveCallNote failed:', error);
    return { success: false, message: 'שמירת ההערה נכשלה' };
  }
}

/**
 * Records the answer to the Event's Transportation Question that the caller
 * heard on the phone: yes, no, or null to clear it back to unanswered.
 *
 * Writes the Guest Record's own answer, the same column the Confirmation
 * Conversation and the RSVP page write, so the Owner's guest list counts it
 * like any other. Scoped to a record in this round, and only while the Event
 * asks the question and the record is confirmed (see Transportation Question).
 */
export async function saveCallTransportation(input: {
  roundId: string;
  guestId: string;
  eventId: string;
  needsTransportation: boolean | null;
}): Promise<CallOutcomeResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const { data: log, error: logError } = await supabase
      .from('call_logs')
      .select('guests!inner(rsvp_status, event_id, events!inner(guests_experience))')
      .eq('round_id', input.roundId)
      .eq('guest_id', input.guestId)
      .maybeSingle();

    if (logError) {
      console.error('Failed to read the call log for transportation:', logError);
      return { success: false, message: 'שמירת ההסעה נכשלה' };
    }

    const guest = log?.guests as unknown as {
      rsvp_status: string | null;
      event_id: string;
      events: { guests_experience: { ask_transportation?: boolean } | null } | null;
    } | null;

    if (!guest || guest.event_id !== input.eventId) {
      return { success: false, message: 'הרשומה לא נמצאה בסבב' };
    }

    const refusal = callTransportationRefusal({
      asked: guest.events?.guests_experience?.ask_transportation ?? false,
      rsvpStatus: guest.rsvp_status,
      value: input.needsTransportation,
    });
    if (refusal) return { success: false, message: refusal };

    const { error } = await supabase
      .from('guests')
      .update({
        needs_transportation: input.needsTransportation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.guestId);

    if (error) {
      console.error('Failed to save call transportation:', error);
      return { success: false, message: 'שמירת ההסעה נכשלה' };
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'ההסעה נשמרה' };
  } catch (error) {
    console.error('saveCallTransportation failed:', error);
    return { success: false, message: 'שמירת ההסעה נכשלה' };
  }
}
