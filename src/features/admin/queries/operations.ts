'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { PlannedWorkGroup, PlannedWorkQueue, PlannedWorkRow } from '../types';

const DAY_MS = 86_400_000;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Query returned no data');
  return result.data;
}

/** Midnight local, so "today" is a calendar day rather than 24 hours from now. */
function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function groupLabel(scheduledDate: string, todayStart: number): string {
  const date = new Date(scheduledDate);
  const dayStart = startOfDay(date);
  const offset = Math.round((dayStart - todayStart) / DAY_MS);

  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dayMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const sameYear = date.getFullYear() === new Date(todayStart).getFullYear();
  const stamp = sameYear ? `${weekday} ${dayMonth}` : `${weekday} ${dayMonth} ${date.getFullYear()}`;

  if (offset === 0) return `Today, ${stamp}`;
  if (offset === 1) return `Tomorrow, ${stamp}`;
  return stamp;
}

/**
 * Lateness in the same words the Overview's Signals use, so the two pages agree.
 * Sub-day overdue is real and common - a cron that missed its window this
 * morning is not "1 day late" - so hours are carried rather than rounded up.
 */
function lateness(scheduledMs: number, now: number): string {
  const hours = Math.floor((now - scheduledMs) / 3_600_000);
  if (hours < 1) return 'Overdue';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} late`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} late`;
}

function channelLabel(channel: string | null): string {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'sms') return 'SMS';
  return 'Message';
}

/** "pending records" / "confirmed records" - the unit is Guest Records, always named. */
function audienceLabel(targetStatus: string | null, count: number): string {
  const unit = count === 1 ? 'record' : 'records';
  if (targetStatus === 'pending') return `${count} pending ${unit}`;
  if (targetStatus === 'confirmed') return `${count} confirmed ${unit}`;
  return `${count} guest ${unit}`;
}

type ScheduleRow = {
  id: string;
  event_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  target_status: string | null;
  schedule_type_id: string;
  events: { title: string | null } | null;
  schedule_types: { name: string | null; execution_kind: string | null } | null;
  message_templates: { channel: string | null } | null;
};

/**
 * The cross-event queue of planned work: every `schedules` row that is neither
 * sent nor cancelled, on a published event.
 *
 * There is no horizon. A 14-day window was the original plan and it starved the
 * page - production's only open call plan sat outside it, so the one row type
 * that justifies this page's existence was invisible. Date grouping is what
 * keeps an unbounded list scannable. See the brief, section 3.1.
 *
 * Draft Events are excluded: a Draft Event cannot have schedules, and it is
 * interest rather than an event.
 */
