'use server';

import { cache } from 'react';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { pageAll } from '@/lib/supabase/row-cap';
import { canReceiveSms } from '@/lib/phone';
import {
  classifyWhatsAppFailure,
  comparePlanOrder,
  isFollowUpConfirmation,
  numberPlan,
  planEntryFromRow,
  validatePhoneNumber,
} from '@/features/schedules';
import type { EventBillingStatus, RecordPackageChannel } from '@/features/billing';
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
import { eventDaysFromToday, israelWallClockParts } from '@/lib/date-time';
import { getTestScope } from './test-accounts';
import { isNoAskPlanned } from '../utils/no-ask-planned';
import { filterEventRows, sortEventRows } from '../utils/events-index';
import { eventTitle, eventTypeName, scheduleTypeName, UNKNOWN_OWNER } from '../utils/labels';
import {
  conversionRejection,
  deletionRejection,
  dueTimeRejection,
  type ScheduleControlState,
} from '../utils/schedule-controls';

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

type BaseEventRow = {
  id: string;
  user_id: string;
  title: string | null;
  status: string | null;
  event_date: string | null;
  created_at: string;
  billing_status: EventBillingStatus | null;
  event_types: unknown;
  guests: { count: number }[];
  /** At most one row: the newest payment. */
  event_billing_events: { channel: RecordPackageChannel | null }[];
};

/** An embedded `relation(count)` comes back as `[{ count }]`. */
function embeddedCount(value: { count: number }[] | null | undefined): number {
  return value?.[0]?.count ?? 0;
}

/**
 * Every Event in scope, filtered, sorted and paged here rather than in SQL: the
 * search spans the owner's profile, and at this volume one pass over the rows
 * is cheaper than a view to keep in step. Guest Records are counted and the
 * newest payment picked in the database - fetching those rows themselves ran
 * into PostgREST's 1,000-row cap and undercounted.
 */
export async function getEventsIndex(filters: EventsIndexFilters): Promise<EventsIndexPage> {
  await assertAdmin();
  const supabase = createServiceClient();
  const [test, eventsResult, typesResult] = await Promise.all([
    getTestScope(),
    supabase
      .from('events')
      .select('id, user_id, title, status, event_date, created_at, billing_status, event_types(name, key), guests(count), event_billing_events(channel)')
      .in('status', ['published', 'draft'])
      // The package is the channel of the newest payment.
      .not('event_billing_events.record_count', 'is', null)
      .order('occurred_at', { referencedTable: 'event_billing_events', ascending: false })
      .order('created_at', { referencedTable: 'event_billing_events', ascending: false })
      .limit(1, { referencedTable: 'event_billing_events' }),
    supabase.from('event_types').select('key, name').order('name'),
  ]);
  const testUserIds = new Set(test.userIds);
  const events = (unwrap(eventsResult) as unknown as BaseEventRow[])
    .filter((row) => !testUserIds.has(row.user_id));
  const eventTypes = unwrap(typesResult).map((type) => ({ key: type.key, name: eventTypeName(type.key, type.name) }));

  const ownerIds = [...new Set(events.map((event) => event.user_id))];
  const owners = ownerIds.length
    ? unwrap(await supabase.from('profiles').select('id, full_name, email, phone_number').in('id', ownerIds))
    : [];
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

  const allRows: EventIndexRow[] = events.map((event) => {
    const owner = ownerById.get(event.user_id);
    const type = eventType(event.event_types);
    return {
      id: event.id,
      title: eventTitle(event.title),
      status: event.status === 'draft' ? 'draft' : 'published',
      eventDate: event.event_date,
      createdAt: event.created_at,
      eventTypeKey: type?.key ?? null,
      eventTypeName: eventTypeName(type?.key, type?.name),
      ownerName: owner?.full_name?.trim() || owner?.email || UNKNOWN_OWNER,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone_number ?? null,
      billingStatus: event.billing_status ?? 'free',
      packageChannel: event.event_billing_events[0]?.channel ?? null,
      guestRecords: embeddedCount(event.guests),
    };
  });

  const now = new Date();
  const visible = sortEventRows(filterEventRows(allRows, filters, now), filters.sort, filters.dir, now);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  return {
    rows: visible.slice(start, start + PAGE_SIZE),
    totalRows: visible.length,
    totalEvents: allRows.length,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
    eventTypes,
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
    .select('id, user_id, title, status, event_date, event_types(name, key), location, ceremony_time, reception_time, short_code, can_create_schedules, billing_status, sms_fallback_enabled, onboarding_step, created_at, host_details')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) return null;

  const [ownerResult, collaboratorsResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone_number').eq('id', event.user_id).maybeSingle(),
    supabase
      .from('event_collaborators')
      .select('id, user_id, is_creator, profiles!event_collaborators_user_id_profiles_fk(full_name, email)')
      .eq('event_id', eventId)
      .eq('is_creator', false),
  ]);
  if (ownerResult.error) throw new Error(ownerResult.error.message);
  const collaborators = unwrap(collaboratorsResult);
  const owner = ownerResult.data;
  const location = event.location as { name?: string } | null;
  const hosts = event.host_details as Record<string, { name?: string; parents?: string } | string> | null;
  const hostNames = Object.values(hosts ?? {}).flatMap((value) => {
    const name = typeof value === 'string' ? value : value?.name;
    return name?.trim() ? [name.trim()] : [];
  });
  const parentNames = Object.values(hosts ?? {}).flatMap((value) => {
    const parents = typeof value === 'string' ? undefined : value?.parents;
    return parents?.trim() ? [parents.trim()] : [];
  });

  return {
    id: event.id,
    title: eventTitle(event.title),
    status: event.status === 'draft' ? 'draft' : 'published',
    eventTypeName: eventTypeName(eventType(event.event_types)?.key, eventType(event.event_types)?.name),
    eventDate: event.event_date,
    daysFromToday: eventDaysFromToday(event.event_date),
    locationName: location?.name ?? null,
    ceremonyTime: event.ceremony_time,
    receptionTime: event.reception_time,
    shortCode: event.short_code,
    canCreateSchedules: event.can_create_schedules ?? false,
    billingStatus: (event.billing_status as EventIdentity['billingStatus']) ?? 'free',
    smsFallbackEnabled: event.sms_fallback_enabled !== false,
    onboardingStep: event.onboarding_step,
    createdAt: event.created_at,
    ownerId: event.user_id,
    owner: {
      name: owner?.full_name || owner?.email || UNKNOWN_OWNER,
      email: owner?.email ?? null,
      phone: owner?.phone_number ?? null,
    },
    collaborators: collaborators.map((row) => {
      const profile = row.profiles as unknown as { full_name: string | null; email: string | null } | null;
      return {
        id: row.id,
        name: profile?.full_name || profile?.email || 'שותף לא ידוע',
        email: profile?.email ?? null,
      };
    }),
    hostNames,
    parentNames,
  };
});

