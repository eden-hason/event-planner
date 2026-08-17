import { getEffectiveClient } from '@/lib/supabase/admin';

import type {
  CallOutcome,
  CallRoundGuestRow,
  CallRoundResults,
  CallRoundSummary,
} from '../types';

type LogOutcomeRow = { round_id: string; outcome: CallOutcome | null };

function summarise(logs: { outcome: CallOutcome | null }[]) {
  return {
    total: logs.length,
    awaiting: logs.filter((l) => !l.outcome).length,
    confirmed: logs.filter((l) => l.outcome === 'confirmed').length,
    declined: logs.filter((l) => l.outcome === 'declined').length,
    noAnswer: logs.filter((l) => l.outcome === 'no_answer').length,
  };
}

/**
 * Call rounds for an event, as the Owner sees them.
 *
 * Goes through the RLS-bound client, so a user without Owner access simply
 * gets an empty list and the schedules page renders no call results at all.
 *
 * Deliberately unordered: a round is now attached to its planned schedule by
 * `scheduleId`, and the page orders by the plan's date. `round_number` is
 * deprecated and null on anything created after 2026-08-14, so sorting on it
 * would put every new round first.
 */
export async function getCallRoundsForEvent(
  eventId: string,
): Promise<CallRoundSummary[]> {
  const { supabase } = await getEffectiveClient();

  const { data: rounds, error } = await supabase
    .from('call_rounds')
    .select('id, schedule_id, round_number, created_at, completed_at')
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching call rounds:', error);
    return [];
  }

  if (!rounds || rounds.length === 0) return [];

  const { data: logs, error: logsError } = await supabase
    .from('call_logs')
    .select('round_id, outcome')
    .in(
      'round_id',
      rounds.map((r) => r.id),
    );

  if (logsError) {
    console.error('Error fetching call logs:', logsError);
  }

  const logsByRound = new Map<string, LogOutcomeRow[]>();
  for (const log of (logs ?? []) as LogOutcomeRow[]) {
    const existing = logsByRound.get(log.round_id);
    if (existing) {
      existing.push(log);
    } else {
      logsByRound.set(log.round_id, [log]);
    }
  }

  return rounds.map((round) => ({
    id: round.id,
    scheduleId: round.schedule_id ?? null,
    roundNumber: round.round_number ?? null,
    createdAt: round.created_at,
    completedAt: round.completed_at ?? null,
    status: round.completed_at ? ('completed' as const) : ('in_progress' as const),
    ...summarise(logsByRound.get(round.id) ?? []),
  }));
}

/**
 * The same rounds, keyed by the phone_call schedule each one executes, so the
 * schedules page can pair a plan with its round in one lookup.
 *
 * The migration backfilled a plan for every pre-existing round, so a round with
 * no `scheduleId` should not exist. One is skipped rather than dropped on the
 * floor silently - if it ever happens, the plan is the thing that went missing.
 */
export async function getCallRoundsByScheduleId(
  eventId: string,
): Promise<Map<string, CallRoundSummary>> {
  const rounds = await getCallRoundsForEvent(eventId);
  const byScheduleId = new Map<string, CallRoundSummary>();

  for (const round of rounds) {
    if (!round.scheduleId) {
      console.error(`Call round ${round.id} has no linked schedule - skipping`);
      continue;
    }
    byScheduleId.set(round.scheduleId, round);
  }

  return byScheduleId;
}

/**
 * Per-guest results for one round, as the Owner sees them.
 *
 * Selects columns explicitly - `called_by` is revoked from the authenticated
 * role, so a `select('*')` here would fail outright.
 */
export async function getCallRoundResults(
  roundId: string,
): Promise<CallRoundResults> {
  const { supabase } = await getEffectiveClient();

  const { data, error } = await supabase
    .from('call_logs')
    .select('guest_id, outcome, notes, guests!inner(name, rsvp_status, amount)')
    .eq('round_id', roundId);

  const empty: CallRoundResults = {
    summary: {
      total: 0,
      awaiting: 0,
      confirmed: 0,
      declined: 0,
      noAnswer: 0,
      confirmedGuests: 0,
    },
    guests: [],
  };

  if (error || !data) {
    if (error) console.error('Error fetching call round results:', error);
    return empty;
  }

  const guests: CallRoundGuestRow[] = data.map((log) => {
    const guest = log.guests as unknown as {
      name: string;
      rsvp_status: string | null;
      amount: number | null;
    };

    return {
      guestId: log.guest_id as string,
      guestName: guest?.name ?? '',
      outcome: (log.outcome ?? null) as CallOutcome | null,
      currentRsvpStatus: (guest?.rsvp_status ??
        'pending') as CallRoundGuestRow['currentRsvpStatus'],
      amount: guest?.amount ?? 1,
      // Empty string and null both mean "nothing to show", so they collapse
      // here rather than in every cell that renders it.
      notes: ((log.notes as string | null) ?? '').trim() || null,
    };
  });

  // Reached guests first, then the ones still awaiting a call.
  guests.sort((a, b) => {
    const rank = (g: CallRoundGuestRow) => (g.outcome ? 0 : 1);
    const byRank = rank(a) - rank(b);
    return byRank !== 0 ? byRank : a.guestName.localeCompare(b.guestName);
  });

  // Headcount comes from the guest record rather than the log: a call round
  // records an outcome, not a number of seats, so guests.amount - which
  // recordCallOutcome writes on confirm - is the only place it lives.
  const confirmedGuests = guests
    .filter((g) => g.outcome === 'confirmed')
    .reduce((sum, g) => sum + g.amount, 0);

  return { summary: { ...summarise(guests), confirmedGuests }, guests };
}
