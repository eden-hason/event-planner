'use server';

import { cache } from 'react';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { validatePhoneNumber } from '@/features/schedules';
import type {
  EventGuestSummary,
  EventIdentity,
  EventIndexRow,
  EventRouteState,
  EventsIndexFilters,
  EventsIndexPage,
  EventTimelineRow,
  EventWorkspaceSignal,
} from '../types';
import { eventDaysFromToday } from '@/lib/date-time';
import { getTestScope } from './test-accounts';

const PAGE_SIZE = 50;
const STALE_ROUND_MS = 3 * 86_400_000;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Query returned no data');
  return result.data;
}

function eventType(value: unknown): { name?: string | null; key?: string | null } | null {
  if (Array.isArray(value)) return (value[0] as { name?: string | null; key?: string | null }) ?? null;
  return (value as { name?: string | null; key?: string | null } | null) ?? null;
}

function setupReason(input: {
  status: string | null;
  canCreateSchedules: boolean;
  guestRecords: number;
  schedules: number;
}): string | null {
  if (input.status !== 'published') return null;
  if (!input.canCreateSchedules) return 'Sending not enabled';
  if (input.guestRecords === 0) return 'No guest list';
  if (input.schedules === 0) return 'No outreach';
  return null;
}

type BaseEventRow = {
  id: string;
  user_id: string;
  title: string | null;
  status: string | null;
  event_date: string | null;
  onboarding_step: string | null;
  can_create_schedules: boolean | null;
  event_types: unknown;
};

export async function getEventsIndex(filters: EventsIndexFilters): Promise<EventsIndexPage> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();

  const events = unwrap(
    await supabase
      .from('events')
      .select('id, user_id, title, status, event_date, onboarding_step, can_create_schedules, event_types(name, key)')
      .in('status', ['published', 'draft'])
      .order('created_at', { ascending: false }),
  ).filter((row) => !test.userIds.includes(row.user_id)) as unknown as BaseEventRow[];

  if (!events.length) {
    return {
      rows: [], totalRows: 0, page: 1, pageSize: PAGE_SIZE, pageCount: 1,
      totals: { publishedEvents: 0, draftEvents: 0, guestRecords: 0, actualGuests: 0 },
    };
  }

  const eventIds = events.map((event) => event.id);
  const ownerIds = [...new Set(events.map((event) => event.user_id))];
  const [ownersResult, guestsResult, schedulesResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').in('id', ownerIds),
    supabase.from('guests').select('event_id, amount, rsvp_status').in('event_id', eventIds),
    supabase.from('schedules').select('event_id, schedule_types(execution_kind)').in('event_id', eventIds),
  ]);
  const owners = unwrap(ownersResult);
  const guests = unwrap(guestsResult);
  const schedules = unwrap(schedulesResult);

  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
  const guestTallies = new Map<string, { records: number; actual: number; confirmed: number }>();
  for (const guest of guests) {
    if (!guest.event_id) continue;
    const tally = guestTallies.get(guest.event_id) ?? { records: 0, actual: 0, confirmed: 0 };
    tally.records += 1;
    tally.actual += guest.amount ?? 1;
    if (guest.rsvp_status === 'confirmed') tally.confirmed += 1;
    guestTallies.set(guest.event_id, tally);
  }
  const schedulesByEvent = new Map<string, number>();
  const outreachByEvent = new Map<string, { messages: number; calls: number }>();
  for (const schedule of schedules) {
    schedulesByEvent.set(schedule.event_id, (schedulesByEvent.get(schedule.event_id) ?? 0) + 1);
    const type = schedule.schedule_types as unknown as { execution_kind: string | null } | null;
    const tally = outreachByEvent.get(schedule.event_id) ?? { messages: 0, calls: 0 };
    if (type?.execution_kind === 'phone_call') tally.calls += 1;
    else tally.messages += 1;
    outreachByEvent.set(schedule.event_id, tally);
  }

  const allRows: EventIndexRow[] = events.map((event) => {
    const owner = ownerById.get(event.user_id);
    const tally = guestTallies.get(event.id) ?? { records: 0, actual: 0, confirmed: 0 };
    return {
      id: event.id,
      title: event.title?.trim() || 'Untitled event',
      status: event.status === 'draft' ? 'draft' : 'published',
      eventDate: event.event_date,
      eventTypeName: eventType(event.event_types)?.name ?? eventType(event.event_types)?.key ?? 'Event',
      ownerName: owner?.full_name || owner?.email || 'Unknown owner',
      ownerEmail: owner?.email ?? null,
      guestRecords: tally.records,
      actualGuests: tally.actual,
      confirmedRecords: tally.confirmed,
      confirmationRate: tally.records ? tally.confirmed / tally.records : null,
      setupReason: setupReason({
        status: event.status,
        canCreateSchedules: event.can_create_schedules ?? false,
        guestRecords: tally.records,
        schedules: schedulesByEvent.get(event.id) ?? 0,
      }),
      onboardingStep: event.onboarding_step,
      messageSchedules: outreachByEvent.get(event.id)?.messages ?? 0,
      callPlans: outreachByEvent.get(event.id)?.calls ?? 0,
    };
  });

  const published = allRows.filter((row) => row.status === 'published');
  const totals = {
    publishedEvents: published.length,
    draftEvents: allRows.length - published.length,
    guestRecords: published.reduce((sum, row) => sum + row.guestRecords, 0),
    actualGuests: published.reduce((sum, row) => sum + row.actualGuests, 0),
  };

  const needle = filters.q.trim().toLocaleLowerCase('en');
  const visible = allRows.filter((row) => {
    if (filters.status !== 'all' && row.status !== filters.status) return false;
    if (filters.needsSetup && !row.setupReason) return false;
    if (!needle) return true;
    return [row.title, row.ownerName, row.ownerEmail ?? ''].some((value) =>
      value.toLocaleLowerCase('en').includes(needle),
    );
  });

  visible.sort((a, b) => {
    const aDays = eventDaysFromToday(a.eventDate);
    const bDays = eventDaysFromToday(b.eventDate);
    const group = (days: number | null) => days === null ? 2 : days >= 0 ? 0 : 1;
    const groupDifference = group(aDays) - group(bDays);
    if (groupDifference) return groupDifference;
    if (aDays === null || bDays === null) return a.title.localeCompare(b.title);
    return group(aDays) === 1 ? bDays - aDays : aDays - bDays;
  });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  return {
    rows: visible.slice(start, start + PAGE_SIZE),
    totalRows: visible.length,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
    totals,
  };
}