// Cached per render: the guest list band and the outreach band both read it.
export const getEventGuestSummary = cache(async function getEventGuestSummary(
  eventId: string,
): Promise<EventGuestSummary> {
  await assertAdmin();
  const supabase = createServiceClient();
  // Paged, not a single read: one Event can hold more Guest Records than
  // PostgREST's 1,000-row cap, and the unusable phones need the rows themselves.
  const [guests, groupsResult] = await Promise.all([
    pageAll((from, to) =>
      supabase
        .from('guests')
        .select('id, name, phone_number, amount, rsvp_status, group_id, rsvp_change_source, groups(name)')
        .eq('event_id', eventId)
        .order('id')
        .range(from, to),
    ),
    supabase.from('groups').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ]);
  if (groupsResult.error) throw new Error(groupsResult.error.message);

  const summary: EventGuestSummary = {
    guestRecords: guests.length,
    actualGuests: guests.reduce((sum, guest) => sum + (guest.amount ?? 1), 0),
    groups: groupsResult.count ?? 0,
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
});

type ScheduleJoinRow = {
  id: string;
  event_id: string;
  schedule_type_id: string;
  scheduled_date: string | null;
  sent_at: string | null;
  dispatched_at: string | null;
  status: string | null;
  target_status: string | null;
  schedule_types: unknown;
  message_templates: unknown;
};

// Cached per render: the signals band and the outreach band both read it.
export const getEventTimeline = cache(async function getEventTimeline(
  eventId: string,
): Promise<EventTimelineRow[]> {
  await assertAdmin();
  const supabase = createServiceClient();
  const schedules = unwrap(
    await supabase
      .from('schedules')
      .select('id, event_id, schedule_type_id, scheduled_date, sent_at, dispatched_at, status, target_status, schedule_types(key, name, execution_kind), message_templates(channel)')
      .eq('event_id', eventId),
  ) as unknown as ScheduleJoinRow[];
  if (!schedules.length) return [];

  // The Owner's plan order and numbering (ADR 0029), so "Confirmation 2" here
  // is the Owner's "Confirmation 2".
  const entries = new Map(schedules.map((row) => [row.id, planEntryFromRow(row)]));
  const numbers = numberPlan([...entries.values()]);
  schedules.sort((a, b) => comparePlanOrder(entries.get(a.id)!, entries.get(b.id)!));

  const scheduleIds = schedules.map((row) => row.id);
  // Guests and deliveries are paged: every send to an Event adds a delivery per
  // Guest Record, so a few sends put one Event past PostgREST's 1,000-row cap.
  const [guests, deliveries, roundsResult] = await Promise.all([
    pageAll((from, to) =>
      supabase
        .from('guests')
        .select('id, name, phone_number, rsvp_status')
        .eq('event_id', eventId)
        .order('id')
        .range(from, to),
    ),
    pageAll((from, to) =>
      supabase
        .from('message_deliveries')
        .select('id, schedule_id, guest_id, status, delivery_method, error_message, error_code, created_at, sent_at, triggered_by, guests(name, phone_number), message_delivery_attempts(channel)')
        .in('schedule_id', scheduleIds)
        // Every state a delivery can settle in. Filtering to sent/failed dropped a
        // delivery from the timeline the moment the webhook marked it delivered.
        .in('status', ['sent', 'delivered', 'read', 'failed', 'not_sent'])
        .order('id')
        .range(from, to),
    ),
    supabase
      .from('call_rounds')
      .select('id, schedule_id, created_at, completed_at, call_logs(id, notes, outcome)')
      .in('schedule_id', scheduleIds),
  ]);
  const rounds = unwrap(roundsResult);
  const roundBySchedule = new Map(rounds.map((row) => [row.schedule_id, row]));

  // What the ConvertDialog warns about: the plan as it would read with each
  // convertible Invitation already a Confirmation.
  const roundEntries = schedules.map((row) => ({ ...entries.get(row.id)!, status: row.status }));

  const rows: EventTimelineRow[] = schedules.map((schedule) => {
    const scheduleType = eventType(schedule.schedule_types) as { name?: string | null; execution_kind?: string | null } | null;
    const typeKey = entries.get(schedule.id)?.scheduleTypeKey ?? '';
    const base = scheduleTypeName(typeKey, scheduleType?.name);
    const number = numbers.get(schedule.id);
    const title = number && number.total > 1 ? `${base} ${number.index}` : base;
    const isCall = scheduleType?.execution_kind === 'phone_call';
    const kind = isCall ? 'call' : 'message';
    const round = roundBySchedule.get(schedule.id);
    const logs = (round?.call_logs ?? []) as { id: string; notes: string | null; outcome: string | null }[];
    const target = guests.filter((guest) => !schedule.target_status || guest.rsvp_status === schedule.target_status);
    const scheduleDeliveries = deliveries.filter((delivery) => delivery.schedule_id === schedule.id);
    const template = schedule.message_templates as unknown as { channel: string | null } | null;
    // The Dispatcher claims a Schedule by setting dispatched_at and never writes
    // status = 'sent', so a claimed one reads as sent - same as timelineStatus.
    const status: EventTimelineRow['status'] = isCall && round
      ? round.completed_at ? 'completed' : 'in_progress'
      : schedule.status === 'cancelled' ? 'cancelled'
        : schedule.status === 'sent' || schedule.dispatched_at ? 'sent' : 'planned';
    const controlState: ScheduleControlState = {
      scheduleTypeKey: typeKey,
      kind,
      status: schedule.status,
      dispatchedAt: schedule.dispatched_at,
      sentAt: schedule.sent_at,
      hasRound: !!round,
    };
    const convertible = conversionRejection(controlState) === null;
    return {
      id: schedule.id,
      kind,
      scheduleTypeKey: typeKey,
      title,
      status,
      scheduledDate: schedule.scheduled_date,
      scheduledTime: schedule.scheduled_date
        ? israelWallClockParts(schedule.scheduled_date).time
        : null,
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
          guestName: guest?.name ?? 'אורח לא ידוע',
          guestPhone: guest?.phone_number ?? null,
          status: delivery.status,
          errorMessage: delivery.error_message,
          errorCode: delivery.error_code,
          createdAt: delivery.created_at,
          sentAt: delivery.sent_at,
          triggeredBy: delivery.triggered_by,
          channel: delivery.delivery_method,
          hasSmsAttempt: ((delivery.message_delivery_attempts ?? []) as { channel: string }[])
            .some((attempt) => attempt.channel === 'sms'),
        };
      }),
      dueTimeEditable: dueTimeRejection(controlState) === null,
      convertible,
      // A Delivery or reply on record also blocks it; the action checks those.
      deletable: deletionRejection(controlState) === null && scheduleDeliveries.length === 0,
      convertsToFollowUp: convertible && isFollowUpConfirmation(
        { ...entries.get(schedule.id)!, scheduleTypeKey: 'confirmation', targetStatus: null },
        roundEntries,
      ),
      convertNarrows: [],
    };
  });

  // What converting an Invitation would narrow: every Confirmation that can
  // still change and still goes to everyone - the same rows the RPC updates.
  const narrowed = rows
    .filter((row) => row.scheduleTypeKey === 'confirmation' && row.targetStatus === null && row.dueTimeEditable)
    .map((row) => row.title);
  return rows.map((row) => (row.convertible ? { ...row, convertNarrows: narrowed } : row));
});

