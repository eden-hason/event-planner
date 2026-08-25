'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { OverviewCounts, Signal, UpcomingEvent } from '../types';
import { excludeIds, getTestScope } from './test-accounts';
import { formatScheduleDateTime } from '@/lib/date-time';

/**
 * A Call Round is ended by a deliberate act of Round Completion, so an old open
 * round means a human forgot rather than that guests were unreachable. Three
 * days is a judgement call and lives here so it moves in one place.
 */
const STALE_CALL_ROUND_DAYS = 3;
const FAILED_DELIVERY_LOOKBACK_DAYS = 30;
const UPCOMING_WINDOW_DAYS = 30;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** "6 hours" / "2 days" - the age an Operator reads in the headline. */
function duration(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'under an hour';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * Never let a failed read fall through as an empty result. A Signal list that
 * is empty because the query broke reads as an all-clear, which is worse than
 * a visible error - the caller renders a distinct failure state instead.
 */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Query returned no data');
  return result.data;
}

function unwrapCount(result: { count: number | null; error: { message: string } | null }): number {
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

/** Severity rank. Lower is worse - see docs/admin/ADMIN-CONTEXT.md. */
const SEVERITY: Record<Signal['kind'], number> = {
  overdue_schedule: 0,
  failed_delivery: 1,
  stale_call_round: 2,
};

export async function getOverviewCounts(): Promise<OverviewCounts> {
  await assertAdmin();
  const supabase = createServiceClient();

  // Draft Events are interest, not events the user has, so they are excluded
  // from every business count. Guest Records are counted per row: `amount` is
  // how many humans a record covers and would be a different, larger number.
  // Test accounts are excluded for the same reason - see test-accounts.ts.
  const test = await getTestScope();

  const [users, events, publishedEvents] = await Promise.all([
    excludeIds(
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      'id',
      test.userIds,
    ),
    excludeIds(
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      'user_id',
      test.userIds,
    ),
    excludeIds(
      supabase.from('events').select('id').eq('status', 'published'),
      'user_id',
      test.userIds,
    ),
  ]);

  // Guest Records need no filter of their own: publishedIds no longer contains
  // any test account's event.
  const publishedIds = unwrap(publishedEvents).map((e) => e.id);

  const guestRecords = publishedIds.length
    ? unwrapCount(
        await supabase
          .from('guests')
          .select('id', { count: 'exact', head: true })
          .in('event_id', publishedIds),
      )
    : 0;

  return {
    users: unwrapCount(users),
    events: unwrapCount(events),
    guestRecords,
  };
}

export async function getSignals(): Promise<Signal[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const nowIso = new Date().toISOString();
  const test = await getTestScope();
  const testEventIds = new Set(test.eventIds);

  const [overdue, failed, stale] = await Promise.all([
    // Overdue Schedule: `schedules.status` only ever holds 'sent' or
    // 'cancelled', so NULL is the only representation of "not completed".
    // Overdue is therefore derived, never stored.
    excludeIds(
      supabase
        .from('schedules')
        .select(
          'id, scheduled_date, scheduled_time, event_id, events(title), schedule_types(name)',
        )
        .is('status', null)
        .lt('scheduled_date', nowIso),
      'event_id',
      test.eventIds,
    ),

    // The only read here with no event_id of its own - it reaches one through
    // schedules - so its test accounts are dropped in the grouping loop below
    // rather than by a filter.
    supabase
      .from('message_deliveries')
      .select('id, error_code, created_at, schedules!inner(id, event_id, events(title))')
      .eq('status', 'failed')
      .gte('created_at', daysAgo(FAILED_DELIVERY_LOOKBACK_DAYS)),

    excludeIds(
      supabase
        .from('call_rounds')
        .select('id, created_at, event_id, schedule_id, events(title)')
        .is('completed_at', null)
        .lt('created_at', daysAgo(STALE_CALL_ROUND_DAYS)),
      'event_id',
      test.eventIds,
    ),
  ]);

  const signals: Signal[] = [];

  for (const row of unwrap(overdue)) {
    const event = row.events as unknown as { title: string | null } | null;
    const type = row.schedule_types as unknown as { name: string | null } | null;
    const stage = type?.name ?? 'Schedule';
    signals.push({
      id: `overdue_schedule:${row.id}`,
      kind: 'overdue_schedule',
      eventId: row.event_id,
      eventTitle: event?.title ?? 'Untitled event',
      headline: `${stage} send overdue ${duration(row.scheduled_date)}`,
      detail: `Scheduled ${formatScheduleDateTime(row.scheduled_date, row.scheduled_time)}, never sent`,
      occurredAt: row.scheduled_date,
      href: `/admin/events/${row.event_id}#schedule-${row.id}`,
    });
  }

  // Grouped by Event on purpose: 40 failures on one event is one problem, not
  // 40 rows the Operator has to read past.
  const byEvent = new Map<
    string,
    { title: string; count: number; codes: Map<number, number>; oldest: string; scheduleId: string }
  >();
  for (const row of unwrap(failed)) {
    const schedule = row.schedules as unknown as {
      id: string;
      event_id: string;
      events: { title: string | null } | null;
    } | null;
    if (!schedule?.event_id || testEventIds.has(schedule.event_id)) continue;

    const entry = byEvent.get(schedule.event_id) ?? {
      title: schedule.events?.title ?? 'Untitled event',
      count: 0,
      codes: new Map<number, number>(),
      oldest: row.created_at,
      scheduleId: schedule.id,
    };
    entry.count += 1;
    if (row.error_code != null) {
      entry.codes.set(row.error_code, (entry.codes.get(row.error_code) ?? 0) + 1);
    }
    if (row.created_at < entry.oldest) entry.oldest = row.created_at;
    byEvent.set(schedule.event_id, entry);
  }

  for (const [eventId, entry] of byEvent) {
    const codes = [...entry.codes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, n]) => (n > 1 ? `error ${code} x${n}` : `error ${code}`))
      .join(', ');
    signals.push({
      id: `failed_delivery:${eventId}`,
      kind: 'failed_delivery',
      eventId,
      eventTitle: entry.title,
      headline: `${entry.count} ${entry.count === 1 ? 'delivery' : 'deliveries'} failed`,
      detail: codes || 'No error code recorded',
      occurredAt: entry.oldest,
      href: `/admin/events/${eventId}#schedule-${entry.scheduleId}-failures`,
    });
  }

  const staleRounds = unwrap(stale);

  // A round's call_logs are its immutable audience snapshot. Comparing against
  // today's whole event list invents progress changes after the round started.
  const calledPerRound = new Map<string, number>();
  const snapshotPerRound = new Map<string, number>();
  const labels = new Map<string, string>();
  if (staleRounds.length) {
    const [logs, siblings] = await Promise.all([
      supabase
        .from('call_logs')
        .select('round_id, outcome')
        .in(
          'round_id',
          staleRounds.map((r) => r.id),
        ),
      supabase
        .from('schedules')
        .select('id, event_id, schedule_type_id, schedule_types(name)')
        .in('event_id', [...new Set(staleRounds.map((round) => round.event_id))])
        .order('scheduled_date', { ascending: true }),
    ]);
    for (const log of unwrap(logs)) {
      snapshotPerRound.set(log.round_id, (snapshotPerRound.get(log.round_id) ?? 0) + 1);
      if (log.outcome !== null) {
        calledPerRound.set(log.round_id, (calledPerRound.get(log.round_id) ?? 0) + 1);
      }
    }
    const siblingRows = unwrap(siblings);
    for (const round of staleRounds) {
      if (!round.schedule_id) continue;
      const schedule = siblingRows.find((row) => row.id === round.schedule_id);
      if (!schedule) continue;
      const sameType = siblingRows.filter((row) => row.event_id === schedule.event_id && row.schedule_type_id === schedule.schedule_type_id);
      const type = schedule.schedule_types as unknown as { name: string | null } | null;
      const base = type?.name ?? 'Call Round';
      labels.set(round.id, sameType.length > 1 ? `${base} ${sameType.findIndex((row) => row.id === schedule.id) + 1}` : base);
    }
  }

  for (const row of staleRounds) {
    const event = row.events as unknown as { title: string | null } | null;
    const called = calledPerRound.get(row.id) ?? 0;
    const total = snapshotPerRound.get(row.id) ?? 0;
    const label = labels.get(row.id) ?? 'Call Round';
    signals.push({
      id: `stale_call_round:${row.id}`,
      kind: 'stale_call_round',
      eventId: row.event_id,
      eventTitle: event?.title ?? 'Untitled event',
      headline: `${label} open ${duration(row.created_at)}`,
      detail: `${called} of ${total} guest records called`,
      occurredAt: row.created_at,
      href: `/admin/events/${row.event_id}#schedule-${row.schedule_id}`,
    });
  }

  // Severity rank first, then whatever has been wrong longest.
  return signals.sort(
    (a, b) =>
      SEVERITY[a.kind] - SEVERITY[b.kind] || a.occurredAt.localeCompare(b.occurredAt),
  );
}

