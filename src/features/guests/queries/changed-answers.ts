import { getEffectiveClient } from '@/lib/supabase/admin';
import { pageAll } from '@/lib/supabase/row-cap';
import type {
  ChangedAnswerGuest,
  RsvpSnapshot,
} from '@/features/guests/utils/changed-answers';

type SnapshotRow = {
  guest_id: string;
  interaction_type: 'rsvp_confirm' | 'rsvp_decline';
  metadata: { channel?: string; guestCount?: number; guest_count?: number } | null;
  created_at: string;
};

/**
 * What the changed-answers export reads for one Event: the Guest Records whose
 * RSVP is still their own, and every RSVP snapshot they left. Both read through
 * RLS as the viewer, so any Owner of the Event gets the same file (migration
 * 20261107000000 opened `guest_interactions` to every Owner, not only the
 * creator).
 */
export async function getChangedAnswersInput(eventId: string): Promise<{
  guests: ChangedAnswerGuest[];
  snapshots: RsvpSnapshot[];
}> {
  const { supabase } = await getEffectiveClient();

  const [guestRows, snapshotRows] = await Promise.all([
    pageAll<{
      id: string;
      name: string;
      phone_number: string | null;
      rsvp_status: string | null;
      amount: number | null;
      rsvp_change_source: string | null;
      rsvp_changed_at: string | null;
    }>((from, to) =>
      supabase
        .from('guests')
        .select('id, name, phone_number, rsvp_status, amount, rsvp_change_source, rsvp_changed_at')
        .eq('event_id', eventId)
        .eq('rsvp_change_source', 'guest')
        .in('rsvp_status', ['confirmed', 'declined'])
        .order('id')
        .range(from, to),
    ),
    pageAll<SnapshotRow>((from, to) =>
      supabase
        .from('guest_interactions')
        .select('guest_id, interaction_type, metadata, created_at, guests!inner(event_id)')
        .eq('guests.event_id', eventId)
        .eq('guests.rsvp_change_source', 'guest')
        .in('guests.rsvp_status', ['confirmed', 'declined'])
        .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
        .order('id')
        .range(from, to),
    ),
  ]);

  return {
    guests: guestRows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone_number,
      rsvpStatus: row.rsvp_status,
      amount: row.amount,
      rsvpChangeSource: row.rsvp_change_source,
      rsvpChangedAt: row.rsvp_changed_at,
    })),
    snapshots: snapshotRows.map((row) => {
      const confirmed = row.interaction_type === 'rsvp_confirm';
      const count = row.metadata?.guestCount ?? row.metadata?.guest_count;
      return {
        guestId: row.guest_id,
        status: confirmed ? 'confirmed' : 'declined',
        amount: confirmed && typeof count === 'number' ? count : null,
        channel: row.metadata?.channel ?? null,
        at: row.created_at,
      };
    }),
  };
}
