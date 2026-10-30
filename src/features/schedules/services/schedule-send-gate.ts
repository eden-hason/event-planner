import type { SupabaseClient } from '@supabase/supabase-js';

export type ScheduleSendGate = {
  eventId: string;
  /** The schedule type's catalog name - used as the message's label in the UI */
  scheduleTitle: string;
  /** The schedule type's catalog key */
  scheduleTypeKey: string;
  /** null = still planned; see SCHEDULE_STATUSES for the rest */
  status: string | null;
  targetStatus: 'pending' | 'confirmed' | null;
  /** Set when the Dispatcher claimed it - a claimed Schedule went out even without status = 'sent' */
  dispatchedAt: string | null;
  sentAt: string | null;
  /** The template's channel, which decides whose phone it can reach */
  channel: string | null;
  eventDate: string | null;
};

/** Why a Schedule cannot be sent from a manual entry point */
export type ScheduleSendGateRefusal = 'not_found' | 'not_message' | 'sending_off';

export type ScheduleSendGateResult =
  | { ok: true; gate: ScheduleSendGate }
  | { ok: false; reason: ScheduleSendGateRefusal };

/**
 * Shared gate for every manual send entry point: the schedule has to exist, be
 * a message schedule, and belong to an event with sending enabled. Returns the
 * event id so callers can scope their own guest lookups to it, and the
 * targeting fields so a caller that picks its own recipients can reproduce the
 * audience the engine would have selected.
 *
 * Lives in services/ because the Back Office's SMS Fallback and late-guest
 * send and the Owner's Catch-up Send all need it, and it takes its client as a
 * parameter, so it is not itself a Server Action. It answers in codes: each
 * caller words the refusal for its own reader.
 */
export async function gateScheduleForSend(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<ScheduleSendGateResult> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      'id, event_id, status, target_status, dispatched_at, sent_at, schedule_types!inner(key, name, execution_kind), message_templates(channel), events!inner(can_create_schedules, event_date)',
    )
    .eq('id', scheduleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: 'not_found' };

  const scheduleType = (Array.isArray(data.schedule_types)
    ? data.schedule_types[0]
    : data.schedule_types) as { key: string; name: string; execution_kind: string } | null;
  if (scheduleType?.execution_kind !== 'message') {
    return { ok: false, reason: 'not_message' };
  }

  const event = (Array.isArray(data.events) ? data.events[0] : data.events) as
    | { can_create_schedules: boolean; event_date: string | null }
    | null;
  if (!event?.can_create_schedules) {
    return { ok: false, reason: 'sending_off' };
  }

  const template = (Array.isArray(data.message_templates)
    ? data.message_templates[0]
    : data.message_templates) as { channel: string | null } | null;

  return {
    ok: true,
    gate: {
      eventId: data.event_id,
      scheduleTitle: scheduleType.name,
      scheduleTypeKey: scheduleType.key,
      status: data.status,
      targetStatus: data.target_status,
      dispatchedAt: data.dispatched_at,
      sentAt: data.sent_at,
      channel: template?.channel ?? null,
      eventDate: event.event_date,
    },
  };
}
