import type { SupabaseClient } from '@supabase/supabase-js';
import { loadOutsidePackageIds } from '@/features/billing/services';
import { embeddedOne, pageAll } from '@/lib/supabase/row-cap';
import {
  gateScheduleForSend,
  type ScheduleSendGateRefusal,
} from './schedule-send-gate';
import {
  CATCH_UP_TYPE_KEYS,
  catchUpRejection,
  phoneProblemFor,
  pickCatchUpSchedule,
  splitCatchUp,
  wentOutAt,
  type CatchUpDeliveryRow,
  type CatchUpRejection,
  type CatchUpScheduleRow,
  type CatchUpSplit,
} from '../utils/catch-up';

export type CatchUpPlan = CatchUpSplit & {
  scheduleId: string;
  eventId: string;
  channel: string | null;
  /** When the Schedule went out: its recorded send, or failing that its claim */
  sentAt: string | null;
};

export type CatchUpPlanRefusal =
  | ScheduleSendGateRefusal
  | CatchUpRejection
  | 'package_unknown';

export type CatchUpPlanResult =
  | { ok: true; plan: CatchUpPlan }
  | { ok: false; reason: CatchUpPlanRefusal };

type GuestRow = {
  id: string;
  name: string;
  phone_number: string | null;
  rsvp_status: string;
  created_at: string;
  groups: unknown;
};

type DeliveryRow = {
  guest_id: string;
  status: string;
  next_attempt_at: string | null;
  not_sent_reason: string | null;
  message_delivery_attempts: { status: string }[] | null;
};

/** What a catch-up reads of a Delivery: its state, and whether a send is under way */
export const CATCH_UP_DELIVERY_SELECT =
  'guest_id, status, next_attempt_at, not_sent_reason, message_delivery_attempts(status)';

export function toCatchUpDelivery(row: DeliveryRow): CatchUpDeliveryRow {
  return {
    guestId: row.guest_id,
    status: row.status,
    queued: row.next_attempt_at !== null,
    attemptPending: (row.message_delivery_attempts ?? []).some(
      (attempt) => attempt.status === 'pending',
    ),
    notSentReason: row.not_sent_reason,
  };
}

export type CatchUpSchedule = CatchUpScheduleRow & {
  targetStatus: string | null;
  eventDate: string | null;
};

type CatchUpScheduleDbRow = {
  id: string;
  status: string | null;
  target_status: string | null;
  sent_at: string | null;
  dispatched_at: string | null;
  schedule_types: { key: string } | { key: string }[] | null;
  events: { event_date: string | null } | { event_date: string | null }[] | null;
};

/**
 * The Event's Schedule a guest can be caught up on (`pickCatchUpSchedule`), or
 * null when none has gone out. The Owner's send and the guest list's missed
 * filter both start here, so they never pick two different Schedules.
 */
export async function loadCatchUpSchedule(
  supabase: SupabaseClient,
  eventId: string,
): Promise<CatchUpSchedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      'id, status, target_status, sent_at, dispatched_at, schedule_types!inner(key), events!inner(event_date)',
    )
    .eq('event_id', eventId)
    .in('schedule_types.key', [...CATCH_UP_TYPE_KEYS]);
  if (error) throw error;

  return pickCatchUpSchedule(
    ((data ?? []) as unknown as CatchUpScheduleDbRow[]).map((row) => ({
      id: row.id,
      typeKey: embeddedOne(row.schedule_types)?.key ?? '',
      status: row.status,
      sentAt: row.sent_at,
      dispatchedAt: row.dispatched_at,
      targetStatus: row.target_status,
      eventDate: embeddedOne(row.events)?.event_date ?? null,
    })),
  );
}

/**
 * Who a sent Schedule can still be sent to, recomputed from the database on
 * every call - by the Back Office's late-guest send and the Owner's Catch-up
 * Send alike (ADR 0050).
 *
 * Recomputing is the double-send guard: the UI loads this to offer the send
 * and the send action loads it again before sending, so a guest reached in
 * between - by a second Owner or Operator, or by pressing twice - has a
 * delivery by then and is simply no longer eligible.
 *
 * `guestId` narrows the guest list to one record, for the Owner's per-guest
 * send. The audience predicate is per guest, so the split for that guest is
 * the same as in the full list.
 */
export async function buildCatchUpPlan(
  supabase: SupabaseClient,
  scheduleId: string,
  options: { now?: Date; guestId?: string } = {},
): Promise<CatchUpPlanResult> {
  const { now = new Date(), guestId } = options;
  const gated = await gateScheduleForSend(supabase, scheduleId);
  if (!gated.ok) return gated;
  const { gate } = gated;

  const rejection = catchUpRejection({
    status: gate.status,
    dispatchedAt: gate.dispatchedAt,
    scheduleTypeKey: gate.scheduleTypeKey,
    eventDate: gate.eventDate,
    now,
  });
  if (rejection) return { ok: false, reason: rejection };

  // Both paged: a large Event's guest list, and every delivery a Schedule has
  // ever made, can each pass PostgREST's row cap.
  const [guests, deliveries, outsideIds] = await Promise.all([
    pageAll<GuestRow>((from, to) => {
      let query = supabase
        .from('guests')
        .select('id, name, phone_number, rsvp_status, created_at, groups(name)')
        .eq('event_id', gate.eventId);
      if (guestId) query = query.eq('id', guestId);
      return query.order('id').range(from, to);
    }),
    pageAll<DeliveryRow>((from, to) => {
      let query = supabase
        .from('message_deliveries')
        .select(CATCH_UP_DELIVERY_SELECT)
        .eq('schedule_id', scheduleId);
      if (guestId) query = query.eq('guest_id', guestId);
      return query.order('id').range(from, to);
    }),
    loadOutsidePackageIds(supabase, gate.eventId),
  ]);
  // Never send on a guess about the package (ADR 0027).
  if (!outsideIds) return { ok: false, reason: 'package_unknown' };

  const sentAt = wentOutAt(gate);
  const split = splitCatchUp({
    guests: guests.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone_number,
      rsvpStatus: row.rsvp_status,
      groupName: embeddedOne(row.groups as { name: string } | null)?.name ?? null,
      createdAt: row.created_at,
    })),
    deliveries: deliveries.map(toCatchUpDelivery),
    targetStatus: gate.targetStatus,
    outsideIds,
    phoneProblem: phoneProblemFor(gate.channel),
    sentAt,
  });

  return {
    ok: true,
    plan: {
      ...split,
      scheduleId,
      eventId: gate.eventId,
      channel: gate.channel,
      sentAt,
    },
  };
}