export async function getPlannedWork(): Promise<PlannedWorkQueue> {
  await assertAdmin();
  const supabase = createServiceClient();

  const open = unwrap(
    await supabase
      .from('schedules')
      .select(
        'id, event_id, scheduled_date, scheduled_time, target_status, schedule_type_id, events!inner(title, status), schedule_types(name, execution_kind), message_templates(channel)',
      )
      .is('status', null)
      .eq('events.status', 'published')
      .order('scheduled_date', { ascending: true }),
  ) as unknown as ScheduleRow[];

  if (!open.length) return { groups: [], callRounds: 0, messages: 0 };

  const eventIds = [...new Set(open.map((row) => row.event_id))];

  // Labels must match what the Owner sees in their own app, and that index runs
  // over every schedule of the type - sent and cancelled included - ordered by
  // date. Indexing only the open rows would number the same plan differently on
  // the two sides. See schedules-page.tsx and brief 3.10.
  const siblings = unwrap(
    await supabase
      .from('schedules')
      .select('id, event_id, schedule_type_id')
      .in('event_id', eventIds)
      .order('scheduled_date', { ascending: true }),
  );

  const orderByTypeKey = new Map<string, string[]>();
  for (const row of siblings) {
    const key = `${row.event_id}:${row.schedule_type_id}`;
    const list = orderByTypeKey.get(key) ?? [];
    list.push(row.id);
    orderByTypeKey.set(key, list);
  }

  // One aggregate pass rather than a query per call plan.
  const guests = unwrap(
    await supabase.from('guests').select('event_id, rsvp_status').in('event_id', eventIds),
  );

  const tally = new Map<string, { pending: number; confirmed: number; total: number }>();
  for (const guest of guests) {
    if (!guest.event_id) continue;
    const entry = tally.get(guest.event_id) ?? { pending: 0, confirmed: 0, total: 0 };
    entry.total += 1;
    if (guest.rsvp_status === 'pending') entry.pending += 1;
    if (guest.rsvp_status === 'confirmed') entry.confirmed += 1;
    tally.set(guest.event_id, entry);
  }

  const now = Date.now();
  const todayStart = startOfDay(new Date(now));

  const rows: PlannedWorkRow[] = open.map((row) => {
    const isCall = row.schedule_types?.execution_kind === 'phone_call';
    const baseName = row.schedule_types?.name ?? 'Schedule';

    const order = orderByTypeKey.get(`${row.event_id}:${row.schedule_type_id}`) ?? [];
    const title = order.length > 1 ? `${baseName} ${order.indexOf(row.id) + 1}` : baseName;

    const scheduledMs = new Date(row.scheduled_date).getTime();
    const lateBy = scheduledMs < now ? lateness(scheduledMs, now) : null;

    const counts = tally.get(row.event_id) ?? { pending: 0, confirmed: 0, total: 0 };
    const audienceCount =
      row.target_status === 'pending'
        ? counts.pending
        : row.target_status === 'confirmed'
          ? counts.confirmed
          : counts.total;

    const time = row.scheduled_time?.slice(0, 5) ?? null;
    const audience_label = audienceLabel(row.target_status, audienceCount);
    const channel = isCall ? null : channelLabel(row.message_templates?.channel ?? null);

    let detail: string;
    if (isCall) {
      const audience = `Calls to ${audience_label}`;
      detail = lateBy === null ? audience : `${audience}, never started`;
    } else {
      if (lateBy !== null) {
        const due = new Date(row.scheduled_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        detail = `${channel}, was due ${due}${time ? ` ${time}` : ''}, never sent`;
      } else {
        detail = time ? `${channel}, sends itself at ${time}` : `${channel}, sends itself on the day`;
      }
    }

    return {
      id: row.id,
      kind: isCall ? 'call' : 'message',
      eventId: row.event_id,
      eventTitle: row.events?.title ?? 'Untitled event',
      title,
      detail,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      lateBy,
      audienceCount,
      audienceLabel: audience_label,
      channel,
    };
  });

  const groups: PlannedWorkGroup[] = [];
  const overdue = rows.filter((row) => row.lateBy !== null);
  if (overdue.length) {
    groups.push({ key: 'overdue', label: 'Overdue', isOverdue: true, rows: overdue });
  }

  // Rows arrive date-ordered, so a group breaks whenever the label changes.
  for (const row of rows) {
    if (row.lateBy !== null) continue;
    const label = groupLabel(row.scheduledDate, todayStart);
    const last = groups[groups.length - 1];
    if (last && !last.isOverdue && last.label === label) {
      last.rows.push(row);
    } else {
      groups.push({ key: label, label, isOverdue: false, rows: [row] });
    }
  }

  return {
    groups,
    callRounds: rows.filter((row) => row.kind === 'call').length,
    messages: rows.filter((row) => row.kind === 'message').length,
  };
}

/** Published events an Operator can plan a call round against, with today's audience sizes. */
export async function listEventsForPlanning(): Promise<
  { id: string; title: string; pending: number; confirmed: number }[]
> {
  await assertAdmin();
  const supabase = createServiceClient();

  const events = unwrap(
    await supabase
      .from('events')
      .select('id, title')
      .eq('status', 'published')
      .order('event_date', { ascending: true }),
  );

  if (!events.length) return [];

  const guests = unwrap(
    await supabase
      .from('guests')
      .select('event_id, rsvp_status')
      .in(
        'event_id',
        events.map((event) => event.id),
      ),
  );

  const tally = new Map<string, { pending: number; confirmed: number }>();
  for (const guest of guests) {
    if (!guest.event_id) continue;
    const entry = tally.get(guest.event_id) ?? { pending: 0, confirmed: 0 };
    if (guest.rsvp_status === 'pending') entry.pending += 1;
    if (guest.rsvp_status === 'confirmed') entry.confirmed += 1;
    tally.set(guest.event_id, entry);
  }

  return events.map((event) => ({
    id: event.id,
    title: event.title ?? 'Untitled event',
    pending: tally.get(event.id)?.pending ?? 0,
    confirmed: tally.get(event.id)?.confirmed ?? 0,
  }));
}
