import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SCHEDULE_SELECT,
  ScheduleDbToAppSchema,
  type ScheduleApp,
} from '../schemas';
import { toWhatsAppTemplate } from '../schemas/message-templates';
import {
  DbToAppTransformerSchema,
  GroupDbToAppTransformerSchema,
  type GroupApp,
} from '@/features/guests/schemas';
import { resolveTemplatesForEvent } from './resolve-reminder-templates';
import type { MessageTemplateApp } from '../schemas/message-templates';
import type { GuestApp } from '@/features/guests/schemas';
import {
  isGiftingEnabled,
  shouldSendTableNumbers,
  filterGuestsByTarget,
  isMessageSchedule,
  validatePhoneNumber,
  sendInChunks,
  sendSmsToGuest,
  buildDeliveryRecord,
  generateConfirmationToken,
  type ParameterResolutionContext,
  type GuestSendResult,
} from '../utils';

/**
 * The single execution engine behind every send path (manual action, cron,
 * admin trigger). Wrappers differ only in the Supabase client they pass, the
 * claim strategy, and what they do with the outcome.
 */
export type SendScheduleOptions = {
  supabase: SupabaseClient;
  /** Recorded on message_deliveries.triggered_by */
  triggeredBy: 'scheduled' | 'manual';
  /**
   * How to guard against double execution:
   * - 'precheck': reject if status is already sent/cancelled (user-facing paths)
   * - 'optimistic-lock': atomically flip status null -> sent, skip if lost the
   *   race, and revert/cancel on total failure (cron path)
   * - 'none': no guard (admin resend to selected guests)
   */
  claim: 'precheck' | 'optimistic-lock' | 'none';
  /** Skip guests that already have a successful delivery (cron resume) */
  skipAlreadyDelivered?: boolean;
  /**
   * Restrict the send to these guests (bypasses target-status filtering -
   * the caller picked them explicitly). Used by the admin manual send.
   */
  guestIds?: string[];
  /**
   * Whether a successful send marks the schedule as sent (default true).
   * Selective manual sends leave the schedule active.
   */
  markSentOnSuccess?: boolean;
};

export type SendScheduleOutcome = {
  success: boolean;
  message: string;
  scheduleId: string;
  eventId?: string;
  totalGuests: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
};

function outcomeError(
  scheduleId: string,
  message: string,
  eventId?: string,
): SendScheduleOutcome {
  return {
    success: false,
    message,
    scheduleId,
    eventId,
    totalGuests: 0,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  };
}

/** Maps a joined events row (snake_case) to the parameter-resolution shape. */
function mapEventRow(rawEvent: Record<string, unknown>) {
  const invitations = rawEvent.invitations as Record<string, string> | null;
  const settings = rawEvent.event_settings as {
    paybox_config?: { enabled: boolean; link: string };
    bit_config?: { enabled: boolean; phoneNumber: string };
  } | null;
  const guestExperience = rawEvent.guests_experience as {
    send_table_numbers?: boolean;
  } | null;
  return {
    id: rawEvent.id as string,
    userId: rawEvent.user_id as string,
    title: rawEvent.title as string,
    // Null for an event with no date. Such an event cannot have schedules -
    // every offset is relative to the date - so this engine should never see
    // one, but the column is nullable and the type says so.
    eventDate: rawEvent.event_date as string | null,
    location:
      (rawEvent.location as {
        name: string;
        coords?: { lat: number; lng: number };
      } | null) ?? undefined,
    hostDetails:
      (rawEvent.host_details as Record<string, unknown> | null) ?? undefined,
    invitations: invitations
      ? { imageUrl: invitations.image_url }
      : undefined,
    receptionTime: (rawEvent.reception_time as string | null) ?? undefined,
    shortCode: (rawEvent.short_code as string | null) ?? undefined,
    // Read by the template resolver, not by any placeholder.
    eventSettings: settings
      ? { payboxConfig: settings.paybox_config, bitConfig: settings.bit_config }
      : undefined,
    guestExperience: guestExperience
      ? { sendTableNumbers: guestExperience.send_table_numbers }
      : undefined,
  };
}

