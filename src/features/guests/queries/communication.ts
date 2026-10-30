import { getEffectiveClient } from '@/lib/supabase/admin';
import { loadOutsidePackageIds } from '@/features/billing/services';
import { loadGuestJourneys } from '@/features/schedules/services/guest-journeys';
import {
  phoneProblemFor,
  pickCatchUpSchedule,
} from '@/features/schedules/utils/catch-up';
import type {
  CallOutcome,
  CommunicationSchedule,
  GuestCommunicationInput,
} from '@/features/guests/utils/guest-communication';

type ScheduleRow = {
  id: string;
  status: string | null;
  target_status: string | null;
  scheduled_date: string | null;
  sent_at: string | null;
  dispatched_at: string | null;
  schedule_types: { key: string; execution_kind: string } | null;
  message_templates: { channel: string | null } | null;
};

type CallRow = {
  outcome: CallOutcome | null;
  called_at: string | null;
  call_rounds: { schedule_id: string | null } | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Everything the guest drawer's Communication tab needs for one Guest Record:
 * the Event's whole outreach plan, and what each part of it did for this
 * guest. Reads through RLS as the Owner, like the list itself.
 */
export async function getGuestCommunicationInput(
  guestId: string,
  currentUserId: string | null,
): Promise<GuestCommunicationInput | null> {
  const { supabase } = await getEffectiveClient();

  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select(
      'id, name, phone_number, rsvp_status, amount, created_at, event_id, rsvp_change_source, rsvp_changed_at, rsvp_changed_by, rsvp_changed_by_name, events!inner(event_date, can_create_schedules)',
    )
    .eq('id', guestId)
    .maybeSingle();
  if (guestError) {
    console.error('Error fetching guest for communication:', guestError);
    return null;
  }
  if (!guest) return null;
  const event = one(
    guest.events as unknown as {
      event_date: string | null;
      can_create_schedules: boolean;
    } | null,
  );

  const [schedules, journeys, calls, answers, outsideIds] = await Promise.all([
    supabase
      .from('schedules')
      .select(
        'id, status, target_status, scheduled_date, sent_at, dispatched_at, schedule_types!inner(key, execution_kind), message_templates(channel)',
      )
      .eq('event_id', guest.event_id),
    loadGuestJourneys(supabase, guestId),
    supabase
      .from('call_logs')
      .select('outcome, called_at, call_rounds!inner(schedule_id)')
      .eq('guest_id', guestId),
    supabase
      .from('guest_interactions')
      .select('interaction_type, created_at, metadata')
      .eq('guest_id', guestId)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline']),
    loadOutsidePackageIds(supabase, guest.event_id),
  ]);

  const failed = schedules.error ?? calls.error ?? answers.error;
  if (failed || !journeys) {
    console.error('Error fetching guest communication:', failed);
    return null;
  }

  const scheduleRows = (schedules.data ?? []) as unknown as ScheduleRow[];
  const plan: (CommunicationSchedule & { channel: string | null })[] =
    scheduleRows.map((row) => {
      const type = one(row.schedule_types);
      return {
        id: row.id,
        typeKey: type?.key ?? '',
        kind: type?.execution_kind === 'message' ? 'message' : 'call',
        status: row.status,
        targetStatus: row.target_status,
        scheduledDate: row.scheduled_date,
        sentAt: row.sent_at,
        dispatchedAt: row.dispatched_at,
        channel: one(row.message_templates)?.channel ?? null,
      };
    });
  const catchUp = pickCatchUpSchedule(plan);

  const callsBySchedule = new Map<
    string,
    GuestCommunicationInput['calls'][number]
  >();
  for (const row of (calls.data ?? []) as unknown as CallRow[]) {
    const scheduleId = one(row.call_rounds)?.schedule_id;
    if (!scheduleId) continue;
    // One call per round; a round re-run keeps the one with an outcome.
    const existing = callsBySchedule.get(scheduleId);
    if (existing?.outcome && !row.outcome) continue;
    callsBySchedule.set(scheduleId, {
      scheduleId,
      outcome: row.outcome,
      at: row.called_at,
    });
  }

  return {
    guest: {
      id: guest.id,
      name: guest.name,
      rsvpStatus: guest.rsvp_status,
      amount: guest.amount ?? 1,
      createdAt: guest.created_at,
      rsvpChangeSource: guest.rsvp_change_source ?? null,
      rsvpChangedAt: guest.rsvp_changed_at ?? null,
      rsvpChangedByName: guest.rsvp_changed_by_name ?? null,
      rsvpChangedByCurrentUser:
        !!currentUserId && guest.rsvp_changed_by === currentUserId,
    },
    eventDate: event?.event_date ?? null,
    canSend: event?.can_create_schedules ?? false,
    // Unknown package standing never offers a send (ADR 0027): treated as outside.
    outsidePackage: outsideIds ? outsideIds.has(guest.id) : true,
    schedules: plan,
    deliveries: journeys,
    calls: [...callsBySchedule.values()],
    answers: (answers.data ?? []).map((row) => {
      const meta = row.metadata as { channel?: unknown } | null;
      return {
        response:
          row.interaction_type === 'rsvp_confirm'
            ? ('confirmed' as const)
            : ('declined' as const),
        channel: typeof meta?.channel === 'string' ? meta.channel : null,
        at: row.created_at,
      };
    }),
    catchUpPhoneProblem: catchUp
      ? phoneProblemFor(catchUp.channel)(guest.phone_number)
      : null,
  };
}
