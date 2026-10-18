import type { SupabaseClient } from '@supabase/supabase-js';
import { loadOutsidePackageIds } from '@/features/billing/services';
import { pageAll } from '@/lib/supabase/row-cap';
import { gateScheduleForSend } from './schedule-send-gate';
import {
  lateSendRejection,
  phoneProblemFor,
  splitLateGuests,
  type LateGuestSplit,
} from '../utils/late-guests';

export type LateGuestPlan = LateGuestSplit & {
  scheduleId: string;
  eventId: string;
  channel: string | null;
  /** When the Schedule went out: its recorded send, or failing that its claim */
  sentAt: string | null;
};

export type LateGuestPlanResult =
  | { ok: true; plan: LateGuestPlan }
  | { ok: false; message: string };

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

function groupName(value: unknown): string | null {
  const group = (Array.isArray(value) ? value[0] : value) as { name: string } | null;
  return group?.name ?? null;
}

/**
 * Who a sent Schedule can still be sent to from the Back Office, recomputed
 * from the database on every call.
 *
 * Recomputing is the double-send guard: the dialog loads this when a Schedule
 * is picked and the send action loads it again before sending, so a guest
 * reached in between - by a second Operator, or by pressing twice - has a
 * delivery by then and is simply no longer eligible.
 */
export async function buildLateGuestPlan(
  supabase: SupabaseClient,
  scheduleId: string,
  now: Date = new Date(),
): Promise<LateGuestPlanResult> {
  const gated = await gateScheduleForSend(supabase, scheduleId);
  if (!gated.ok) return gated;
  const { gate } = gated;

  const rejection = lateSendRejection({
    status: gate.status,
    dispatchedAt: gate.dispatchedAt,
    scheduleTypeKey: gate.scheduleTypeKey,
    eventDate: gate.eventDate,
    now,
  });
  if (rejection) return { ok: false, message: rejection };

  // Both paged: a large Event's guest list, and every delivery a Schedule has
  // ever made, can each pass PostgREST's row cap.
  const [guests, deliveries, outsideIds] = await Promise.all([
    pageAll<GuestRow>((from, to) =>
      supabase
        .from('guests')
        .select('id, name, phone_number, rsvp_status, created_at, groups(name)')
        .eq('event_id', gate.eventId)
        .order('id')
        .range(from, to),
    ),
    pageAll<DeliveryRow>((from, to) =>
      supabase
        .from('message_deliveries')
        .select('guest_id, status, next_attempt_at, not_sent_reason, message_delivery_attempts(status)')
        .eq('schedule_id', scheduleId)
        .order('id')
        .range(from, to),
    ),
    loadOutsidePackageIds(supabase, gate.eventId),
  ]);
  // Never send on a guess about the package (ADR 0027).
  if (!outsideIds) return { ok: false, message: 'לא הצלחנו לבדוק את חבילת הרשומות' };

  const sentAt = gate.sentAt ?? gate.dispatchedAt;
  const split = splitLateGuests({
    guests: guests.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone_number,
      rsvpStatus: row.rsvp_status,
      groupName: groupName(row.groups),
      createdAt: row.created_at,
    })),
    deliveries: deliveries.map((row) => ({
      guestId: row.guest_id,
      status: row.status,
      queued: row.next_attempt_at !== null,
      attemptPending: (row.message_delivery_attempts ?? []).some((attempt) => attempt.status === 'pending'),
      notSentReason: row.not_sent_reason,
    })),
    targetStatus: gate.targetStatus,
    outsideIds,
    phoneProblem: phoneProblemFor(gate.channel),
    sentAt,
  });

  return {
    ok: true,
    plan: { ...split, scheduleId, eventId: gate.eventId, channel: gate.channel, sentAt },
  };
}
