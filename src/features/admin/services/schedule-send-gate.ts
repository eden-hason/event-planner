import type { SupabaseClient } from '@supabase/supabase-js';

export type ScheduleSendGate = {
  eventId: string;
  /** The schedule type's catalog name - used as the message's label in the UI */
  scheduleTitle: string;
  /** null = still planned; the batch send claims it on its first successful batch */
  status: 'sent' | 'cancelled' | null;
  targetStatus: 'pending' | 'confirmed' | null;
};

export type ScheduleSendGateResult =
  | { ok: true; gate: ScheduleSendGate }
  | { ok: false; message: string };

/**
 * Shared gate for every Back Office send entry point: the schedule has to
 * exist, be a message schedule, and belong to an event with sending enabled.
 * Returns the event id so callers can scope their own guest lookups to it, and
 * the targeting fields so a caller that picks its own recipients can reproduce
 * the audience the engine would have selected.
 *
 * Lives in services/ rather than in either action file because quick send and
 * batch send both need it and it takes its client as a parameter, so it is not
 * itself a Server Action.
 */
export async function gateScheduleForSend(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<ScheduleSendGateResult> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      'id, event_id, status, target_status, schedule_types!inner(name, execution_kind), events!inner(can_create_schedules)',
    )
    .eq('id', scheduleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, message: 'That schedule no longer exists' };

  const scheduleType = (Array.isArray(data.schedule_types)
    ? data.schedule_types[0]
    : data.schedule_types) as { name: string; execution_kind: string } | null;
  if (scheduleType?.execution_kind !== 'message') {
    return { ok: false, message: 'Call rounds are not sent from here' };
  }

  const event = (Array.isArray(data.events) ? data.events[0] : data.events) as
    | { can_create_schedules: boolean }
    | null;
  if (!event?.can_create_schedules) {
    return { ok: false, message: 'Sending is not enabled for this event' };
  }

  return {
    ok: true,
    gate: {
      eventId: data.event_id,
      scheduleTitle: scheduleType.name,
      status: data.status,
      targetStatus: data.target_status,
    },
  };
}
