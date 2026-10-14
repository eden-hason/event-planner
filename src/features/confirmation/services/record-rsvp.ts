import type { SupabaseClient } from '@supabase/supabase-js';
import type { MealCounts } from '../utils/meal-counts';
import { continuesAnswer, type RsvpInteractionType } from '../utils/answer-run';

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
  /** The transportation answer; null clears it back to unanswered. */
  needsTransportation?: boolean | null;
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
  if (input.needsTransportation !== undefined) {
    update.needs_transportation = input.needsTransportation;
  }

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
  // against a Schedule - it is what the Owner's per-Schedule funnel reads. A
  // write that continues the latest answer updates it in place, so one
  // conversation leaves one answer, timed at its last step (see answer-run).
  if (input.scheduleId && (guest.rsvp_status === 'confirmed' || guest.rsvp_status === 'declined')) {
    const confirmed = guest.rsvp_status === 'confirmed';
    const interactionType: RsvpInteractionType = confirmed ? 'rsvp_confirm' : 'rsvp_decline';
    const metadata = {
      channel: input.channel,
      ...(confirmed && { guestCount: guest.amount, mealCounts: guest.meal_counts }),
    };
    const now = new Date();

    const { data: latest, error: latestError } = await supabase
      .from('guest_interactions')
      .select('id, interaction_type, created_at, metadata')
      .eq('guest_id', input.guestId)
      .eq('schedule_id', input.scheduleId)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      console.error('[record-rsvp] Could not read the latest interaction:', latestError);
      return { ok: false, message: 'שגיאה בשמירת התגובה' };
    }

    const continues = continuesAnswer(
      latest && {
        interactionType: latest.interaction_type as RsvpInteractionType,
        channel: (latest.metadata as { channel?: string } | null)?.channel ?? null,
        at: latest.created_at as string,
      },
      { interactionType, channel: input.channel, at: now },
    );

    const { error: interactionError } =
      latest && continues
        ? await supabase
            .from('guest_interactions')
            .update({ metadata, created_at: now.toISOString() })
            .eq('id', latest.id)
        : await supabase.from('guest_interactions').insert({
            guest_id: input.guestId,
            schedule_id: input.scheduleId,
            interaction_type: interactionType,
            metadata,
            created_at: now.toISOString(),
          });
    if (interactionError) {
      console.error('[record-rsvp] Could not record the interaction:', interactionError);
      return { ok: false, message: 'שגיאה בשמירת התגובה' };
    }
  }

  return { ok: true };
}
