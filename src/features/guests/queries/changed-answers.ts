import { getEffectiveClient } from '@/lib/supabase/admin';
import { pageAll } from '@/lib/supabase/row-cap';
import type { RsvpSnapshot } from '@/features/guests/utils/changed-answers';

type SnapshotRow = {
  guest_id: string;
  interaction_type: 'rsvp_confirm' | 'rsvp_decline';
  metadata: { channel?: string; guestCount?: number; guest_count?: number } | null;
  created_at: string;
};

/**
 * The RSVP snapshots behind the "changed their answer" filter: every answer a
 * Guest Record left whose RSVP is still its own. The records themselves are
 * the page's own guest list - `findChangedAnswers` runs over both - so they are
 * not read a second time. Read through RLS as the viewer, so every Owner of the
 * Event gets the same set (migration 20261107000000 opened `guest_interactions`
 * to every Owner, not only the creator). `null` when the read fails: the filter
 * then has nothing to offer, and the page still loads.
 */
export async function getChangedAnswerSnapshots(
  eventId: string,
): Promise<RsvpSnapshot[] | null> {
  try {
    const { supabase } = await getEffectiveClient();
    const rows = await pageAll<SnapshotRow>((from, to) =>
      supabase
        .from('guest_interactions')
        .select('guest_id, interaction_type, metadata, created_at, guests!inner(event_id)')
        .eq('guests.event_id', eventId)
        .eq('guests.rsvp_change_source', 'guest')
        .in('guests.rsvp_status', ['confirmed', 'declined'])
        .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
        .order('id')
        .range(from, to),
    );
    return rows.map((row) => {
      const confirmed = row.interaction_type === 'rsvp_confirm';
      const count = row.metadata?.guestCount ?? row.metadata?.guest_count;
      return {
        guestId: row.guest_id,
        status: confirmed ? 'confirmed' : 'declined',
        amount: confirmed && typeof count === 'number' ? count : null,
        channel: row.metadata?.channel ?? null,
        at: row.created_at,
      };
    });
  } catch (error) {
    console.error('getChangedAnswerSnapshots failed:', error);
    return null;
  }
}
