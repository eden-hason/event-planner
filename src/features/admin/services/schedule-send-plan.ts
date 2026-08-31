import type { SupabaseClient } from '@supabase/supabase-js';
import { validatePhoneNumber } from '@/features/schedules';
import type { ScheduleSendGate } from './schedule-send-gate';

export type PlanRecipient = {
  id: string;
  name: string;
  phone: string;
  groupName: string | null;
  rsvpStatus: string;
};

export type SchedulePlan = {
  scheduleId: string;
  scheduleTitle: string;
  /** null = still planned; the first successful send claims it as sent */
  status: 'sent' | 'cancelled' | null;
  targetStatus: 'pending' | 'confirmed' | null;
  /** Guest records in the schedule's target audience, reachable or not */
  audienceCount: number;
  /** Audience records with no usable phone - they can never receive this */
  unreachableCount: number;
  /** Reachable records that already have a successful delivery for this schedule */
  deliveredCount: number;
  /** Reachable records still waiting, in the order a send consumes them */
  remaining: PlanRecipient[];
};

type GuestRow = {
  id: string;
  name: string;
  phone_number: string | null;
  rsvp_status: string;
  groups: unknown;
};

function groupName(value: unknown): string | null {
  const group = (Array.isArray(value) ? value[0] : value) as { name: string } | null;
  return group?.name ?? null;
}

/**
 * Rebuilds the audience the send engine would have targeted, then splits it into
 * who is done and who is still waiting.
 *
 * The engine's own targeting is bypassed when a caller passes `guestIds`, which
 * every partial send does - so the target-status filter has to be reproduced
 * here or a send would happily include guests the schedule was never meant for.
 * Same predicate as the outreach timeline: a null target means everyone.
 *
 * Shared by the batch send and the verified one-by-one send. Both walk the same
 * queue, and `remaining` being recomputed from `message_deliveries` on every
 * call is what lets either one be closed and picked up again later without
 * remembering where it stopped.
 */
export async function buildSendPlan(
  supabase: SupabaseClient,
  scheduleId: string,
  gate: ScheduleSendGate,
): Promise<SchedulePlan> {
  const [guestsResult, deliveriesResult] = await Promise.all([
    supabase
      .from('guests')
      .select('id, name, phone_number, rsvp_status, groups(name)')
      .eq('event_id', gate.eventId)
      // Deterministic order so "the first 100" means the same list on every
      // reload, and so consecutive sends walk the guest list front to back.
      .order('name', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('message_deliveries')
      .select('guest_id')
      .eq('schedule_id', scheduleId)
      .in('status', ['sent', 'delivered', 'read']),
  ]);
  if (guestsResult.error) throw guestsResult.error;
  if (deliveriesResult.error) throw deliveriesResult.error;

  const audience = ((guestsResult.data ?? []) as GuestRow[]).filter(
    (guest) => !gate.targetStatus || guest.rsvp_status === gate.targetStatus,
  );
  const reachable = audience.filter((guest) => validatePhoneNumber(guest.phone_number));
  const delivered = new Set((deliveriesResult.data ?? []).map((row) => row.guest_id));

  return {
    scheduleId,
    scheduleTitle: gate.scheduleTitle,
    status: gate.status,
    targetStatus: gate.targetStatus,
    audienceCount: audience.length,
    unreachableCount: audience.length - reachable.length,
    deliveredCount: reachable.filter((guest) => delivered.has(guest.id)).length,
    remaining: reachable
      .filter((guest) => !delivered.has(guest.id))
      .map((guest) => ({
        id: guest.id,
        name: guest.name,
        phone: guest.phone_number!,
        groupName: groupName(guest.groups),
        rsvpStatus: guest.rsvp_status,
      })),
  };
}
