'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { CallPlanWithRound, CallLogWithGuest, CallOutcome } from '../types';

/**
 * The event's planned call rounds, each with the round executing it if one has
 * been started.
 *
 * Driven by `schedules` rather than `call_rounds`: a plan exists before anyone
 * picks up a phone, and the back office needs to see the ones nobody has
 * started yet. Ordered by the planned date, which is also what numbers them -
 * `round_number` is deprecated and null on anything created after 2026-08-14.
 */
export async function getCallPlans(eventId: string): Promise<CallPlanWithRound[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data: plans, error } = await supabase
    .from('schedules')
    .select(
      `id, scheduled_date, scheduled_time, target_status, status,
       schedule_types!inner (key, execution_kind),
       call_rounds (id, round_number, created_at, completed_at)`,
    )
    .eq('event_id', eventId)
    .eq('schedule_types.execution_kind', 'phone_call')
    .order('scheduled_date', { ascending: true });

  if (error || !plans || plans.length === 0) return [];

  const roundIds = plans
    .flatMap((p) => (p.call_rounds ?? []) as { id: string }[])
    .map((r) => r.id);

  const { data: logs } = roundIds.length
    ? await supabase.from('call_logs').select('round_id, outcome').in('round_id', roundIds)
    : { data: [] };

  const logsByRound = new Map<string, { outcome: string | null }[]>();
  for (const log of logs ?? []) {
    const arr = logsByRound.get(log.round_id) ?? [];
    arr.push({ outcome: log.outcome ?? null });
    logsByRound.set(log.round_id, arr);
  }

  return plans.map((plan, index) => {
    // A unique index on call_rounds.schedule_id caps this at one.
    const rawRound = ((plan.call_rounds ?? []) as Record<string, unknown>[])[0];
    const roundLogs = rawRound ? (logsByRound.get(rawRound.id as string) ?? []) : [];

    return {
      scheduleId: plan.id,
      planNumber: index + 1,
      scheduledDate: plan.scheduled_date,
      scheduledTime: plan.scheduled_time ?? null,
      targetStatus: (plan.target_status ?? null) as 'pending' | 'confirmed' | null,
      cancelled: plan.status === 'cancelled',
      round: rawRound
        ? {
            id: rawRound.id as string,
            scheduleId: plan.id,
            roundNumber: (rawRound.round_number ?? null) as number | null,
            createdAt: rawRound.created_at as string,
            completedAt: (rawRound.completed_at ?? null) as string | null,
            status: rawRound.completed_at ? ('completed' as const) : ('in_progress' as const),
            total: roundLogs.length,
            awaiting: roundLogs.filter((l) => !l.outcome).length,
            confirmed: roundLogs.filter((l) => l.outcome === 'confirmed').length,
            declined: roundLogs.filter((l) => l.outcome === 'declined').length,
            noAnswer: roundLogs.filter((l) => l.outcome === 'no_answer').length,
          }
        : null,
    };
  });
}

export async function getRoundCallLogs(roundId: string): Promise<CallLogWithGuest[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('call_logs')
    .select(
      'id, guest_id, outcome, notes, called_at, guests(id, name, phone_number, amount, side, rsvp_status, group_id, groups(name))',
    )
    .eq('round_id', roundId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((log) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guest = log.guests as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group = guest?.groups as any;
    return {
      id: log.id,
      guestId: log.guest_id,
      name: guest?.name ?? '',
      phone: guest?.phone_number ?? null,
      amount: guest?.amount ?? 1,
      side: (guest?.side ?? null) as 'bride' | 'groom' | null,
      groupName: group?.name ?? null,
      currentRsvpStatus: (guest?.rsvp_status ?? 'pending') as 'pending' | 'confirmed' | 'declined',
      outcome: (log.outcome ?? null) as CallOutcome | null,
      notes: log.notes ?? null,
      calledAt: log.called_at ?? null,
    };
  });
}
