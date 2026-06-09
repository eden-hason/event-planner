import type { SupabaseClient } from '@supabase/supabase-js';
import { ScheduleDbToAppSchema } from '@/features/schedules/schemas';
import { getTemplateByKey } from '@/features/schedules/config/whatsapp-templates';
import {
  DbToAppTransformerSchema,
  GroupDbToAppTransformerSchema,
} from '@/features/guests/schemas';
import {
  filterGuestsByTarget,
  validatePhoneNumber,
  sendInChunks,
  sendSmsToGuest,
  buildDeliveryRecord,
  generateConfirmationToken,
  type ParameterResolutionContext,
} from '@/features/schedules/utils';
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
        location,
        host_details,
        invitations,
        reception_time,
        short_code
      )
    `,
    )
    .is('status', null)
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
    location: (rawEvent.location as { name: string; coords?: { lat: number; lng: number } } | null) ?? undefined,
    hostDetails: (rawEvent.host_details as Record<string, unknown> | null) ?? undefined,
    invitations: rawEvent.invitations
      ? {
          imageUrl: (rawEvent.invitations as Record<string, string>).image_url,
        }
      : undefined,
    receptionTime: (rawEvent.reception_time as string | null) ?? undefined,
    shortCode: (rawEvent.short_code as string | null) ?? undefined,
  };

  // 2. Optimistic lock — claim by setting status to 'sent'.
  // Active schedules have status null; claiming flips null -> 'sent' so a
  // concurrent invocation sees a non-null status and skips the row.
  const { data: claimed, error: claimError } = await supabase
    .from('schedules')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', schedule.id)
    .is('status', null)
    .select('id')
    .single();

  if (claimError || !claimed) {
    console.log(
      `[cron] Schedule ${schedule.id} already claimed by another invocation`,
    );
    return { sentCount: 0, failedCount: 0 };
  }

  // 3. Validate template is assigned
  if (!schedule.templateKey) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('No template assigned to schedule');
  }

  // 4. Resolve template from local config
  const templateConfig = getTemplateByKey(schedule.templateKey);

  if (!templateConfig) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('Template not found');
  }

  const template = templateConfig.whatsapp;

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
  const targetedGuests = filterGuestsByTarget(allGuests, schedule.targetStatus);

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

  // 6b. Skip guests that already have a successful delivery for this schedule.
  // Lets the cron resume safely after a timeout without resending duplicates.
  const { data: existingDeliveries } = await supabase
    .from('message_deliveries')
    .select('guest_id')
    .eq('schedule_id', schedule.id)
    .in('status', ['sent', 'delivered', 'read']);

  const alreadyDelivered = new Set(
    (existingDeliveries ?? []).map((d: { guest_id: string }) => d.guest_id),
  );

  const pendingGuests = guestsWithPhones.filter(
    (guest) => !alreadyDelivered.has(guest.id),
  );

  if (pendingGuests.length === 0) {
    console.log(
      `[cron] Schedule ${schedule.id}: all eligible guests already delivered`,
    );
    return { sentCount: 0, failedCount: 0 };
  }

  // SMS schedules: send via ActiveTrail and return early (no WhatsApp template needed)
  if (schedule.deliveryMethod === 'sms') {
    let sentCount = 0;
    let failedCount = 0;

    const results = await Promise.allSettled(
      pendingGuests.map((guest) => {
        const confirmationToken = generateConfirmationToken();
        const context: ParameterResolutionContext = {
          guest,
          event,
          group: null,
          schedule,
          confirmationToken,
        };
        return sendSmsToGuest({ guest, context, confirmationToken });
      }),
    );

    const deliveryRecords = [];
    for (const settled of results) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        deliveryRecords.push(buildDeliveryRecord(schedule.id, r));
        if (r.success) {
          sentCount++;
        } else {
          failedCount++;
          console.error(`[cron] SMS failed to send to ${r.guest.name}:`, r.message);
        }
      } else {
        failedCount++;
        console.error('[cron] SMS send promise rejected:', settled.reason);
      }
    }

    if (deliveryRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('message_deliveries')
        .upsert(deliveryRecords, { onConflict: 'schedule_id,guest_id' });
      if (upsertError) {
        console.error('[cron] Error upserting SMS delivery records:', upsertError);
      }
    }

    if (sentCount === 0) {
      await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    }

    console.log(`[cron] Schedule ${schedule.id} (SMS): sent=${sentCount}, failed=${failedCount}`);
    return { sentCount, failedCount };
  }

  // 7. Validate WhatsApp template is available (SMS was handled above)
  if (!template) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('Template does not have a WhatsApp configuration');
  }

  // 8. Validate template has parameters configuration
  if (!template.parameters) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
    throw new Error('Template missing parameter configuration');
  }

  // 9. Batch fetch groups
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

    if (rawGroups) {
      for (const rawGroup of rawGroups) {
        const group = GroupDbToAppTransformerSchema.parse(rawGroup);
        groupsMap.set(group.id, group);
      }
    }
  }

  // 10. Send messages in rate-limited chunks, persisting delivery records after each chunk
  let sentCount = 0;
  let failedCount = 0;
  const totalGuests = pendingGuests.length;

  await sendInChunks(
    pendingGuests,
    (guest) => {
      const confirmationToken = generateConfirmationToken();
      const context: ParameterResolutionContext = {
        guest,
        event,
        group: guest.groupId ? groupsMap.get(guest.groupId) : null,
        schedule,
        confirmationToken,
      };
      return { context, template, confirmationToken };
    },
    async (chunkResults, chunkIndex, totalChunks) => {
      const deliveryRecords = [];

      for (const settled of chunkResults) {
        if (settled.status === 'fulfilled') {
          const r = settled.value;
          deliveryRecords.push(buildDeliveryRecord(schedule.id, r));
          if (r.success) {
            sentCount++;
          } else {
            failedCount++;
            console.error(
              `[cron] Failed to send to ${r.guest.name} (code: ${r.errorCode ?? 'none'}):`,
              r.message,
            );
          }
        } else {
          failedCount++;
          console.error('[cron] Send promise rejected:', settled.reason);
        }
      }

      if (deliveryRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('message_deliveries')
          .upsert(deliveryRecords, { onConflict: 'schedule_id,guest_id' });

        if (upsertError) {
          console.error(
            `[cron] Error upserting delivery records (chunk ${chunkIndex + 1}/${totalChunks}):`,
            upsertError,
          );
        }
      }

      console.log(
        `[cron] Chunk ${chunkIndex + 1}/${totalChunks} complete — sent=${sentCount}, failed=${failedCount}, total=${totalGuests}`,
      );
    },
  );

  // 10. Final status — if all failed, revert or cancel
  if (sentCount === 0) {
    await revertOrCancel(supabase, schedule.id, rawScheduleWithEvent.scheduled_date);
  }

  console.log(
    `[cron] Schedule ${schedule.id}: sent=${sentCount}, failed=${failedCount}`,
  );

  return { sentCount, failedCount };
}

/**
 * If the schedule is less than 24 hours old, revert to active (status null)
 * so the next cron run retries it. Otherwise, mark as 'cancelled'.
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
    now - scheduledAt < twentyFourHours ? null : 'cancelled';

  await supabase
    .from('schedules')
    .update({ status: newStatus, sent_at: null })
    .eq('id', scheduleId);
}