/**
 * If the schedule is less than 24 hours past due, revert to active (status
 * null) so the next cron run retries it. Otherwise mark as cancelled.
 */
async function revertOrCancel(
  supabase: SupabaseClient,
  scheduleId: string,
  scheduledDate: string,
) {
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const newStatus =
    Date.now() - new Date(scheduledDate).getTime() < twentyFourHours
      ? null
      : 'cancelled';

  await supabase
    .from('schedules')
    .update({ status: newStatus, sent_at: null })
    .eq('id', scheduleId);
}

export async function sendSchedule(
  scheduleId: string,
  options: SendScheduleOptions,
): Promise<SendScheduleOutcome> {
  const {
    supabase,
    triggeredBy,
    claim,
    skipAlreadyDelivered,
    guestIds,
    markSentOnSuccess = true,
  } = options;

  // 1. Fetch schedule with catalog joins + event
  const { data: rawSchedule, error: scheduleError } = await supabase
    .from('schedules')
    .select(
      `${SCHEDULE_SELECT},
       events (id, user_id, title, event_date, location, host_details,
               invitations, reception_time, short_code, event_settings,
               guests_experience)`,
    )
    .eq('id', scheduleId)
    .single();

  if (scheduleError || !rawSchedule || !rawSchedule.events) {
    return outcomeError(scheduleId, 'Schedule not found');
  }

  const schedule: ScheduleApp = ScheduleDbToAppSchema.parse(rawSchedule);
  const event = mapEventRow(rawSchedule.events);

  // 2. Refuse anything this engine does not execute. A phone_call schedule is a
  // plan for a person to work through, not a message - it has no template and
  // no channel. Every send entry point (cron, owner send-now, admin trigger,
  // admin manual resend) funnels through here, so this one guard covers them
  // all. Placed before the claim so a non-message row is never marked sent on
  // its way to failing. See docs/adr/0004.
  if (!isMessageSchedule(schedule)) {
    return outcomeError(
      scheduleId,
      `Schedule type ${schedule.scheduleTypeKey} is not executed by the message send engine`,
      schedule.eventId,
    );
  }

  // 3. Validate template assignment (channel and content both come from it)
  if (!schedule.template) {
    return outcomeError(
      scheduleId,
      'No template assigned to schedule',
      schedule.eventId,
    );
  }
  const template = schedule.template;

  // 4. Claim ('none' skips any guard - admin resend)
  if (claim === 'precheck') {
    if (schedule.status === 'sent' || schedule.status === 'cancelled') {
      return outcomeError(
        scheduleId,
        `Cannot execute schedule with status: ${schedule.status}`,
        schedule.eventId,
      );
    }
  } else if (claim === 'optimistic-lock') {
    const { data: claimed, error: claimError } = await supabase
      .from('schedules')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', scheduleId)
      .is('status', null)
      .select('id')
      .single();

    if (claimError || !claimed) {
      return {
        success: true,
        message: 'Schedule already claimed by another invocation',
        scheduleId,
        eventId: schedule.eventId,
        totalGuests: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
      };
    }
  }

  const fail = async (message: string): Promise<SendScheduleOutcome> => {
    if (claim === 'optimistic-lock') {
      await revertOrCancel(supabase, scheduleId, schedule.scheduledDate);
    }
    return outcomeError(scheduleId, message, schedule.eventId);
  };

  // 5. Resolve what actually gets sent. schedule.template is the family anchor
  // bound when the schedule was created - typically weeks ago, before seating
  // was done or a gift provider was added - so the body is resolved here from
  // the event's current configuration instead. No fallback if a row is missing:
  // that is a seeding bug, and sending a near-miss would hide it.
  const resolution = await resolveTemplatesForEvent({
    supabase,
    anchor: template,
    gifting: isGiftingEnabled(event.eventSettings),
    tableNumbers: shouldSendTableNumbers(event.guestExperience),
  });

  if (!resolution.success) {
    return fail(resolution.message);
  }

  const { withTable, withoutTable } = resolution.templates;

  /**
   * Table numbers are per-guest: seating is routinely incomplete on the day, so
   * a guest with no assignment gets the variant that does not mention a table
   * rather than a message with a blank where the number should be.
   */
  const templateForGuest = (guest: GuestApp): MessageTemplateApp =>
    withTable && guest.tableId ? withTable : withoutTable;

  // 6. Fetch and target guests
  let guestsQuery = supabase
    .from('guests')
    .select('*')
    .eq('event_id', schedule.eventId);
  if (guestIds && guestIds.length > 0) {
    guestsQuery = guestsQuery.in('id', guestIds);
  }
  const { data: rawGuests, error: guestsError } = await guestsQuery;

  if (guestsError || !rawGuests || rawGuests.length === 0) {
    return fail('No guests found for event');
  }

  const allGuests = rawGuests.map((g: Record<string, unknown>) =>
    DbToAppTransformerSchema.parse(g),
  );

  // Explicitly-picked guests bypass target-status filtering
  const targetedGuests = guestIds
    ? allGuests
    : filterGuestsByTarget(allGuests, schedule.targetStatus);

  if (targetedGuests.length === 0) {
    return fail('No eligible guests after applying filters');
  }

  const guestsWithPhones = targetedGuests.filter((guest) =>
    validatePhoneNumber(guest.phone),
  );

  if (guestsWithPhones.length === 0) {
    return fail('No guests with valid phone numbers');
  }

  const skippedCount = targetedGuests.length - guestsWithPhones.length;

  // 7. Optionally skip guests already delivered (safe cron resume)
  let pendingGuests = guestsWithPhones;
  if (skipAlreadyDelivered) {
    const { data: existingDeliveries } = await supabase
      .from('message_deliveries')
      .select('guest_id')
      .eq('schedule_id', scheduleId)
      .in('status', ['sent', 'delivered', 'read']);

    const alreadyDelivered = new Set(
      (existingDeliveries ?? []).map((d: { guest_id: string }) => d.guest_id),
    );
    pendingGuests = guestsWithPhones.filter(
      (guest) => !alreadyDelivered.has(guest.id),
    );

    if (pendingGuests.length === 0) {
      return {
        success: true,
        message: 'All eligible guests already delivered',
        scheduleId,
        eventId: schedule.eventId,
        totalGuests: guestsWithPhones.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount,
      };
    }
  }

  // 8. Send per channel, persisting delivery records per chunk
  let sentCount = 0;
  let failedCount = 0;

  const persistChunk = async (
    chunkResults: PromiseSettledResult<GuestSendResult>[],
  ) => {
    const deliveryRecords: Record<string, unknown>[] = [];
    for (const settled of chunkResults) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        deliveryRecords.push(buildDeliveryRecord(scheduleId, r, triggeredBy));
        if (r.success) {
          sentCount++;
        } else {
          failedCount++;
          console.error(
            `[send-schedule] Failed to send to ${r.guest.name} (code: ${r.errorCode ?? 'none'}):`,
            r.message,
          );
        }
      } else {
        failedCount++;
        console.error('[send-schedule] Send promise rejected:', settled.reason);
      }
    }

    if (deliveryRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('message_deliveries')
        .upsert(deliveryRecords, { onConflict: 'schedule_id,guest_id' });
      if (upsertError) {
        console.error(
          '[send-schedule] Error upserting delivery records:',
          upsertError,
        );
      }
    }
  };

  // Batch fetch the seating assignments referenced by the targeted guests,
  // mirroring how groups are fetched below. Only the table-number templates
  // read this, but the lookup is needed on both channels, so it sits outside
  // the branch. Skipped entirely when no table variant is in play.
  const tablesMap = new Map<
    string,
    { tableNumber: number; label: string | null }
  >();
  if (withTable) {
    const uniqueTableIds = [
      ...new Set(
        pendingGuests
          .map((guest) => guest.tableId)
          .filter((id): id is string => !!id),
      ),
    ];

    if (uniqueTableIds.length > 0) {
      const { data: rawTables, error: tablesError } = await supabase
        .from('tables')
        .select('id, table_number, label')
        .in('id', uniqueTableIds);

      if (tablesError) {
        return fail('Could not load seating assignments');
      }

      for (const row of rawTables ?? []) {
        tablesMap.set(row.id, {
          tableNumber: row.table_number,
          label: row.label,
        });
      }
    }
  }

  const tableForGuest = (guest: GuestApp) =>
    (guest.tableId ? tablesMap.get(guest.tableId) : null) ?? null;

  if (template.channel === 'sms') {
    const results = await Promise.allSettled(
      pendingGuests.map((guest) => {
        const confirmationToken = generateConfirmationToken();
        // Same channel as the anchor by construction - the resolver filters on
        // it - so the payload shape is the SMS one.
        const guestTemplate = templateForGuest(guest) as Extract<
          MessageTemplateApp,
          { channel: 'sms' }
        >;
        const context: ParameterResolutionContext = {
          guest,
          event,
          group: null,
          table: tableForGuest(guest),
          schedule,
          confirmationToken,
        };
        return sendSmsToGuest({
          guest,
          context,
          smsPayload: guestTemplate.payload,
          templateId: guestTemplate.id,
          confirmationToken,
        });
      }),
    );
    await persistChunk(results);
  } else {
    // Batch fetch groups referenced by the targeted guests
    const uniqueGroupIds = [
      ...new Set(
        pendingGuests
          .map((guest) => guest.groupId)
          .filter((id): id is string => !!id),
      ),
    ];

    const groupsMap = new Map<string, GroupApp>();
    if (uniqueGroupIds.length > 0) {
      const { data: rawGroups } = await supabase
        .from('groups')
        .select('*')
        .in('id', uniqueGroupIds);
      for (const rawGroup of rawGroups ?? []) {
        const group = GroupDbToAppTransformerSchema.parse(rawGroup);
        groupsMap.set(group.id, group);
      }
    }

    await sendInChunks(
      pendingGuests,
      (guest) => {
        const confirmationToken = generateConfirmationToken();
        const guestTemplate = templateForGuest(guest);
        const context: ParameterResolutionContext = {
          guest,
          event,
          group: guest.groupId ? groupsMap.get(guest.groupId) : null,
          table: tableForGuest(guest),
          schedule,
          confirmationToken,
        };
        return {
          context,
          // Non-null by construction: the resolver filters on the anchor's
          // channel, which this branch has narrowed to whatsapp.
          template: toWhatsAppTemplate(guestTemplate)!,
          templateId: guestTemplate.id,
          confirmationToken,
        };
      },
      async (chunkResults) => persistChunk(chunkResults),
    );
  }

  // 9. Final status
  if (sentCount > 0) {
    if (claim !== 'optimistic-lock' && markSentOnSuccess) {
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', scheduleId);
      if (updateError) {
        console.error('[send-schedule] Error updating schedule status:', updateError);
      }
    }
    return {
      success: true,
      message: `Successfully sent ${sentCount} message${sentCount !== 1 ? 's' : ''}`,
      scheduleId,
      eventId: schedule.eventId,
      totalGuests: pendingGuests.length,
      sentCount,
      failedCount,
      skippedCount,
    };
  }

  if (claim === 'optimistic-lock') {
    await revertOrCancel(supabase, scheduleId, schedule.scheduledDate);
  }

  return {
    success: false,
    message: 'All messages failed to send',
    scheduleId,
    eventId: schedule.eventId,
    totalGuests: pendingGuests.length,
    sentCount,
    failedCount,
    skippedCount,
  };
}
