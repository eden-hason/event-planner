import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SCHEDULE_SELECT,
  DISPATCH_SCHEDULE_SELECT,
  ScheduleDbToAppSchema,
  type ScheduleApp,
} from '../schemas';
import type { MessageTemplateApp } from '../schemas/message-templates';
import {
  DbToAppTransformerSchema,
  GroupDbToAppTransformerSchema,
  type GroupApp,
  type GuestApp,
} from '@/features/guests/schemas';
import { resolveTemplatesForEvent } from './resolve-reminder-templates';
import { mapEventRow } from './map-event-row';
import { recordNotSent, reserveDeliveries } from './deliveries';
import {
  isGiftingEnabled,
  shouldSendTableNumbers,
  filterGuestsByTarget,
  isMessageSchedule,
  validatePhoneNumber,
  type ParameterResolutionContext,
} from '../utils';
import { renderSendPayload, type SendPayload } from '../utils/send-payload';
import { isWithinSendWindow } from '../utils/send-window';
import { sendingConfig } from '@/lib/config/sending';

/**
 * The Dispatcher: finds Schedules whose Due Time has come, and turns each into
 * queued Deliveries with a fully rendered message on them.
 *
 * All of it is database work. Nothing here talks to WhatsApp - that is the
 * Worker's only job (ADR 0013). Everything that can go wrong with the *content*
 * of a message goes wrong here, once per Schedule, in front of a log row an
 * Operator can read.
 *
 * Every branch writes a `schedule_dispatch_attempts` row, including the ones
 * that decide to do nothing. That is the change that ends the class of bug
 * currently keeping three Schedules at `status = null` for 23 days with no
 * record of why: a Schedule the Dispatcher looked at and held now says so.
 */

const DEFAULT_BATCH = 25;

export type DispatchOutcome = 'dispatched' | 'held' | 'expired' | 'failed';

export type DispatchResult = {
  scheduleId: string;
  outcome: DispatchOutcome;
  reason: string | null;
  deliveriesQueued: number;
};

export type DispatchSummary = {
  considered: number;
  dispatched: number;
  held: number;
  expired: number;
  failed: number;
  deliveriesQueued: number;
  results: DispatchResult[];
};

type EventRow = ReturnType<typeof mapEventRow>;

const HOUR_MS = 3_600_000;

/**
 * A Schedule whose moment has passed, or null when it is still worth sending.
 *
 * Two rules, and the Event-date one is the reason this exists at all: an Event
 * Reminder telling 200 people where to sit at a wedding that ended last night
 * is the genuinely harmful case. A Thank You is excepted - it is *meant* to go
 * out after the Event.
 */
export function expiryReason(params: {
  schedule: Pick<ScheduleApp, 'scheduledDate' | 'scheduleTypeKey'>;
  eventDate: string | null;
  now: Date;
  maxLatenessHours: number;
}): string | null {
  const { schedule, eventDate, now, maxLatenessHours } = params;

  if (eventDate && schedule.scheduleTypeKey !== 'post_event') {
    // event_date is a calendar date at 00:00 UTC. The Event is over once that
    // day has ended, so compare against the end of it rather than its start.
    const eventEnded = Date.parse(eventDate) + 24 * HOUR_MS;
    if (Number.isFinite(eventEnded) && now.getTime() > eventEnded) {
      return 'The event has already happened';
    }
  }

  const lateBy = now.getTime() - Date.parse(schedule.scheduledDate);
  if (lateBy > maxLatenessHours * HOUR_MS) {
    const hours = Math.floor(lateBy / HOUR_MS);
    return `Due time was ${hours} hours ago, past the ${maxLatenessHours} hour limit`;
  }

  return null;
}

async function logDispatchAttempt(
  supabase: SupabaseClient,
  scheduleId: string,
  outcome: DispatchOutcome,
  reason: string | null,
  deliveriesQueued = 0,
): Promise<void> {
  const { error } = await supabase.from('schedule_dispatch_attempts').insert({
    schedule_id: scheduleId,
    outcome,
    reason,
    deliveries_queued: deliveriesQueued,
  });
  if (error) {
    // The log failing must not stop the send. It is the record of what
    // happened, not the thing that happens.
    console.error('[dispatch] Could not log the attempt for', scheduleId, error);
  }
}