export async function getEventRouteState(eventId: string): Promise<EventRouteState | null> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();
  if (test.eventIds.includes(eventId)) return null;
  const { data, error } = await supabase
    .from('events')
    .select('status, can_create_schedules')
    .eq('id', eventId)
    .in('status', ['published', 'draft'])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    status: data.status === 'draft' ? 'draft' : 'published',
    canCreateSchedules: data.can_create_schedules ?? false,
  };
}

export const getEventIdentity = cache(async function getEventIdentity(eventId: string): Promise<EventIdentity | null> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();
  if (test.eventIds.includes(eventId)) return null;

  const { data: event, error } = await supabase
    .from('events')
    .select('id, user_id, title, status, event_date, event_types(name, key), location, ceremony_time, reception_time, short_code, can_create_schedules, onboarding_step, created_at, host_details')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) return null;

  const [ownerResult, collaboratorsResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone_number').eq('id', event.user_id).maybeSingle(),
    supabase
      .from('event_collaborators')
      .select('id, user_id, role, is_creator, profiles!event_collaborators_user_id_profiles_fk(full_name, email)')
      .eq('event_id', eventId)
      .eq('is_creator', false),
  ]);
  if (ownerResult.error) throw new Error(ownerResult.error.message);
  const collaborators = unwrap(collaboratorsResult);
  const owner = ownerResult.data;
  const location = event.location as { name?: string } | null;
  const hosts = event.host_details as Record<string, { name?: string } | string> | null;
  const hostNames = Object.values(hosts ?? {}).flatMap((value) => {
    const name = typeof value === 'string' ? value : value?.name;
    return name?.trim() ? [name.trim()] : [];
  });

  return {
    id: event.id,
    title: event.title?.trim() || 'Untitled event',
    status: event.status === 'draft' ? 'draft' : 'published',
    eventTypeName: eventType(event.event_types)?.name ?? eventType(event.event_types)?.key ?? 'Event',
    eventDate: event.event_date,
    daysFromToday: eventDaysFromToday(event.event_date),
    locationName: location?.name ?? null,
    ceremonyTime: event.ceremony_time,
    receptionTime: event.reception_time,
    shortCode: event.short_code,
    canCreateSchedules: event.can_create_schedules ?? false,
    onboardingStep: event.onboarding_step,
    createdAt: event.created_at,
    owner: {
      name: owner?.full_name || owner?.email || 'Unknown owner',
      email: owner?.email ?? null,
      phone: owner?.phone_number ?? null,
    },
    collaborators: collaborators.map((row) => {
      const profile = row.profiles as unknown as { full_name: string | null; email: string | null } | null;
      return {
        id: row.id,
        name: profile?.full_name || profile?.email || 'Unknown collaborator',
        email: profile?.email ?? null,
        role: row.role,
      };
    }),
    hostNames,
  };
});

