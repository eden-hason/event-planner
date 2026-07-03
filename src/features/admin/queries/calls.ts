'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { CallRoundSummary, CallLogWithGuest, CallOutcome } from '../types';

export async function getCallRounds(eventId: string): Promise<CallRoundSummary[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data: rounds, error } = await supabase
    .from('call_rounds')
    .select('id, round_number, created_at')
    .eq('event_id', eventId)
    .order('round_number', { ascending: false });

  if (error || !rounds || rounds.length === 0) return [];

  const roundIds = rounds.map((r) => r.id);

  const { data: logs } = await supabase
    .from('call_logs')
    .select('round_id, outcome')
    .in('round_id', roundIds);

  const logsByRound = new Map<string, { outcome: string | null }[]>();
  for (const log of logs ?? []) {
    const arr = logsByRound.get(log.round_id) ?? [];
    arr.push({ outcome: log.outcome ?? null });
    logsByRound.set(log.round_id, arr);
  }

  return rounds.map((round) => {
    const roundLogs = logsByRound.get(round.id) ?? [];
    const total = roundLogs.length;
    const awaiting = roundLogs.filter((l) => !l.outcome).length;
    const confirmed = roundLogs.filter((l) => l.outcome === 'confirmed').length;
    const declined = roundLogs.filter((l) => l.outcome === 'declined').length;
    const noAnswer = roundLogs.filter((l) => l.outcome === 'no_answer').length;

    return {
      id: round.id,
      roundNumber: round.round_number,
      createdAt: round.created_at,
      total,
      awaiting,
      confirmed,
      declined,
      noAnswer,
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