/** Everything the renderer needs about the audience, fetched in two queries. */
async function loadAudienceContext(
  supabase: SupabaseClient,
  guests: GuestApp[],
  needTables: boolean,
) {
  const groups = new Map<string, GroupApp>();
  const tables = new Map<string, { tableNumber: number; label: string | null }>();

  const groupIds = [...new Set(guests.map((g) => g.groupId).filter((id): id is string => !!id))];
  if (groupIds.length > 0) {
    const { data } = await supabase.from('groups').select('*').in('id', groupIds);
    for (const raw of data ?? []) {
      const group = GroupDbToAppTransformerSchema.parse(raw);
      groups.set(group.id, group);
    }
  }

  const tableIds = [...new Set(guests.map((g) => g.tableId).filter((id): id is string => !!id))];
  if (needTables && tableIds.length > 0) {
    const { data, error } = await supabase
      .from('tables')
      .select('id, table_number, label')
      .in('id', tableIds);
    if (error) throw error;
    for (const row of data ?? []) {
      tables.set(row.id, { tableNumber: row.table_number, label: row.label });
    }
  }

  return { groups, tables };
}

/**
 * Dispatches one Schedule that has already been found due, expanded its
 * audience and queued a rendered Delivery per Guest.
 *
 * Throws nothing: every failure is a `failed` result with a reason, because the
 * caller's job is to keep going through the rest of the batch.
 */
