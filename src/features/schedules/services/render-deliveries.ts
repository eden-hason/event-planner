import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SCHEDULE_SELECT,
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
import { loadIsFollowUpConfirmation } from './confirmation-round';
import { recordNotSent, reserveDeliveries } from './deliveries';
import { loadOutsidePackageIds } from '@/features/billing/services';
import {
  includesGiftButton,
  hasInvitationImage,
  shouldSendTableNumbers,
  filterGuestsByTarget,
  isMessageSchedule,
  validatePhoneNumber,
  type ParameterResolutionContext,
} from '../utils';
import { renderSendPayload, type SendPayload } from '../utils/send-payload';

/**
 * Turning a Schedule into one fully rendered message per Guest.
 *
 * This is the expensive, fallible half of dispatch - resolving the template
 * family, expanding the audience, reserving Deliveries so each Guest keeps
 * their RSVP token, and building the exact bytes that will be POSTed. It lives
 * on its own because two callers need it and neither owns the other:
 *
 *   - the Dispatcher, for the whole audience, once, when a Due Time arrives
 *   - an Operator's manual send, for a named handful, at any time afterwards
 *
 * The manual path used to go through the Dispatcher for this, which did not
 * work: a Schedule that has already been dispatched loses the claim race, so
 * nothing was re-rendered, and because the Worker nulls `send_payload` on every
 * terminal outcome the resend silently sent nothing at all. Rendering is not
 * dispatching, and separating them is what makes a resend possible.
 *
 * Nothing here writes `next_attempt_at`. Queueing is the caller's decision -
 * the Dispatcher queues everything it rendered, the manual path queues only
 * what the Operator picked.
 */

export type RenderedDelivery = {
  deliveryId: string;
  templateId: string;
  payload: SendPayload;
};

export type RenderDeliveriesResult =
  | {
      ok: true;
      rendered: RenderedDelivery[];
      schedule: ScheduleApp;
      /** Targeted Guest Records skipped because they are outside the Record Package */
      outsidePackage: number;
    }
  | { ok: false; reason: string };

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

