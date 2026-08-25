'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { CALL_OUTCOMES, type CallOutcome } from '../types';

export type CallOutcomeResult = { success: boolean; message: string };

/**
 * Records what happened on one call, and propagates it to the guest's RSVP.
 *
 * Only `confirmed` and `declined` move `rsvp_status` - `no_answer` is a fact
 * about the call, not about the guest's intention, and writing it through would
 * silently reclassify someone who simply did not pick up.
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
    return { success: false, message: 'That is not a call outcome' };
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
      return { success: false, message: 'Failed to save the outcome' };
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

      const { error: guestError } = await supabase
        .from('guests')
        .update(guestUpdate)
        .eq('id', input.guestId);

      if (guestError) {
        console.error('Failed to propagate RSVP:', guestError);
        return { success: false, message: 'Outcome saved but the RSVP did not update' };
      }
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'Outcome saved' };
  } catch (error) {
    console.error('recordCallOutcome failed:', error);
    return { success: false, message: 'Failed to save the outcome' };
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
      return { success: false, message: 'Failed to save the note' };
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'Note saved' };
  } catch (error) {
    console.error('saveCallNote failed:', error);
    return { success: false, message: 'Failed to save the note' };
  }
}
