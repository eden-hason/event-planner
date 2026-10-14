'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { embeddedCount, pageAll } from '@/lib/supabase/row-cap';
import type {
  OverviewCallRound,
  OverviewCallRounds,
  PlannedWorkGroup,
  PlannedWorkQueue,
  PlannedWorkRow,
} from '../types';
import { loadCallRoundEventIds } from '@/features/billing/services';
import { excludeIds, getTestScope } from './test-accounts';
import { ADMIN_TIME_ZONE, israelWallClockParts } from '@/lib/date-time';
import { numberPlan, planEntryFromRow, type PlanEntry } from '@/features/schedules';
import { audienceCountLabel, eventTitle, scheduleTypeName } from '../utils/labels';
import { daysText, formatShortDate, hoursText } from '../utils/format';
import { callRoundDayKey, callRoundDays, callRoundWindow } from '../utils/call-round-days';

const DAY_MS = 86_400_000;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Query returned no data');
  return result.data;
}

/** The Events among these whose Plan includes Call Rounds (ADR 0034). Throws when unread. */
async function callRoundEventIds(
  supabase: ReturnType<typeof createServiceClient>,
  eventIds: string[],
): Promise<ReadonlySet<string>> {
  const callEvents = await loadCallRoundEventIds(supabase, [...new Set(eventIds)]);
  if (!callEvents) throw new Error('Could not read the Events\' Plans');
  return callEvents;
}

