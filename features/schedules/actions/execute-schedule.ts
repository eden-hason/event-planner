'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getScheduleById } from '../queries/schedules';
import { getWhatsAppTemplateById } from '../queries/whatsapp-templates';
import { getEventGuests } from '@/features/guests/queries/guests';
import { sendWhatsAppTemplateMessage } from './whatsapp';
import {
  filterGuestsByTarget,
  validatePhoneNumber,
  formatPhoneE164,
  buildTemplateParameters,
} from '../utils';

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

    // 9. Send messages concurrently
    const sendResults = await Promise.allSettled(
      guestsWithPhones.map(async (guest) => {
        const phoneE164 = formatPhoneE164(guest.phone!);

        // Build template parameters
        const parameters = buildTemplateParameters(
          template.bodyText,
          schedule.event.title,
          schedule.event.eventDate,
          guest.name,
        );

        // Send WhatsApp message
        const result = await sendWhatsAppTemplateMessage({
          to: phoneE164,
          templateName: template.templateName,
          languageCode: template.languageCode,
          parameters,
          headerParameters: template.headerParameters || undefined,
        });

        return {
          guest,
          result,
        };
      }),
    );

    // 10. Process results and create delivery records
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

    // 11. Bulk insert delivery records
    const { data: insertedDeliveries, error: insertError } = await supabase
      .from('message_deliveries')
      .insert(deliveryRecords)
      .select('id');

    if (insertError) {
      console.error('Error inserting delivery records:', insertError);
    }

    const deliveryIds = insertedDeliveries?.map((d) => d.id) || [];

    // 12. Update schedule status
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

    // 13. Revalidate cache
    revalidatePath('/app');

    // 14. Return execution summary
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
