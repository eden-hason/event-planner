'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getScheduleById } from '../queries/schedules';
import { getTemplateByKey } from '../config/whatsapp-templates';
import { getEventGuests } from '@/features/guests/queries/guests';
import { getGroupById } from '@/features/guests/queries/groups';
import {
  filterGuestsByTarget,
  validatePhoneNumber,
  sendInChunks,
  buildDeliveryRecord,
  generateConfirmationToken,
  type ParameterResolutionContext,
} from '../utils';
import type { GroupApp } from '@/features/guests/schemas';

/**
 * Execution result summary.
 */
export interface ExecuteScheduleSummary {
  scheduleId: string;
  totalGuests: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  deliveryIds: string[];
}

/**
 * Result of schedule execution.
 */
export interface ExecuteScheduleResult {
  success: boolean;
  message: string;
  summary?: ExecuteScheduleSummary;
}

/**
 * Executes a schedule by sending WhatsApp messages to all eligible guests.
 *
 * Workflow:
 * 1. Authenticate user and fetch schedule
 * 2. Validate schedule has not already been executed
 * 3. Fetch WhatsApp template
 * 4. Fetch and filter guests
 * 5. Send messages concurrently
 * 6. Create delivery records
 * 7. Update schedule status
 *
 * @param scheduleId - The schedule ID to execute
 * @returns Execution result with summary
 */
export async function executeSchedule(
  scheduleId: string,
): Promise<ExecuteScheduleResult> {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Unauthorized',
      };
    }

    // 2. Fetch schedule with event (RLS auto-verifies ownership)
    const schedule = await getScheduleById(scheduleId);

    if (!schedule) {
      return {
        success: false,
        message: 'Schedule not found',
      };
    }

    // 3. Validate schedule has not already been executed
    if (schedule.status === 'sent' || schedule.status === 'cancelled') {
      return {
        success: false,
        message: `Cannot execute schedule with status: ${schedule.status}`,
      };
    }

    // 4. Validate template is assigned
    if (!schedule.templateKey) {
      return {
        success: false,
        message: 'No template assigned to schedule',
      };
    }

    // 5. Resolve template from local config
    const templateConfig = getTemplateByKey(schedule.templateKey);

    if (!templateConfig) {
      return {
        success: false,
        message: 'Template not found',
      };
    }

    const template = templateConfig.whatsapp;

    // 6. Fetch all event guests
    const allGuests = await getEventGuests(schedule.eventId);

    if (!allGuests || allGuests.length === 0) {
      return {
        success: false,
        message: 'No guests found for event',
      };
    }

    // 7. Apply target filter
    const targetedGuests = filterGuestsByTarget(
      allGuests,
      schedule.targetStatus,
      schedule.actionType ?? undefined,
    );

    if (targetedGuests.length === 0) {
      return {
        success: false,
        message: 'No eligible guests after applying filters',
      };
    }

    // 8. Filter guests with valid phone numbers
    const guestsWithPhones = targetedGuests.filter((guest) =>
      validatePhoneNumber(guest.phone),
    );

    if (guestsWithPhones.length === 0) {
      return {
        success: false,
        message: 'No guests with valid phone numbers',
      };
    }

    const skippedCount = targetedGuests.length - guestsWithPhones.length;

    // 9. Validate template has parameters configuration
    if (!template.parameters) {
      return {
        success: false,
        message: 'Template missing parameter configuration',
      };
    }

    // 10. Batch fetch all needed groups for performance
    const uniqueGroupIds = [
      ...new Set(
        guestsWithPhones
          .map((guest) => guest.groupId)
          .filter((id): id is string => !!id),
      ),
    ];

    const groupsMap = new Map<string, GroupApp>();
    await Promise.all(
      uniqueGroupIds.map(async (groupId) => {
        const group = await getGroupById(groupId);
        if (group) {
          groupsMap.set(groupId, group);
        }
      }),
    );

    // 11. Send messages in rate-limited chunks
    const sendResults = await sendInChunks(guestsWithPhones, (guest) => {
      const confirmationToken = generateConfirmationToken();
      const context: ParameterResolutionContext = {
        guest,
        event: schedule.event,
        group: guest.groupId ? groupsMap.get(guest.groupId) : null,
        schedule,
        confirmationToken,
      };
      return { context, template, confirmationToken };
    });

    // 12. Process results and create delivery records
    const deliveryRecords = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const settled of sendResults) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        deliveryRecords.push(buildDeliveryRecord(scheduleId, r));
        if (r.success) {
          sentCount++;
        } else {
          failedCount++;
          console.error(
            `Failed to send to ${r.guest.name} (code: ${r.errorCode ?? 'none'}):`,
            r.message,
          );
        }
      } else {
        failedCount++;
        console.error('Send promise rejected:', settled.reason);
      }
    }

    // 13. Bulk insert delivery records
    const { data: insertedDeliveries, error: insertError } = await supabase
      .from('message_deliveries')
      .insert(deliveryRecords)
      .select('id');

    if (insertError) {
      console.error('Error inserting delivery records:', insertError);
    }

    const deliveryIds = insertedDeliveries?.map((d) => d.id) || [];

    // 14. Update schedule status (only mark sent when at least one message was delivered)
    const { error: updateError } = sentCount > 0
      ? await supabase
          .from('schedules')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', scheduleId)
      : { error: null };

    if (updateError) {
      console.error('Error updating schedule status:', updateError);
    }

    // 15. Revalidate cache
    revalidatePath('/app');

    // 16. Return execution summary
    if (sentCount === 0) {
      return {
        success: false,
        message: 'All messages failed to send',
        summary: {
          scheduleId,
          totalGuests: guestsWithPhones.length,
          sentCount,
          failedCount,
          skippedCount,
          deliveryIds,
        },
      };
    }

    return {
      success: true,
      message: `Successfully sent ${sentCount} message${sentCount !== 1 ? 's' : ''}`,
      summary: {
        scheduleId,
        totalGuests: guestsWithPhones.length,
        sentCount,
        failedCount,
        skippedCount,
        deliveryIds,
      },
    };
  } catch (error) {
    console.error('Error executing schedule:', error);
    return {
      success: false,
      message: 'Failed to execute schedule',
    };
  }
}
