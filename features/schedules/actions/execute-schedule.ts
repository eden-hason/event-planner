'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getScheduleById } from '../queries/schedules';
import { getWhatsAppTemplateById } from '../queries/whatsapp-templates';
import { getEventGuests } from '@/features/guests/queries/guests';
import { getGroupById } from '@/features/guests/queries/groups';
import { sendWhatsAppTemplateMessage } from './whatsapp';
import {
  filterGuestsByTarget,
  validatePhoneNumber,
  formatPhoneE164,
  buildDynamicTemplateParameters,
  type ParameterResolutionContext,
} from '../utils';
import { buildDynamicHeaderParameters } from '../utils/parameter-resolvers';
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
 * 2. Validate schedule status is 'scheduled'
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

    // 3. Validate schedule status
    if (schedule.status !== 'scheduled') {
      return {
        success: false,
        message: `Cannot execute schedule with status: ${schedule.status}`,
      };
    }

    // 4. Validate template is assigned
    if (!schedule.templateId) {
      return {
        success: false,
        message: 'No template assigned to schedule',
      };
    }

    // 5. Fetch WhatsApp template
    const template = await getWhatsAppTemplateById(schedule.templateId);

    if (!template) {
      return {
        success: false,
        message: 'Template not found',
      };
    }

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
      schedule.targetFilter,
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

    // 11. Send messages concurrently with dynamic parameter resolution
    const sendResults = await Promise.allSettled(
      guestsWithPhones.map(async (guest) => {
        const phoneE164 = formatPhoneE164(guest.phone!);

        // Build parameter resolution context
        const context: ParameterResolutionContext = {
          guest,
          event: schedule.event,
          group: guest.groupId ? groupsMap.get(guest.groupId) : null,
          schedule,
        };

        // Build template parameters dynamically
        // Safe to use non-null assertion because we validated above
        const parameters = buildDynamicTemplateParameters(
          template.bodyText,
          template.parameters!.placeholders,
          context,
        );

        // Build header parameters dynamically if configured
        const headerParameters = template.parameters?.headerPlaceholders?.length
          ? buildDynamicHeaderParameters(
              template.parameters.headerPlaceholders,
              context,
            )
          : undefined;

        // Send WhatsApp message
        const result = await sendWhatsAppTemplateMessage({
          to: phoneE164,
          templateName: template.templateName,
          languageCode: template.languageCode,
          parameters,
          headerParameters,
        });

        return {
          guest,
          result,
        };
      }),
    );

    // 12. Process results and create delivery records
    const deliveryRecords = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const promiseResult of sendResults) {
      if (promiseResult.status === 'fulfilled') {
        const { guest, result } = promiseResult.value;

        deliveryRecords.push({
          schedule_id: scheduleId,
          guest_id: guest.id,
          delivery_method: schedule.deliveryMethod,
          status: result.success ? ('sent' as const) : ('failed' as const),
          sent_at: result.success ? new Date().toISOString() : null,
          whatsapp_message_id: result.messageId || null,
          error_message: result.success ? null : result.message,
        });

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
          console.error(`Failed to send to ${guest.name}:`, result.message);
        }
      } else {
        // Promise rejected (unexpected error)
        failedCount++;
        console.error('Send promise rejected:', promiseResult.reason);
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

    // 14. Update schedule status
    const newStatus = sentCount > 0 ? 'sent' : 'failed';
    const { error: updateError } = await supabase
      .from('schedules')
      .update({
        status: newStatus,
        sent_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);

    if (updateError) {
      console.error('Error updating schedule status:', updateError);
    }

    // 15. Revalidate cache
    revalidatePath('/app');

    // 16. Return execution summary
    return {
      success: true,
      message:
        sentCount > 0
          ? `Successfully sent ${sentCount} message${sentCount !== 1 ? 's' : ''}`
          : 'All messages failed to send',
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