export async function getEventGuestSummary(eventId: string): Promise<EventGuestSummary> {
  await assertAdmin();
  const supabase = createServiceClient();
  const [guestsResult, groupsResult] = await Promise.all([
    supabase
      .from('guests')
      .select('id, name, phone_number, amount, rsvp_status, group_id, is_offline_rsvp, rsvp_change_source, groups(name)')
      .eq('event_id', eventId),
    supabase.from('groups').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ]);
  const guests = unwrap(guestsResult);
  if (groupsResult.error) throw new Error(groupsResult.error.message);

  const summary: EventGuestSummary = {
    guestRecords: guests.length,
    actualGuests: guests.reduce((sum, guest) => sum + (guest.amount ?? 1), 0),
    groups: groupsResult.count ?? 0,
    offlineRecords: guests.filter((guest) => guest.is_offline_rsvp).length,
    confirmed: guests.filter((guest) => guest.rsvp_status === 'confirmed').length,
    declined: guests.filter((guest) => guest.rsvp_status === 'declined').length,
    pending: guests.filter((guest) => guest.rsvp_status === 'pending').length,
    provenance: [],
    unusablePhones: [],
  };

  const labels: Record<string, string> = {
    guest: 'Guest response',
    manual: 'Owner update',
    admin_call: 'Back Office call',
    pending: 'No response yet',
    unknown: 'Before source tracking',
  };
  for (const key of ['guest', 'manual', 'admin_call', 'unknown', 'pending']) {
    const rows = guests.filter((guest) =>
      key === 'pending'
        ? guest.rsvp_status === 'pending'
        : guest.rsvp_status !== 'pending'
          && (key === 'unknown' ? !guest.rsvp_change_source : guest.rsvp_change_source === key),
    );
    if (!rows.length) continue;
    summary.provenance.push({
      label: labels[key],
      confirmed: rows.filter((row) => row.rsvp_status === 'confirmed').length,
      declined: rows.filter((row) => row.rsvp_status === 'declined').length,
      total: rows.length,
    });
  }
  summary.unusablePhones = guests
    .filter((guest) => !validatePhoneNumber(guest.phone_number))
    .map((guest) => ({
      id: guest.id,
      name: guest.name,
      groupName: (guest.groups as unknown as { name: string } | null)?.name ?? null,
      phone: guest.phone_number,
    }));
  return summary;
}

type ScheduleJoinRow = {
  id: string;
  event_id: string;
  schedule_type_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  sent_at: string | null;
  status: string | null;
  target_status: string | null;
  schedule_types: unknown;
  message_templates: unknown;
};

