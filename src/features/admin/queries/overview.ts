'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { OverviewCounts, Signal, UpcomingEvent } from '../types';
import { excludeIds, getTestScope } from './test-accounts';

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

function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
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
      .select('id, error_code, created_at, schedules!inner(event_id, events(title))')
      .eq('status', 'failed')
      .gte('created_at', daysAgo(FAILED_DELIVERY_LOOKBACK_DAYS)),

    excludeIds(
      supabase
        .from('call_rounds')
        .select('id, round_number, created_at, event_id, events(title)')
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
      detail: `Scheduled ${formatDateTime(row.scheduled_date, row.scheduled_time)}, never sent`,
      occurredAt: row.scheduled_date,
      href: `/admin/events/${row.event_id}`,
    });
  }

  // Grouped by Event on purpose: 40 failures on one event is one problem, not
  // 40 rows the Operator has to read past.
  const byEvent = new Map<
    string,
    { title: string; count: number; codes: Map<number, number>; oldest: string }
  >();
  for (const row of unwrap(failed)) {
    const schedule = row.schedules as unknown as {
      event_id: string;
      events: { title: string | null } | null;
    } | null;
    if (!schedule?.event_id || testEventIds.has(schedule.event_id)) continue;

    const entry = byEvent.get(schedule.event_id) ?? {
      title: schedule.events?.title ?? 'Untitled event',
      count: 0,
      codes: new Map<number, number>(),
      oldest: row.created_at,
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
      href: `/admin/events/${eventId}`,
    });
  }

  const staleRounds = unwrap(stale);

  // "40 of 120 guests called" - how far the abandoned round actually got.
  const calledPerRound = new Map<string, number>();
  const guestsPerEvent = new Map<string, number>();
  if (staleRounds.length) {
    const [logs, guests] = await Promise.all([
      supabase
        .from('call_logs')
        .select('round_id')
        .in(
          'round_id',
          staleRounds.map((r) => r.id),
        ),
      supabase
        .from('guests')
        .select('event_id')
        .in(
          'event_id',
          staleRounds.map((r) => r.event_id),
        ),
    ]);
    for (const log of unwrap(logs)) {
      calledPerRound.set(log.round_id, (calledPerRound.get(log.round_id) ?? 0) + 1);
    }
    for (const guest of unwrap(guests)) {
      if (!guest.event_id) continue;
      guestsPerEvent.set(guest.event_id, (guestsPerEvent.get(guest.event_id) ?? 0) + 1);
    }
  }

  for (const row of staleRounds) {
    const event = row.events as unknown as { title: string | null } | null;
    const called = calledPerRound.get(row.id) ?? 0;
    const total = guestsPerEvent.get(row.event_id) ?? 0;
    signals.push({
      id: `stale_call_round:${row.id}`,
      kind: 'stale_call_round',
      eventId: row.event_id,
      eventTitle: event?.title ?? 'Untitled event',
      headline: `Call Round ${row.round_number} open ${duration(row.created_at)}`,
      detail: `${called} of ${total} guests called`,
      occurredAt: row.created_at,
      href: `/admin/events/${row.event_id}`,
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

  const events = unwrap(
    await excludeIds(
      supabase
        .from('events')
        .select('id, title, event_date, user_id, event_types(name)')
        .eq('status', 'published')
        .gte('event_date', new Date().toISOString())
        .lte('event_date', daysAhead(UPCOMING_WINDOW_DAYS))
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatDateTime(iso: string, time: string | null): string {
  const date = formatDate(iso);
  return time ? `${date} ${time.slice(0, 5)}` : date;
}
