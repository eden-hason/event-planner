'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { CallOutcome } from '@/features/calls/types';
import { getTestScope } from './test-accounts';

export type RoundGuestRow = {
  guestId: string;
  name: string;
  /** The Operator is about to dial it, so unlike the Owner view this carries it. */
  phone: string | null;
  currentRsvpStatus: 'pending' | 'confirmed' | 'declined';
  outcome: CallOutcome | null;
  notes: string | null;
  amount: number;
};

export type RoundDetail = {
  id: string;
  eventId: string;
  eventTitle: string;
  /** Catalog name plus positional index, matching the Owner's label */
  title: string;
  startedAt: string;
  completedAt: string | null;
  /** The audience the plan targeted, snapshotted at start */
  targetStatus: string | null;
  guests: RoundGuestRow[];
};

export async function getRoundDetail(roundId: string): Promise<RoundDetail | null> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();

  const { data: round, error } = await supabase
    .from('call_rounds')
    .select('id, event_id, schedule_id, created_at, completed_at, events(title)')
    .eq('id', roundId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!round) return null;
  if (test.eventIds.includes(round.event_id)) return null;

  const event = round.events as unknown as { title: string | null } | null;

  // Label parity with the Owner app: the index runs over every schedule of the
  // type on this event, whatever its status. See brief 3.10.
  let title = 'Call Round';
  let targetStatus: string | null = null;

  if (round.schedule_id) {
    const { data: plan } = await supabase
      .from('schedules')
      .select('schedule_type_id, target_status, schedule_types(name)')
      .eq('id', round.schedule_id)
      .single();

    if (plan) {
      targetStatus = plan.target_status;
      const type = plan.schedule_types as unknown as { name: string | null } | null;
      const baseName = type?.name ?? 'Call Round';

      const { data: siblings } = await supabase
        .from('schedules')
        .select('id')
        .eq('event_id', round.event_id)
        .eq('schedule_type_id', plan.schedule_type_id)
        .order('scheduled_date', { ascending: true });

      const list = siblings ?? [];
      title =
        list.length > 1
          ? `${baseName} ${list.findIndex((row) => row.id === round.schedule_id) + 1}`
          : baseName;
    }
  }

  const { data: logs, error: logsError } = await supabase
    .from('call_logs')
    .select('guest_id, outcome, notes, guests!inner(name, phone_number, rsvp_status, amount)')
    .eq('round_id', roundId);

  if (logsError) throw new Error(logsError.message);

  const guests: RoundGuestRow[] = (logs ?? []).map((log) => {
    const guest = log.guests as unknown as {
      name: string | null;
      phone_number: string | null;
      rsvp_status: string | null;
      amount: number | null;
    };

    return {
      guestId: log.guest_id as string,
      name: guest?.name ?? 'Unnamed record',
      phone: guest?.phone_number ?? null,
      currentRsvpStatus: (guest?.rsvp_status ?? 'pending') as RoundGuestRow['currentRsvpStatus'],
      outcome: (log.outcome ?? null) as CallOutcome | null,
      notes: ((log.notes as string | null) ?? '').trim() || null,
      amount: guest?.amount ?? 1,
    };
  });

  // Stable order the Operator can work down. Not-yet-called first: this is a
  // worklist, and the rows that still need a call are the ones being worked.
  guests.sort((a, b) => {
    const rank = (row: RoundGuestRow) => (row.outcome ? 1 : 0);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

  return {
    id: round.id,
    eventId: round.event_id,
    eventTitle: event?.title ?? 'Untitled event',
    title,
    startedAt: round.created_at,
    completedAt: round.completed_at,
    targetStatus,
    guests,
  };
}
