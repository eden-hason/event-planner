import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ScheduleDbToAppSchema } from '@/features/schedules/schemas';
import { WhatsAppTemplateDbToAppSchema } from '@/features/schedules/schemas/whatsapp-templates';
import {
  DbToAppTransformerSchema,
  GroupDbToAppTransformerSchema,
} from '@/features/guests/schemas';
import { sendWhatsAppTemplateMessage } from '@/features/schedules/actions/whatsapp';
import { sendSmsMessage, buildSmsFallbackBody } from '@/features/schedules/actions/sms';
import type { DeliveryMethod } from '@/features/schedules/schemas';
import {
  filterGuestsByTarget,
  validatePhoneNumber,
  formatPhoneE164,
  buildDynamicTemplateParameters,
  buildDynamicButtonParameters,
  type ParameterResolutionContext,
} from '@/features/schedules/utils';
import { buildDynamicHeaderParameters } from '@/features/schedules/utils/parameter-resolvers';
import type { GroupApp } from '@/features/guests/schemas';

/**
 * Result of processing all due schedules.
 */
export interface ProcessScheduledMessagesResult {
  schedulesProcessed: number;
  totalSent: number;
  totalFailed: number;
  errors: { scheduleId: string; error: string }[];
}

/**
 * Top-level entry point: queries due schedules and processes each one.
 * Accepts a Supabase client as parameter so it works from both the cron
 * route (service role) and manual triggers.
 */
export async function processScheduledMessages(
  supabase: SupabaseClient,
): Promise<ProcessScheduledMessagesResult> {
  const result: ProcessScheduledMessagesResult = {
    schedulesProcessed: 0,
    totalSent: 0,
    totalFailed: 0,
    errors: [],
  };

  // Query due schedules with event join
  const { data: rawSchedules, error } = await supabase
    .from('schedules')
    .select(
      `
      *,
      events (
        id,
        user_id,
        title,
        event_date,
        venue_name,
        location,
        host_details,
        invitations
      )
    `,
    )
    .eq('status', 'scheduled')
    .lte('scheduled_date', new Date().toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[cron] Error fetching due schedules:', error);
    return result;
  }

  if (!rawSchedules || rawSchedules.length === 0) {
    return result;
  }

  console.log(`[cron] Found ${rawSchedules.length} due schedule(s)`);

  // Process each schedule independently — one failure must not block others
  for (const rawSchedule of rawSchedules) {
    try {
      const { sentCount, failedCount } = await processSingleSchedule(
        supabase,
        rawSchedule,
      );
      result.schedulesProcessed++;
      result.totalSent += sentCount;
      result.totalFailed += failedCount;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `[cron] Error processing schedule ${rawSchedule.id}:`,
        message,
      );
      result.errors.push({ scheduleId: rawSchedule.id, error: message });
    }
  }

  return result;
}

/**
 * Processes a single schedule: parses, claims via optimistic lock,
 * fetches template + guests, sends messages, and records deliveries.
 */