async function dispatchOne(
  supabase: SupabaseClient,
  rawSchedule: Record<string, unknown>,
  now: Date,
): Promise<DispatchResult> {
  const config = sendingConfig();
  // The id is read from the raw row, before anything that can throw, so a row
  // that fails to parse can still be logged against the Schedule it came from.
  const scheduleId = String(rawSchedule.id ?? 'unknown');

  const fail = async (reason: string): Promise<DispatchResult> => {
    await logDispatchAttempt(supabase, scheduleId, 'failed', reason);
    return { scheduleId, outcome: 'failed', reason, deliveriesQueued: 0 };
  };

  // Parsing is inside the guard rather than before it: a row whose shape has
  // drifted is a Schedule that will never send, and it has to say so on its own
  // dispatch log rather than throwing past the Dispatcher and taking the rest
  // of the batch with it.
  let schedule: ScheduleApp;
  try {
    schedule = ScheduleDbToAppSchema.parse(rawSchedule);
  } catch (error) {
    return fail(
      `Schedule row could not be read: ${error instanceof Error ? error.message : 'invalid shape'}`,
    );
  }

  const eventRow = (rawSchedule as { events?: Record<string, unknown> | null }).events;
  if (!eventRow) return fail('Schedule has no event');
  const event: EventRow = mapEventRow(eventRow);

  if (!isMessageSchedule(schedule)) {
    // A phone_call Schedule is a plan for a person to work through. It has no
    // template and no channel, and the Dispatcher must never queue one - see
    // docs/adr/0004. The query already filters these out; this is the guard
    // that keeps a query change from turning into a WhatsApp blast.
    return fail(`Schedule type ${schedule.scheduleTypeKey} is not dispatched as a message`);
  }

  // 1. Expire? Checked before the claim, so an expired Schedule is never
  //    marked dispatched on its way to being abandoned.
  const expired = expiryReason({
    schedule,
    eventDate: event.eventDate,
    now,
    maxLatenessHours: config.scheduleMaxLatenessHours,
  });
  if (expired) {
    const { error } = await supabase
      .from('schedules')
      .update({ status: 'expired' })
      .eq('id', scheduleId)
      .is('status', null);
    if (error) return fail(`Could not expire the schedule: ${error.message}`);
    await logDispatchAttempt(supabase, scheduleId, 'expired', expired);
    return { scheduleId, outcome: 'expired', reason: expired, deliveriesQueued: 0 };
  }

  // 2. Hold? Nothing else happens - deliberately not even expanding the
  //    audience, so a Schedule held over Shabbat sends to the audience as it
  //    stands when it finally goes, not as it stood 29 hours earlier. An RSVP
  //    that changes overnight is still respected.
  if (!isWithinSendWindow(now, config.sendWindow)) {
    const reason = `Outside the send window (${config.sendWindow.start}-${config.sendWindow.end} Israel, and not Friday afternoon to Saturday evening)`;
    await logDispatchAttempt(supabase, scheduleId, 'held', reason);
    return { scheduleId, outcome: 'held', reason, deliveriesQueued: 0 };
  }

  // 3. Claim. Whoever flips dispatched_at owns this Schedule; a second
  //    Dispatcher running over the same row loses the race and steps away
  //    without a log row, because it did not dispatch anything.
  const { data: claimed, error: claimError } = await supabase
    .from('schedules')
    .update({ dispatched_at: now.toISOString() })
    .eq('id', scheduleId)
    .is('dispatched_at', null)
    .select('id')
    .maybeSingle();

  if (claimError) return fail(`Could not claim the schedule: ${claimError.message}`);
  if (!claimed) {
    return {
      scheduleId,
      outcome: 'held',
      reason: 'Another dispatcher claimed this schedule first',
      deliveriesQueued: 0,
    };
  }

  try {
    // 4. Resolve what actually gets sent. The Schedule's own template is the
    //    family anchor bound weeks ago, before seating was done or a gift
    //    provider was added, so the body is resolved from the Event's current
    //    configuration instead.
    const anchor = schedule.template;
    if (!anchor) return fail('No template assigned to schedule');

    const resolution = await resolveTemplatesForEvent({
      supabase,
      anchor,
      gifting: isGiftingEnabled(event.eventSettings),
      tableNumbers: shouldSendTableNumbers(event.guestExperience),
      note: Boolean(schedule.customText?.trim()),
    });
    if (!resolution.success) return fail(resolution.message);
    const { withTable, withoutTable } = resolution.templates;

    // Table numbers are per-guest: seating is routinely incomplete on the day,
    // so a guest with no assignment gets the variant that does not mention a
    // table rather than a message with a blank where the number should be.
    const templateForGuest = (guest: GuestApp): MessageTemplateApp =>
      withTable && guest.tableId ? withTable : withoutTable;

    const { data: rawGuests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', schedule.eventId);
    if (guestsError) return fail(`Could not load guests: ${guestsError.message}`);
    if (!rawGuests?.length) return fail('No guests found for event');

    const targeted = filterGuestsByTarget(
      rawGuests.map((g: Record<string, unknown>) => DbToAppTransformerSchema.parse(g)),
      schedule.targetStatus,
    );
    if (targeted.length === 0) return fail('No eligible guests after applying filters');

    const reachable = targeted.filter((guest) => validatePhoneNumber(guest.phone));
    const unreachable = targeted.filter((guest) => !validatePhoneNumber(guest.phone));

    // Guests with no usable number are a fact the Owner needs to see ("never
    // got it - no phone number"), not just a number in a summary.
    if (unreachable.length > 0) {
      try {
        await recordNotSent(supabase, scheduleId, unreachable.map((g) => g.id), 'scheduled');
      } catch (error) {
        console.error('[dispatch] Could not record not-sent deliveries:', error);
      }
    }

    if (reachable.length === 0) return fail('No guests with valid phone numbers');

    // 5. Reserve the Deliveries before rendering: the RSVP token is part of
    //    the message, and a guest who already has a Delivery for this Schedule
    //    keeps theirs (ADR 0011).
    const reserved = await reserveDeliveries(
      supabase,
      scheduleId,
      reachable.map((guest) => guest.id),
      'scheduled',
    );

    const { groups, tables } = await loadAudienceContext(
      supabase,
      reachable,
      Boolean(withTable),
    );

    // 6. Render every message in full, before queueing any of them. A content
    //    error is the whole Schedule's problem, so it fails here as one logged
    //    row rather than as 274 per-guest attempt failures.
    const queued: { deliveryId: string; templateId: string; payload: SendPayload }[] = [];
    for (const guest of reachable) {
      const delivery = reserved.get(guest.id);
      if (!delivery) continue; // no token reserved - nothing to link back to

      const template = templateForGuest(guest);
      const context: ParameterResolutionContext = {
        guest,
        event,
        group: guest.groupId ? (groups.get(guest.groupId) ?? null) : null,
        table: (guest.tableId ? tables.get(guest.tableId) : null) ?? null,
        schedule,
        confirmationToken: delivery.confirmationToken,
      };

      const rendered = renderSendPayload({ template, context, phone: guest.phone });
      if (!rendered.ok) {
        return fail(`Could not render the message for ${guest.name}: ${rendered.reason}`);
      }
      queued.push({
        deliveryId: delivery.id,
        templateId: template.id,
        payload: rendered.payload,
      });
    }

    if (queued.length === 0) return fail('No deliveries could be prepared');

    // 7. Queue. next_attempt_at is the whole of "waiting to be sent"; the
    //    Worker claims on it and nulls it in the same statement.
    const queuedAt = new Date().toISOString();
    for (const item of queued) {
      const { error } = await supabase
        .from('message_deliveries')
        .update({
          template_id: item.templateId,
          send_payload: item.payload,
          next_attempt_at: queuedAt,
        })
        .eq('id', item.deliveryId);
      if (error) {
        // Partial queueing is survivable - the rest of the batch still sends,
        // and this guest's Delivery simply has no attempt, which is visible.
        console.error('[dispatch] Could not queue delivery', item.deliveryId, error);
      }
    }

    await logDispatchAttempt(supabase, scheduleId, 'dispatched', null, queued.length);
    return {
      scheduleId,
      outcome: 'dispatched',
      reason: null,
      deliveriesQueued: queued.length,
    };
  } catch (error) {
    // Anything at all. The old engine let a throw escape to the cron, which
    // logged a line and left the Schedule looking untouched.
    return fail(error instanceof Error ? error.message : 'Dispatch failed');
  }
}

/**
 * Finds every Schedule that is due and dispatches it.
 *
 * Takes its Supabase client as a parameter like every other service here, so
 * the cron route, a test and an Operator action can all drive it.
 */
export async function dispatchDueSchedules(
  supabase: SupabaseClient,
  options: { limit?: number; now?: Date } = {},
): Promise<DispatchSummary> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? DEFAULT_BATCH;

  const summary: DispatchSummary = {
    considered: 0,
    dispatched: 0,
    held: 0,
    expired: 0,
    failed: 0,
    deliveriesQueued: 0,
    results: [],
  };

  // Before anything else, and unconditionally: a run that finds nothing to do
  // still has to prove it happened. Without this the Heartbeat cannot tell a
  // quiet week from a dead cron, which is the one failure it exists to catch.
  const { error: heartbeatError } = await supabase.rpc('touch_pipeline_heartbeat', {
    p_name: 'dispatcher',
  });
  if (heartbeatError) {
    console.error('[dispatch] Could not record the heartbeat:', heartbeatError);
  }

  // `!inner` is required: a plain embed would return the row with a null join
  // rather than filtering it out. The filter is positive on execution_kind, so
  // a kind added to the catalog that this build has never heard of stays inert
  // until code opts it in - see docs/adr/0004.
  const { data: due, error } = await supabase
    .from('schedules')
    .select(
      `${DISPATCH_SCHEDULE_SELECT},
       events (id, user_id, title, event_date, location, host_details,
               invitations, reception_time, short_code, event_settings,
               guests_experience)`,
    )
    .eq('schedule_types.execution_kind', 'message')
    .is('status', null)
    .is('dispatched_at', null)
    .lte('scheduled_date', now.toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[dispatch] Could not load due schedules:', error);
    return summary;
  }
  if (!due?.length) return summary;

  for (const row of due) {
    // dispatchOne is written not to throw, but the loop guards anyway: one
    // unsendable Schedule must never stop the other twenty-four, which is the
    // failure mode this whole component replaces.
    let result: DispatchResult;
    try {
      result = await dispatchOne(supabase, row as Record<string, unknown>, now);
    } catch (error) {
      result = {
        scheduleId: String((row as { id?: unknown }).id ?? 'unknown'),
        outcome: 'failed',
        reason: error instanceof Error ? error.message : 'Dispatch threw',
        deliveriesQueued: 0,
      };
      console.error('[dispatch] Unhandled failure for', result.scheduleId, error);
    }
    summary.considered += 1;
    summary.results.push(result);
    summary.deliveriesQueued += result.deliveriesQueued;
    if (result.outcome === 'dispatched') summary.dispatched += 1;
    else if (result.outcome === 'held') summary.held += 1;
    else if (result.outcome === 'expired') summary.expired += 1;
    else summary.failed += 1;
  }

  return summary;
}

/**
 * Dispatches one named Schedule, whether or not a sweep would have found it.
 *
 * This is the Owner's send-now and the Back Office's equivalent: the Due Time
 * has already been moved to this moment by the caller, and this pushes the
 * Schedule through the same Dispatcher every automatic send goes through. The
 * Send Window still applies - an Owner pressing send at 3am is still a phone
 * buzzing at 3am - so the result may be `held`, and the caller is expected to
 * say so rather than claim the message went.
 */
export async function dispatchScheduleById(
  supabase: SupabaseClient,
  scheduleId: string,
  options: { now?: Date } = {},
): Promise<DispatchResult> {
  const now = options.now ?? new Date();

  const { data, error } = await supabase
    .from('schedules')
    .select(
      `${SCHEDULE_SELECT},
       events (id, user_id, title, event_date, location, host_details,
               invitations, reception_time, short_code, event_settings,
               guests_experience)`,
    )
    .eq('id', scheduleId)
    .maybeSingle();

  if (error || !data) {
    return {
      scheduleId,
      outcome: 'failed',
      reason: 'That schedule no longer exists',
      deliveriesQueued: 0,
    };
  }

  return dispatchOne(supabase, data as Record<string, unknown>, now);
}
