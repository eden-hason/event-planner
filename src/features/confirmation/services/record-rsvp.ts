import type { SupabaseClient } from '@supabase/supabase-js';
import type { MealCounts } from '../utils/meal-counts';

/**
 * Writes a Guest's own RSVP answer - the one path both the RSVP page and the
 * Confirmation Conversation go through, so an answer means the same thing
 * whichever way it arrived. A decline ends the Guest Record's Table Assignment
 * in the database (ADR 0008), so that side effect follows either way too.
 *
 * The source stays `guest` for both: the Owner sees a guest's answer, not the
 * channel it came through. The channel is kept on the interaction for
 * Operators.
 *
 * Takes its client as a parameter (service role - the caller has already
 * resolved the Guest from a token) and assumes the caller normalised the meal
 * counts against the amount.
 */

export type RsvpChannel = 'page' | 'whatsapp';

export type RecordRsvpInput = {
  guestId: string;
  /** The Schedule the answer belongs to, when it came through one. */
  scheduleId: string | null;
  rsvpStatus?: 'confirmed' | 'declined';
  amount?: number;
  mealCounts?: MealCounts;
  /** Replaces guest_notes. */
  guestNotes?: string;
  channel: RsvpChannel;
};

export type RecordRsvpResult = { ok: true } | { ok: false; message: string };

export async function recordGuestRsvp(
  supabase: SupabaseClient,
  input: RecordRsvpInput,
): Promise<RecordRsvpResult> {
  const update: Record<string, unknown> = {};

  if (input.rsvpStatus) {
    update.rsvp_status = input.rsvpStatus;
    update.rsvp_changed_by = null;
    update.rsvp_changed_by_name = null;
    update.rsvp_changed_at = new Date().toISOString();
    update.rsvp_change_source = 'guest';
  }
  if (input.amount !== undefined) update.amount = input.amount;
  if (input.mealCounts !== undefined) update.meal_counts = input.mealCounts;
  // Guest-authored text lands in guest_notes - notes belongs to the host.
  if (input.guestNotes !== undefined) update.guest_notes = input.guestNotes;

  if (Object.keys(update).length === 0) return { ok: true };

  const { data: guest, error } = await supabase
    .from('guests')
    .update(update)
    .eq('id', input.guestId)
    .select('rsvp_status, amount, meal_counts')
    .single();

  if (error || !guest) {
    console.error('[record-rsvp] Could not update guest:', error);
    return { ok: false, message: 'שגיאה בעדכון פרטי האורח' };
  }

  // The interaction is a snapshot of the answer as it now stands, recorded only
  // against a Schedule - it is what the Owner's per-Schedule funnel reads.
  if (input.scheduleId && (guest.rsvp_status === 'confirmed' || guest.rsvp_status === 'declined')) {
    const confirmed = guest.rsvp_status === 'confirmed';
    const { error: interactionError } = await supabase.from('guest_interactions').insert({
      guest_id: input.guestId,
      schedule_id: input.scheduleId,
      interaction_type: confirmed ? 'rsvp_confirm' : 'rsvp_decline',
      metadata: {
        channel: input.channel,
        ...(confirmed && { guestCount: guest.amount, mealCounts: guest.meal_counts }),
      },
    });
    if (interactionError) {
      console.error('[record-rsvp] Could not record the interaction:', interactionError);
      return { ok: false, message: 'שגיאה בשמירת התגובה' };
    }
  }

  return { ok: true };
}