function calendarParts(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('he-IL', {
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return { year: +parts.year, month: +parts.month, day: +parts.day, weekday: parts.weekday };
}

function groupLabel(scheduledDate: string, today: ReturnType<typeof calendarParts>): string {
  const date = new Date(scheduledDate);
  const scheduled = calendarParts(date);
  const offset = Math.round((Date.UTC(scheduled.year, scheduled.month - 1, scheduled.day) - Date.UTC(today.year, today.month - 1, today.day)) / DAY_MS);
  const month = new Intl.DateTimeFormat('he-IL', { timeZone: ADMIN_TIME_ZONE, month: 'short' }).format(date);
  const stamp = scheduled.year === today.year ? `${scheduled.weekday} ${scheduled.day} ב${month}` : `${scheduled.weekday} ${scheduled.day} ב${month} ${scheduled.year}`;

  if (offset === 0) return `היום, ${stamp}`;
  if (offset === 1) return `מחר, ${stamp}`;
  return stamp;
}

/**
 * Lateness in the same words the Overview's Signals use, so the two pages agree.
 * Sub-day overdue is real and common - a cron that missed its window this
 * morning is not "1 day late" - so hours are carried rather than rounded up.
 */
function lateness(scheduledMs: number, now: number): string {
  const hours = Math.floor((now - scheduledMs) / 3_600_000);
  if (hours < 1) return 'באיחור';
  return `באיחור של ${hours < 24 ? hoursText(hours) : daysText(Math.floor(hours / 24))}`;
}

function channelLabel(channel: string | null): string {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'sms') return 'SMS';
  return 'הודעה';
}


/**
 * Guest Records per Event by RSVP status, counted by the database through three
 * aliased embeds of the same relation. Select it on `events` and narrow two of
 * them with `.eq('pending.rsvp_status', 'pending')` and the confirmed twin.
 */
const AUDIENCE_COUNTS = 'id, total:guests(count), pending:guests(count), confirmed:guests(count)';

type AudienceRow = {
  id: string;
  total: { count: number }[];
  pending: { count: number }[];
  confirmed: { count: number }[];
};

function audienceCounts(row: AudienceRow) {
  return {
    total: embeddedCount(row.total),
    pending: embeddedCount(row.pending),
    confirmed: embeddedCount(row.confirmed),
  };
}

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Labels must match what the Owner sees in their own app, and that index runs
 * over every schedule of the type - sent and cancelled included - in plan
 * order. Indexing only the rows on screen would number the same plan
 * differently on the two sides, so both number through numberPlan, one Event
 * at a time.
 */
async function planNumbers(supabase: ServiceClient, eventIds: string[]) {
  const siblings = await pageAll((from, to) =>
    supabase
      .from('schedules')
      .select('id, event_id, scheduled_date, target_status, schedule_types(key)')
      .in('event_id', eventIds)
      .order('id')
      .range(from, to),
  );
  const entriesByEvent = new Map<string, PlanEntry[]>();
  for (const row of siblings) {
    const entries = entriesByEvent.get(row.event_id) ?? [];
    entries.push(planEntryFromRow(row));
    entriesByEvent.set(row.event_id, entries);
  }
  return new Map(
    [...entriesByEvent.values()].flatMap((entries) => [...numberPlan(entries)]),
  );
}

/**
 * Counted in the database, one query for every Event. Reading the guest rows
 * to tally them here ran into PostgREST's 1,000-row cap and undercounted.
 */
async function audienceTallies(supabase: ServiceClient, eventIds: string[]) {
  const audiences = unwrap(
    await supabase
      .from('events')
      .select(AUDIENCE_COUNTS)
      .in('id', eventIds)
      .eq('pending.rsvp_status', 'pending')
      .eq('confirmed.rsvp_status', 'confirmed'),
  ) as unknown as AudienceRow[];
  return new Map(audiences.map((row) => [row.id, audienceCounts(row)]));
}

function audienceFor(
  counts: ReturnType<typeof audienceCounts> | undefined,
  targetStatus: string | null,
): number {
  if (!counts) return 0;
  if (targetStatus === 'pending') return counts.pending;
  if (targetStatus === 'confirmed') return counts.confirmed;
  return counts.total;
}

type ScheduleRow = {
  id: string;
  event_id: string;
  scheduled_date: string;
  target_status: string | null;
  schedule_type_id: string;
  events: { title: string | null } | null;
  schedule_types: { key: string | null; name: string | null; execution_kind: string | null } | null;
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
 * interest rather than an event. So are test accounts - rehearsal work in a
 * queue of real work is worse than useless. See test-accounts.ts.
 */
export async function getPlannedWork(): Promise<PlannedWorkQueue> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();

  const queued = unwrap(
    await excludeIds(
      supabase
        .from('schedules')
        .select(
          'id, event_id, scheduled_date, target_status, schedule_type_id, events!inner(title, status, can_create_schedules), schedule_types(key, name, execution_kind), message_templates(channel)',
        )
        .is('status', null)
        // Not yet handed to the queue. A dispatched Schedule is done as far as
        // planned work goes - what happens next is per-Delivery (ADR 0013) and
        // shows up as Failed Delivery signals, not as work to do.
        .is('dispatched_at', null)
        .eq('events.status', 'published')
        .eq('events.can_create_schedules', true)
        // An Undated Schedule is not planned work: nothing will happen until the
        // Owner dates it (ADR 0029). The No Ask Planned Signal covers it.
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true }),
      'event_id',
      test.eventIds,
    ),
  ) as unknown as ScheduleRow[];

  // A call plan is work only on the WhatsApp + calls Plan (ADR 0034). Everything
  // here is unstarted, so a call plan on any other Event has nothing to do.
  const callEvents = await callRoundEventIds(
    supabase,
    queued.filter((row) => row.schedule_types?.execution_kind === 'phone_call').map((row) => row.event_id),
  );
  const open = queued.filter(
    (row) => row.schedule_types?.execution_kind !== 'phone_call' || callEvents.has(row.event_id),
  );

  if (!open.length) return { groups: [], callRounds: 0, messages: 0 };

  const eventIds = [...new Set(open.map((row) => row.event_id))];
  const numbers = await planNumbers(supabase, eventIds);
  const tally = await audienceTallies(supabase, eventIds);

  const now = Date.now();
  const today = calendarParts(new Date(now));

  const rows: PlannedWorkRow[] = open.map((row) => {
    const isCall = row.schedule_types?.execution_kind === 'phone_call';
    const baseName = scheduleTypeName(row.schedule_types?.key, row.schedule_types?.name);

    const number = numbers.get(row.id);
    const title = number && number.total > 1 ? `${baseName} ${number.index}` : baseName;

    const scheduledMs = new Date(row.scheduled_date).getTime();
    const lateBy = scheduledMs < now ? lateness(scheduledMs, now) : null;

    const audienceCount = audienceFor(tally.get(row.event_id), row.target_status);

    const time = israelWallClockParts(row.scheduled_date).time;
    const audience_label = audienceCountLabel(row.target_status, audienceCount);
    const channel = isCall ? null : channelLabel(row.message_templates?.channel ?? null);

    let detail: string;
    if (isCall) {
      const audience = `שיחות ל-${audience_label}`;
      detail = lateBy === null ? audience : `${audience}, לא התחיל`;
    } else {
      if (lateBy !== null) {
        const due = formatShortDate(row.scheduled_date, { year: false });
        detail = `${channel}, היה אמור לצאת ב-${due}${time ? ` ${time}` : ''}, לא נשלח`;
      } else {
        detail = time ? `${channel}, יוצא אוטומטית ב-${time}` : `${channel}, יוצא אוטומטית ביום עצמו`;
      }
    }

    return {
      id: row.id,
      kind: isCall ? 'call' : 'message',
      eventId: row.event_id,
      eventTitle: eventTitle(row.events?.title),
      title,
      detail,
      scheduledDate: row.scheduled_date,
      scheduledTime: israelWallClockParts(row.scheduled_date).time,
      lateBy,
      audienceCount,
      audienceLabel: audience_label,
      channel,
    };
  });

  const groups: PlannedWorkGroup[] = [];
  const overdue = rows.filter((row) => row.lateBy !== null);
  if (overdue.length) {
    groups.push({ key: 'overdue', label: 'באיחור', isOverdue: true, rows: overdue });
  }

  // Rows arrive date-ordered, so a group breaks whenever the label changes.
  for (const row of rows) {
    if (row.lateBy !== null) continue;
    const label = groupLabel(row.scheduledDate, today);
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

type CallPlanRow = {
  id: string;
  event_id: string;
  scheduled_date: string;
  target_status: string | null;
  status: string | null;
  events: { title: string | null; can_create_schedules: boolean | null } | null;
  schedule_types: { key: string | null; name: string | null } | null;
};

/**
 * The Overview's Call Rounds band: every call plan dated from today through the
 * window in `callRoundDays`, with the round started from it if there is one.
 *
 * The plan is the `schedules` row and its Due Time is the day it belongs to, so
 * this reads the same rows the Operations queue and the event timeline do - it
 * keeps nothing of its own. Cancelled plans are left out. So are unstarted
 * plans on events that cannot send or whose Plan has no calls, which offer no
 * Start button anywhere; a round already under way stays, since its calling
 * surface still works.
 */
export async function getOverviewCallRounds(): Promise<OverviewCallRounds> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();

  const days = callRoundDays();
  const range = callRoundWindow(days);

  const plans = unwrap(
    await excludeIds(
      supabase
        .from('schedules')
        .select(
          'id, event_id, scheduled_date, target_status, status, events!inner(title, status, can_create_schedules), schedule_types!inner(key, name, execution_kind)',
        )
        .eq('schedule_types.execution_kind', 'phone_call')
        .eq('events.status', 'published')
        .or('status.is.null,status.neq.cancelled')
        .gte('scheduled_date', range.from)
        .lt('scheduled_date', range.to)
        .order('scheduled_date', { ascending: true })
        .order('id', { ascending: true }),
      'event_id',
      test.eventIds,
    ),
  ) as unknown as CallPlanRow[];

  if (!plans.length) return { days, rounds: [] };

  const eventIds = [...new Set(plans.map((row) => row.event_id))];

  // A round's call_logs are its audience snapshot, counted here because one
  // round of a large Event can pass the 1,000-row cap.
  const [numbers, tally, startedResult, callEvents] = await Promise.all([
    planNumbers(supabase, eventIds),
    audienceTallies(supabase, eventIds),
    supabase
      .from('call_rounds')
      .select('id, schedule_id, completed_at, snapshot:call_logs(count), called:call_logs(count)')
      .in('schedule_id', plans.map((row) => row.id))
      .not('called.outcome', 'is', null),
    callRoundEventIds(supabase, eventIds),
  ]);
  const roundBySchedule = new Map(unwrap(startedResult).map((round) => [round.schedule_id, round]));

  const now = Date.now();

  const rounds = plans.flatMap((row): OverviewCallRound[] => {
    const round = roundBySchedule.get(row.id);
    // Claimed without a round left behind: nothing to start and nothing to open.
    if (!round && row.status !== null) return [];
    if (!round && !row.events?.can_create_schedules) return [];
    // Not on the WhatsApp + calls Plan (ADR 0034): Start would refuse it.
    if (!round && !callEvents.has(row.event_id)) return [];

    const baseName = scheduleTypeName(row.schedule_types?.key, row.schedule_types?.name);
    const number = numbers.get(row.id);
    const title = number && number.total > 1 ? `${baseName} ${number.index}` : baseName;

    const audience = audienceCountLabel(
      row.target_status,
      audienceFor(tally.get(row.event_id), row.target_status),
    );

    return [
      {
        id: row.id,
        eventId: row.event_id,
        eventTitle: eventTitle(row.events?.title),
        title,
        day: callRoundDayKey(row.scheduled_date),
        scheduledTime: israelWallClockParts(row.scheduled_date).time,
        status: round ? (round.completed_at ? 'completed' : 'in_progress') : 'planned',
        late: !round && new Date(row.scheduled_date).getTime() < now,
        detail: round
          ? `התקשרנו ל-${embeddedCount(round.called)} מתוך ${embeddedCount(round.snapshot)} רשומות אורחים`
          : `שיחות ל-${audience}`,
        // The plan's row on the event page carries its Start button; once
        // started, the round has a page of its own.
        href: round
          ? `/admin/events/${row.event_id}/rounds/${round.id}`
          : `/admin/events/${row.event_id}#schedule-${row.id}`,
      },
    ];
  });

  return { days, rounds };
}

/** Published events an Operator can plan a call round against, with today's audience sizes. */
export async function listEventsForPlanning(): Promise<
  { id: string; title: string; pending: number; confirmed: number }[]
> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();

  const events = unwrap(
    await excludeIds(
      supabase
        .from('events')
        .select(`title, ${AUDIENCE_COUNTS}`)
        .eq('status', 'published')
        .eq('can_create_schedules', true)
        .eq('pending.rsvp_status', 'pending')
        .eq('confirmed.rsvp_status', 'confirmed')
        .order('event_date', { ascending: true }),
      'user_id',
      test.userIds,
    ),
  ) as unknown as (AudienceRow & { title: string | null })[];

  // Every event that can send and is on the WhatsApp + calls Plan (ADR 0034),
  // guests or not: the audience is snapshotted when a round starts, so an empty
  // list today does not stop a plan.
  const callEvents = await callRoundEventIds(supabase, events.map((event) => event.id));
  return events.filter((event) => callEvents.has(event.id)).map((event) => {
    const { pending, confirmed } = audienceCounts(event);
    return { id: event.id, title: eventTitle(event.title), pending, confirmed };
  });
}