export async function renderScheduleDeliveries(
  supabase: SupabaseClient,
  scheduleId: string,
  options: {
    /**
     * Restrict to these Guests, bypassing target-status filtering - the caller
     * picked them explicitly. Also suppresses the not-sent bookkeeping, which
     * describes an audience and not a hand-picked subset.
     */
    guestIds?: string[];
    /** A row already fetched with SCHEDULE_SELECT and its event, to save a query. */
    prefetched?: { schedule: ScheduleApp; event: ReturnType<typeof mapEventRow> };
    /**
     * Guest Records outside the Record Package, already loaded by the caller. The
     * Dispatcher loads it before claiming the Schedule, so a failure to work it out
     * leaves the Schedule unclaimed and retried rather than dispatched to nobody.
     */
    outsidePackage?: ReadonlySet<string>;
  } = {},
): Promise<RenderDeliveriesResult> {
  let schedule: ScheduleApp;
  let event: ReturnType<typeof mapEventRow>;

  if (options.prefetched) {
    ({ schedule, event } = options.prefetched);
  } else {
    const { data, error } = await supabase
      .from('schedules')
      .select(
        `${SCHEDULE_SELECT},
         events (id, user_id, title, event_date, location, host_details,
                 invitations, reception_time, short_code, event_settings,
                 guests_experience, event_types (key))`,
      )
      .eq('id', scheduleId)
      .maybeSingle();
    if (error || !data || !data.events) {
      return { ok: false, reason: 'That schedule no longer exists' };
    }
    try {
      schedule = ScheduleDbToAppSchema.parse(data);
    } catch (parseError) {
      return {
        ok: false,
        reason: `Schedule row could not be read: ${parseError instanceof Error ? parseError.message : 'invalid shape'}`,
      };
    }
    event = mapEventRow(data.events as Record<string, unknown>);
  }

  if (!isMessageSchedule(schedule)) {
    return {
      ok: false,
      reason: `Schedule type ${schedule.scheduleTypeKey} is not sent as a message`,
    };
  }

  // The Schedule's own template is the family anchor bound weeks ago, before
  // seating was done or a gift provider was added, so the body is resolved from
  // the Event's current configuration instead.
  const anchor = schedule.template;
  if (!anchor) return { ok: false, reason: 'No template assigned to schedule' };

  const resolution = await resolveTemplatesForEvent({
    supabase,
    anchor,
    gifting: includesGiftButton(event.eventSettings, schedule.scheduleTypeKey),
    tableNumbers: shouldSendTableNumbers(event.guestExperience),
    note: Boolean(schedule.customText?.trim()),
    followUp: await loadIsFollowUpConfirmation(supabase, schedule),
    invitationImage: hasInvitationImage(event.invitations),
  });
  if (!resolution.success) return { ok: false, reason: resolution.message };
  const { withTable, withoutTable } = resolution.templates;

  // Table numbers are per-guest: seating is routinely incomplete on the day, so
  // a guest with no assignment gets the variant that does not mention a table
  // rather than a message with a blank where the number should be.
  const templateForGuest = (guest: GuestApp): MessageTemplateApp =>
    withTable && guest.tableId ? withTable : withoutTable;

  let guestsQuery = supabase.from('guests').select('*').eq('event_id', schedule.eventId);
  if (options.guestIds?.length) {
    guestsQuery = guestsQuery.in('id', options.guestIds);
  }
  const { data: rawGuests, error: guestsError } = await guestsQuery;
  if (guestsError) return { ok: false, reason: `Could not load guests: ${guestsError.message}` };
  if (!rawGuests?.length) return { ok: false, reason: 'No guests found for event' };

  const all = rawGuests.map((g: Record<string, unknown>) => DbToAppTransformerSchema.parse(g));
  const targeted = options.guestIds?.length
    ? all
    : filterGuestsByTarget(all, schedule.targetStatus);
  if (targeted.length === 0) {
    return { ok: false, reason: 'No eligible guests after applying filters' };
  }

  // The sending gate (ADR 0027): only Guest Records inside the Record Package are
  // sent to. It applies to a hand-picked send too - the package caps sending, not
  // just the Dispatcher. A record outside it is skipped even if it has no phone
  // either, because adding a number would not make it send.
  const outsideIds =
    options.outsidePackage ?? (await loadOutsidePackageIds(supabase, schedule.eventId));
  if (!outsideIds) return { ok: false, reason: 'Could not check the record package' };
  const outside = targeted.filter((guest) => outsideIds.has(guest.id));
  const inside = targeted.filter((guest) => !outsideIds.has(guest.id));

  const reachable = inside.filter((guest) => validatePhoneNumber(guest.phone));

  // Skipped guests are a fact the Owner needs to see ("never got it - no phone
  // number", "outside the package"), not just a number in a summary. Only
  // meaningful for a whole audience: a hand-picked subset says nothing about who
  // was left out.
  if (!options.guestIds?.length) {
    const unreachable = inside.filter((guest) => !validatePhoneNumber(guest.phone));
    try {
      if (outside.length > 0) {
        await recordNotSent(supabase, scheduleId, outside.map((g) => g.id), 'scheduled', 'outside_package');
      }
      if (unreachable.length > 0) {
        await recordNotSent(supabase, scheduleId, unreachable.map((g) => g.id), 'scheduled', 'no_phone');
      }
    } catch (error) {
      console.error('[render] Could not record not-sent deliveries:', error);
    }
  }

  if (inside.length === 0) {
    return { ok: false, reason: 'Every targeted guest record is outside the record package' };
  }
  if (reachable.length === 0) return { ok: false, reason: 'No guests with valid phone numbers' };

  // Reserve before rendering: the RSVP token is part of the message, and a
  // guest who already has a Delivery for this Schedule keeps theirs (ADR 0011).
  const reserved = await reserveDeliveries(
    supabase,
    scheduleId,
    reachable.map((guest) => guest.id),
    options.guestIds?.length ? 'manual' : 'scheduled',
  );

  const { groups, tables } = await loadAudienceContext(supabase, reachable, Boolean(withTable));

  // Render every message in full before the caller queues any of them. A
  // content error is the whole Schedule's problem, so it fails here as one
  // reason rather than as hundreds of per-guest attempt failures.
  const rendered: RenderedDelivery[] = [];
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

    const result = renderSendPayload({ template, context, phone: guest.phone });
    if (!result.ok) {
      return {
        ok: false,
        reason: `Could not render the message for ${guest.name}: ${result.reason}`,
      };
    }
    rendered.push({
      deliveryId: delivery.id,
      templateId: template.id,
      payload: result.payload,
    });
  }

  if (rendered.length === 0) return { ok: false, reason: 'No deliveries could be prepared' };
  return { ok: true, rendered, schedule, outsidePackage: outside.length };
}
