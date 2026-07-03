'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { CallOutcome } from '../types';

export type StartCallRoundResult = {
  success: boolean;
  message: string;
  roundId?: string;
  count?: number;
  roundNumber?: number;
};

export async function startCallRound(eventId: string): Promise<StartCallRoundResult> {
  try {
    const adminId = await assertAdmin();
    const supabase = createServiceClient();

    const { data: existingRounds } = await supabase
      .from('call_rounds')
      .select('round_number')
      .eq('event_id', eventId)
      .order('round_number', { ascending: false })
      .limit(1);

    const nextRoundNumber = (existingRounds?.[0]?.round_number ?? 0) + 1;

    const { data: round, error: roundError } = await supabase
      .from('call_rounds')
      .insert({ event_id: eventId, round_number: nextRoundNumber, started_by: adminId })
      .select('id')
      .single();

    if (roundError || !round) {
      return { success: false, message: 'Failed to create call round' };
    }

    const { data: pendingGuests } = await supabase
      .from('guests')
      .select('id')
      .eq('event_id', eventId)
      .eq('rsvp_status', 'pending');

    if (!pendingGuests || pendingGuests.length === 0) {
      await supabase.from('call_rounds').delete().eq('id', round.id);
      return { success: false, message: 'No pending guests to call' };
    }

    const logs = pendingGuests.map((g) => ({ round_id: round.id, guest_id: g.id }));
    const { error: logsError } = await supabase.from('call_logs').insert(logs);

    if (logsError) {
      await supabase.from('call_rounds').delete().eq('id', round.id);
      return { success: false, message: 'Failed to snapshot guests' };
    }

    revalidatePath(`/admin/events/${eventId}/calls`);

    return {
      success: true,
      message: `Round ${nextRoundNumber} started with ${pendingGuests.length} guest${pendingGuests.length !== 1 ? 's' : ''}`,
      roundId: round.id,
      count: pendingGuests.length,
      roundNumber: nextRoundNumber,
    };
  } catch {
    return { success: false, message: 'Failed to start call round' };
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

    const { error } = await supabase.from('call_rounds').delete().eq('id', roundId);

    if (error) {
      return { success: false, message: 'Failed to delete round' };
    }

    revalidatePath(`/admin/events/${eventId}/calls`);
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

    revalidatePath(`/admin/events/${eventId}/calls`);

    return { success: true, message: 'Outcome saved' };
  } catch {
    return { success: false, message: 'Failed to record outcome' };
  }
}