export async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const test = await getTestScope();

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endUtc = new Date(todayUtc.getTime() + UPCOMING_WINDOW_DAYS * 86_400_000);
  const events = unwrap(
    await excludeIds(
      supabase
        .from('events')
        .select('id, title, event_date, user_id, event_types(name)')
        .eq('status', 'published')
        .gte('event_date', todayUtc.toISOString())
        .lt('event_date', endUtc.toISOString())
        .order('event_date', { ascending: true }),
      'user_id',
      test.userIds,
    ),
  );

  if (!events.length) return [];

  // events.user_id points at auth.users, not profiles - there is no foreign key
  // between them, so the owner cannot be embedded and is looked up separately.
  const owners = unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in(
        'id',
        events.map((e) => e.user_id),
      ),
  );
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  // One aggregate pass over guests rather than a query per event.
  const guests = unwrap(
    await supabase
      .from('guests')
      .select('event_id, rsvp_status')
      .in(
        'event_id',
        events.map((e) => e.id),
      ),
  );

  const tally = new Map<string, { total: number; confirmed: number }>();
  for (const guest of guests) {
    if (!guest.event_id) continue;
    const entry = tally.get(guest.event_id) ?? { total: 0, confirmed: 0 };
    entry.total += 1;
    if (guest.rsvp_status === 'confirmed') entry.confirmed += 1;
    tally.set(guest.event_id, entry);
  }

  return events.map((event) => {
    const counts = tally.get(event.id) ?? { total: 0, confirmed: 0 };
    const type = event.event_types as unknown as { name: string | null } | null;
    const owner = ownerById.get(event.user_id);

    return {
      id: event.id,
      title: event.title ?? 'Untitled event',
      eventDate: event.event_date,
      eventTypeName: type?.name ?? 'Event',
      ownerName: owner?.full_name || owner?.email || 'Unknown owner',
      guestRecords: counts.total,
      confirmed: counts.confirmed,
      // Null, not zero: an empty guest list has no rate, and rendering 0%
      // would read as a failing campaign rather than as "no list yet".
      confirmationRate: counts.total > 0 ? counts.confirmed / counts.total : null,
    };
  });
}