async function processSingleSchedule(
  supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawScheduleWithEvent: any,
): Promise<{ sentCount: number; failedCount: number }> {
  // 1. Parse schedule to app format
  const schedule = ScheduleDbToAppSchema.parse(rawScheduleWithEvent);

  // Transform event data to app format (same pattern as getScheduleById)
  const rawEvent = rawScheduleWithEvent.events;
  if (!rawEvent) {
    throw new Error('Schedule has no associated event');
  }

  const event = {
    id: rawEvent.id as string,
    userId: rawEvent.user_id as string,
    title: rawEvent.title as string,
    eventDate: rawEvent.event_date as string,
    venueName: (rawEvent.venue_name as string | null) ?? undefined,
    location: (rawEvent.location as { name: string; coords?: { lat: number; lng: number } } | null) ?? undefined,
    hostDetails: (rawEvent.host_details as Record<string, unknown> | null) ?? undefined,
    invitations: rawEvent.invitations
      ? {
          frontImageUrl: (rawEvent.invitations as Record<string, string>).front_image_url,
          backImageUrl: (rawEvent.invitations as Record<string, string>).back_image_url,
        }
      : undefined,
  };

  // 2. Optimistic lock — claim by setting status to 'sent'
  const { data: claimed, error: claimError } = await supabase
    .from('schedules')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', schedule.id)
    .eq('status', 'scheduled')
    .select('id')
    .single();

  if (claimError || !claimed) {
    console.log(
      `[cron] Schedule ${schedule.id} already claimed by another invocation`,
    );
    return { sentCount: 0, failedCount: 0 };
  }

  // 3. Validate template is assigned
  if (!schedule.templateId) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('No template assigned to schedule');
  }

  // 4. Fetch WhatsApp template
  const { data: rawTemplate, error: templateError } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('id', schedule.templateId)
    .single();

  if (templateError || !rawTemplate) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('Template not found');
  }

  const template = WhatsAppTemplateDbToAppSchema.parse(rawTemplate);

  // 5. Fetch all event guests
  const { data: rawGuests, error: guestsError } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', schedule.eventId);

  if (guestsError || !rawGuests || rawGuests.length === 0) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('No guests found for event');
  }

  const allGuests = rawGuests.map((g: Record<string, unknown>) =>
    DbToAppTransformerSchema.parse(g),
  );

  // 6. Apply target filter and validate phone numbers
  const targetedGuests = filterGuestsByTarget(allGuests, schedule.targetFilter);

  if (targetedGuests.length === 0) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('No eligible guests after applying filters');
  }

  const guestsWithPhones = targetedGuests.filter((guest) =>
    validatePhoneNumber(guest.phone),
  );

  if (guestsWithPhones.length === 0) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('No guests with valid phone numbers');
  }

  // 7. Validate template has parameters configuration
  if (!template.parameters) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('Template missing parameter configuration');
  }

  // 8. Batch fetch groups
  const uniqueGroupIds = [
    ...new Set(
      guestsWithPhones
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

    if (rawGroups) {
      for (const rawGroup of rawGroups) {
        const group = GroupDbToAppTransformerSchema.parse(rawGroup);
        groupsMap.set(group.id, group);
      }
    }
  }

  // 9. Send messages concurrently
  const sendResults = await Promise.allSettled(
    guestsWithPhones.map(async (guest) => {
      const phoneE164 = formatPhoneE164(guest.phone!);
      const confirmationToken = randomBytes(32).toString('hex');

      const context: ParameterResolutionContext = {
        guest,
        event,
        group: guest.groupId ? groupsMap.get(guest.groupId) : null,
        schedule,
        confirmationToken,
      };

      const parameters = buildDynamicTemplateParameters(
        template.parameters!.placeholders,
        context,
      );

      const headerParameters = template.parameters?.headerPlaceholders?.length
        ? buildDynamicHeaderParameters(
            template.parameters.headerPlaceholders,
            context,
          )
        : undefined;

      const buttonParameters = template.parameters?.buttonPlaceholders?.length
        ? buildDynamicButtonParameters(
            template.parameters.buttonPlaceholders,
            context,
          )
        : undefined;

      const whatsappResult = await sendWhatsAppTemplateMessage({
        to: phoneE164,
        templateName: template.templateName,
        languageCode: template.languageCode,
        parameters,
        headerParameters,
        buttonParameters,
      });

      let result = whatsappResult;
      let channel: DeliveryMethod = 'whatsapp';

      if (!whatsappResult.success) {
        const smsBody = buildSmsFallbackBody(context, confirmationToken);
        const smsResult = await sendSmsMessage({ to: phoneE164, body: smsBody });
        if (smsResult.success) {
          result = smsResult;
          channel = 'sms';
        }
      }

      return { guest, result, confirmationToken, channel };
    }),
  );

  // 10. Process results and build delivery records
  const deliveryRecords = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const promiseResult of sendResults) {
    if (promiseResult.status === 'fulfilled') {
      const { guest, result, confirmationToken, channel } = promiseResult.value;

      deliveryRecords.push({
        schedule_id: schedule.id,
        guest_id: guest.id,
        delivery_method: channel,
        status: result.success ? ('sent' as const) : ('failed' as const),
        sent_at: result.success ? new Date().toISOString() : null,
        external_message_id: result.messageId || null,
        error_message: result.success ? null : result.message,
        confirmation_token: confirmationToken,
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        console.error(`[cron] Failed to send to ${guest.name}:`, result.message);
      }
    } else {
      failedCount++;
      console.error('[cron] Send promise rejected:', promiseResult.reason);
    }
  }

  // 11. Upsert delivery records (skip already-processed via unique constraint)
  if (deliveryRecords.length > 0) {
    const { error: upsertError } = await supabase
      .from('message_deliveries')
      .upsert(deliveryRecords, { onConflict: 'schedule_id,guest_id' });

    if (upsertError) {
      console.error('[cron] Error upserting delivery records:', upsertError);
    }
  }

  // 12. Final status — if all failed, revert or cancel
  if (sentCount === 0) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
  }
  // If sentCount > 0, status is already 'sent' from step 2

  console.log(
    `[cron] Schedule ${schedule.id}: sent=${sentCount}, failed=${failedCount}`,
  );

  return { sentCount, failedCount };
}

/**
 * If the schedule is less than 24 hours old, revert to 'scheduled' for retry.
 * Otherwise, mark as 'cancelled'.
 */
async function revertOrCancel(
  supabase: SupabaseClient,
  scheduleId: string,
  scheduledDate: string,
) {
  const scheduledAt = new Date(scheduledDate).getTime();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const newStatus =
    now - scheduledAt < twentyFourHours ? 'scheduled' : 'cancelled';

  await supabase
    .from('schedules')
    .update({ status: newStatus, sent_at: null })
    .eq('id', scheduleId);
}
