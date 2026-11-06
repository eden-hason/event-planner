import { getEffectiveClient } from '@/lib/supabase/admin';
import { pageAll } from '@/lib/supabase/row-cap';
import { createServiceClient } from '@/lib/supabase/service';
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
 * RSVP is still their own, and every RSVP snapshot they left.
 *
 * The records are read through RLS as the viewer, so the file holds only the
 * records the viewer could see on the list. The snapshots are read with the service client,
 * then kept only for those records: `guest_interactions` admits only the
 * Event's creator (backlog 0034), and a co-owner reading it through RLS would
 * get no rows and no error - an export that says nobody changed their answer.
 * Reading the records first is what proves access.
 */
export async function getChangedAnswersInput(eventId: string): Promise<{
  guests: ChangedAnswerGuest[];
  snapshots: RsvpSnapshot[];
}> {
  const { supabase } = await getEffectiveClient();

  const guestRows = await pageAll<{
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
  );
  if (guestRows.length === 0) return { guests: [], snapshots: [] };

  const visible = new Set(guestRows.map((row) => row.id));
  const service = createServiceClient();
  const snapshotRows = await pageAll<SnapshotRow>((from, to) =>
    service
      .from('guest_interactions')
      .select('guest_id, interaction_type, metadata, created_at, guests!inner(event_id)')
      .eq('guests.event_id', eventId)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
      .order('id')
      .range(from, to),
  );

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
    snapshots: snapshotRows
      .filter((row) => visible.has(row.guest_id))
      .map((row) => {
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