export async function getEventSignals(eventId: string): Promise<EventWorkspaceSignal[]> {
  await assertAdmin();
  // Both cached, and both already read by the rest of the workspace.
  const [timeline, event] = await Promise.all([
    getEventTimeline(eventId),
    getEventIdentity(eventId),
  ]);
  const now = Date.now();
  const failureCutoff = now - 30 * 86_400_000;
  const signals: EventWorkspaceSignal[] = [];
  let failedCount = 0;
  let fallbackCount = 0;
  let firstFailedSchedule: EventTimelineRow | null = null;
  for (const row of timeline) {
    // An Undated Schedule is never due, so never overdue (ADR 0029).
    if (
      row.status === 'planned'
      && row.scheduledDate
      && new Date(row.scheduledDate).getTime() < now
    ) {
      signals.push({
        id: `overdue:${row.id}`,
        kind: 'overdue_schedule',
        headline: `${row.title} באיחור`,
        detail: 'המועד המתוכנן עבר והעבודה עוד לא התחילה',
        href: `#schedule-${row.id}`,
      });
    }
    // Only failures an Operator can still act on: once a delivery has had an
    // SMS attempt, a guest unreachable on both channels is no longer a
    // messaging problem and must not hold the Signal open forever.
    const failures = row.deliveries.filter(
      (delivery) => delivery.status === 'failed'
        && !delivery.hasSmsAttempt
        && new Date(delivery.createdAt).getTime() >= failureCutoff,
    );
    if (failures.length) {
      failedCount += failures.length;
      // Under an SMS Fallback Opt-out no failure is an SMS case, but every one
      // still raises the Signal: an Operator handles them by hand.
      fallbackCount += failures.filter(
        (delivery) => event?.smsFallbackEnabled !== false
          && delivery.channel === 'whatsapp'
          && classifyWhatsAppFailure(delivery.errorCode) === 'guest'
          && canReceiveSms(delivery.guestPhone),
      ).length;
      firstFailedSchedule ??= row;
    }
    if (row.status === 'in_progress' && row.roundStartedAt && now - new Date(row.roundStartedAt).getTime() > STALE_ROUND_MS) {
      signals.push({
        id: `stale:${row.roundId}`,
        kind: 'stale_call_round',
        headline: `${row.title} עדיין פתוח`,
        detail: `התקשרנו ל-${row.calledCount} מתוך ${row.roundGuestCount} רשומות אורחים`,
        href: `#schedule-${row.id}`,
      });
    }
  }
  if (
    event
    && isNoAskPlanned({
      eventDate: event.eventDate,
      canSend: event.canCreateSchedules,
      schedules: timeline,
      now: new Date(now),
    })
  ) {
    signals.push({
      id: `no_ask:${eventId}`,
      kind: 'no_ask_planned',
      headline: 'לא נקבע תאריך להזמנה או לאישור הגעה',
      detail: 'אף הודעה לא תבקש מהאורחים לאשר הגעה עד שבעלי האירוע יבחרו תאריך',
      href: `#schedule-${timeline.find((row) => !row.scheduledDate)?.id ?? ''}`,
    });
  }
  if (firstFailedSchedule) {
    signals.push({
      id: `failed:${eventId}`,
      kind: 'failed_delivery',
      headline: `${failedCount === 1 ? 'שליחה אחת נכשלה' : `${failedCount} שליחות נכשלו`}${fallbackCount ? ` - ${fallbackCount} אפשר לנסות ב-SMS` : ''}`,
      detail: 'שליחות שנכשלו ב-30 הימים האחרונים ועוד לא נוסו ב-SMS',
      href: `#schedule-${firstFailedSchedule.id}-failures`,
    });
  }
  const severity = {
    overdue_schedule: 0,
    failed_delivery: 1,
    no_ask_planned: 2,
    stale_call_round: 3,
  } as const;
  return signals.sort((a, b) => severity[a.kind] - severity[b.kind]);
}