export async function getEventTimeline(eventId: string): Promise<EventTimelineRow[]> {
  await assertAdmin();
  const supabase = createServiceClient();
  const schedules = unwrap(
    await supabase
      .from('schedules')
      .select('id, event_id, schedule_type_id, scheduled_date, scheduled_time, sent_at, status, target_status, schedule_types(name, execution_kind), message_templates(channel)')
      .eq('event_id', eventId)
      .order('scheduled_date', { ascending: true }),
  ) as unknown as ScheduleJoinRow[];
  if (!schedules.length) return [];

  const scheduleIds = schedules.map((row) => row.id);
  const [guestsResult, deliveriesResult, roundsResult] = await Promise.all([
    supabase.from('guests').select('id, name, phone_number, rsvp_status').eq('event_id', eventId),
    supabase
      .from('message_deliveries')
      .select('id, schedule_id, guest_id, status, error_message, error_code, created_at, sent_at, triggered_by, guests(name, phone_number)')
      .in('schedule_id', scheduleIds)
      .in('status', ['sent', 'failed']),
    supabase
      .from('call_rounds')
      .select('id, schedule_id, created_at, completed_at, call_logs(id, notes, outcome)')
      .in('schedule_id', scheduleIds),
  ]);
  const guests = unwrap(guestsResult);
  const deliveries = unwrap(deliveriesResult);
  const rounds = unwrap(roundsResult);
  const roundBySchedule = new Map(rounds.map((row) => [row.schedule_id, row]));

  const position = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const schedule of schedules) {
    const key = schedule.schedule_type_id;
    totals.set(key, (totals.get(key) ?? 0) + 1);
    position.set(schedule.id, totals.get(key)!);
  }

  return schedules.map((schedule) => {
    const scheduleType = eventType(schedule.schedule_types) as { name?: string | null; execution_kind?: string | null } | null;
    const base = scheduleType?.name ?? 'Schedule';
    const title = (totals.get(schedule.schedule_type_id) ?? 0) > 1
      ? `${base} ${position.get(schedule.id)}`
      : base;
    const isCall = scheduleType?.execution_kind === 'phone_call';
    const round = roundBySchedule.get(schedule.id);
    const logs = (round?.call_logs ?? []) as { id: string; notes: string | null; outcome: string | null }[];
    const target = guests.filter((guest) => !schedule.target_status || guest.rsvp_status === schedule.target_status);
    const scheduleDeliveries = deliveries.filter((delivery) => delivery.schedule_id === schedule.id);
    const template = schedule.message_templates as unknown as { channel: string | null } | null;
    const status: EventTimelineRow['status'] = isCall && round
      ? round.completed_at ? 'completed' : 'in_progress'
      : schedule.status === 'cancelled' ? 'cancelled'
        : schedule.status === 'sent' ? 'sent' : 'planned';
    return {
      id: schedule.id,
      kind: isCall ? 'call' : 'message',
      title,
      status,
      scheduledDate: schedule.scheduled_date,
      scheduledTime: schedule.scheduled_time,
      sentAt: schedule.sent_at,
      targetStatus: schedule.target_status,
      channel: template?.channel ?? null,
      audienceCount: target.length,
      roundId: round?.id ?? null,
      roundStartedAt: round?.created_at ?? null,
      roundCompletedAt: round?.completed_at ?? null,
      calledCount: logs.filter((log) => log.outcome !== null).length,
      roundGuestCount: logs.length,
      notesCount: logs.filter((log) => !!log.notes?.trim()).length,
      deliveries: scheduleDeliveries.map((delivery) => {
        const guest = delivery.guests as unknown as { name: string; phone_number: string | null } | null;
        return {
          id: delivery.id,
          guestId: delivery.guest_id,
          guestName: guest?.name ?? 'Unknown guest',
          guestPhone: guest?.phone_number ?? null,
          status: delivery.status,
          errorMessage: delivery.error_message,
          errorCode: delivery.error_code,
          createdAt: delivery.created_at,
          sentAt: delivery.sent_at,
          triggeredBy: delivery.triggered_by,
        };
      }),
    };
  });
}

export async function getEventSignals(eventId: string): Promise<EventWorkspaceSignal[]> {
  await assertAdmin();
  const timeline = await getEventTimeline(eventId);
  const now = Date.now();
  const failureCutoff = now - 30 * 86_400_000;
  const signals: EventWorkspaceSignal[] = [];
  let failedCount = 0;
  let firstFailedSchedule: EventTimelineRow | null = null;
  for (const row of timeline) {
    if (row.status === 'planned' && new Date(row.scheduledDate).getTime() < now) {
      signals.push({
        id: `overdue:${row.id}`,
        kind: 'overdue_schedule',
        headline: `${row.title} is overdue`,
        detail: 'The planned date has passed and this work has not started',
        href: `#schedule-${row.id}`,
      });
    }
    const failures = row.deliveries.filter(
      (delivery) => delivery.status === 'failed'
        && new Date(delivery.createdAt).getTime() >= failureCutoff,
    );
    if (failures.length) {
      failedCount += failures.length;
      firstFailedSchedule ??= row;
    }
    if (row.status === 'in_progress' && row.roundStartedAt && now - new Date(row.roundStartedAt).getTime() > STALE_ROUND_MS) {
      signals.push({
        id: `stale:${row.roundId}`,
        kind: 'stale_call_round',
        headline: `${row.title} is still open`,
        detail: `${row.calledCount} of ${row.roundGuestCount} guest records called`,
        href: `#schedule-${row.id}`,
      });
    }
  }
  if (firstFailedSchedule) {
    signals.push({
      id: `failed:${eventId}`,
      kind: 'failed_delivery',
      headline: `${failedCount} ${failedCount === 1 ? 'delivery' : 'deliveries'} failed`,
      detail: 'Failed deliveries recorded in the last 30 days',
      href: `#schedule-${firstFailedSchedule.id}-failures`,
    });
  }
  const severity = { overdue_schedule: 0, failed_delivery: 1, stale_call_round: 2 } as const;
  return signals.sort((a, b) => severity[a.kind] - severity[b.kind]);
}
