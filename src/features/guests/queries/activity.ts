import { getEffectiveClient } from '@/lib/supabase/admin';
import type {
  ActivityAnswer,
  ActivityCall,
  ActivityDelivery,
  ActivityManualChange,
  CallOutcome,
  DeliveryStatus,
  GuestActivityInput,
} from '@/features/guests/utils/guest-activity';

const PAGE = 1000;

/**
 * Guest Records on this Event that a Delivery has reached the provider for.
 * The delete confirm names them, because their message history goes with them
 * (ADR 0025). Paged: an Event's Deliveries run to guests times Schedules.
 */
export async function getEventMessagedGuestIds(
  eventId: string,
): Promise<string[]> {
  const { supabase } = await getEffectiveClient();
  const ids = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('message_deliveries')
      .select('guest_id, guests!inner(event_id)')
      .eq('guests.event_id', eventId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Error fetching messaged guests:', error);
      break;
    }
    for (const row of data ?? []) ids.add(row.guest_id as string);
    if (!data || data.length < PAGE) break;
  }
  return [...ids];
}

type DeliveryRow = {
  status: DeliveryStatus;
  delivery_method: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  schedules: { schedule_types: { key: string } | null } | null;
  message_delivery_attempts: { triggered_by: string | null }[] | null;
};

type CallRow = {
  outcome: CallOutcome;
  called_at: string | null;
  created_at: string;
  call_rounds: { round_number: number } | null;
};

type InteractionRow = {
  interaction_type: 'rsvp_confirm' | 'rsvp_decline';
  created_at: string;
  metadata: { guestCount?: unknown; channel?: unknown } | null;
};

/**
 * Everything the guest drawer's Activity timeline needs for one Guest Record.
 * Reads through RLS as the Owner, like the list itself.
 */
export async function getGuestActivityInput(
  guestId: string,
  currentUserId: string | null,
): Promise<GuestActivityInput | null> {
  const { supabase } = await getEffectiveClient();

  const [guest, deliveries, calls, answers] = await Promise.all([
    supabase
      .from('guests')
      .select(
        'rsvp_status, rsvp_change_source, rsvp_changed_at, rsvp_changed_by, rsvp_changed_by_name',
      )
      .eq('id', guestId)
      .maybeSingle(),
    supabase
      .from('message_deliveries')
      .select(
        'status, delivery_method, sent_at, delivered_at, created_at, schedules(schedule_types(key)), message_delivery_attempts(triggered_by)',
      )
      .eq('guest_id', guestId),
    supabase
      .from('call_logs')
      .select('outcome, called_at, created_at, call_rounds(round_number)')
      .eq('guest_id', guestId)
      // A row with no outcome is a Guest queued in a round, not yet called.
      .not('outcome', 'is', null),
    supabase
      .from('guest_interactions')
      .select('interaction_type, created_at, metadata')
      .eq('guest_id', guestId)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline']),
  ]);

  const failed =
    guest.error ?? deliveries.error ?? calls.error ?? answers.error;
  if (failed) {
    console.error('Error fetching guest activity:', failed);
    return null;
  }
  if (!guest.data) return null;

  const g = guest.data;
  // The Guest's own answers and the Operator's calls have their own rows; only
  // an RSVP the Owner typed in needs reading off the record's provenance.
  const manualChange: ActivityManualChange | null =
    g.rsvp_change_source === 'manual' && g.rsvp_changed_at
      ? {
          status: g.rsvp_status,
          at: g.rsvp_changed_at,
          byName: g.rsvp_changed_by_name ?? null,
          byCurrentUser: !!currentUserId && g.rsvp_changed_by === currentUserId,
        }
      : null;

  return {
    deliveries: ((deliveries.data ?? []) as unknown as DeliveryRow[]).map(
      (row): ActivityDelivery => ({
        scheduleTypeKey: row.schedules?.schedule_types?.key ?? '',
        status: row.status,
        channel:
          row.delivery_method === 'sms'
            ? 'sms'
            : row.delivery_method === 'whatsapp'
              ? 'whatsapp'
              : null,
        viaFallback: (row.message_delivery_attempts ?? []).some(
          (a) => a.triggered_by === 'fallback',
        ),
        at:
          row.delivered_at ??
          row.sent_at ??
          (row.status === 'pending' ? null : row.created_at),
      }),
    ),
    calls: ((calls.data ?? []) as unknown as CallRow[]).map(
      (row): ActivityCall => ({
        roundNumber: row.call_rounds?.round_number ?? 1,
        outcome: row.outcome,
        at: row.called_at ?? row.created_at,
      }),
    ),
    answers: ((answers.data ?? []) as unknown as InteractionRow[]).map(
      (row): ActivityAnswer => ({
        response:
          row.interaction_type === 'rsvp_confirm' ? 'confirmed' : 'declined',
        count:
          typeof row.metadata?.guestCount === 'number'
            ? row.metadata.guestCount
            : null,
        channel:
          typeof row.metadata?.channel === 'string'
            ? row.metadata.channel
            : null,
        at: row.created_at,
      }),
    ),
    manualChange,
  };
}
