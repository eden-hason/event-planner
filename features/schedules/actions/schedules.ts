'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SCHEDULES_BY_EVENT_TYPE } from '../constants';
import { getTemplatesByKeys } from '../config/whatsapp-templates';
import { calculateScheduledDate } from '../utils';

export type UpdateScheduledDateState = {
  success: boolean;
  message?: string | null;
};

/**
 * Updates the scheduled_date of a schedule.
 * RLS ensures the user can only update their own schedules.
 *
 * @param scheduleId - The schedule ID to update
 * @param scheduledDate - The new scheduled date as an ISO 8601 string
 * @returns Result state with success status
 */
export async function updateScheduledDate(
  scheduleId: string,
  scheduledDate: string,
): Promise<UpdateScheduledDateState> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('schedules')
      .update({ scheduled_date: scheduledDate })
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating scheduled date:', error);
      return {
        success: false,
        message: 'Failed to update scheduled date.',
      };
    }

    revalidatePath('/app');

    return {
      success: true,
      message: 'Scheduled date updated.',
    };
  } catch (error) {
    console.error('Error in updateScheduledDate:', error);
    return {
      success: false,
      message: 'An unexpected error occurred.',
    };
  }
}

export type CreateDefaultSchedulesState = {
  success: boolean;
  message?: string | null;
  schedulesCreated?: number;
};

/**
 * Creates default schedules for a new event based on its type.
 * This function is idempotent - it skips creating schedules that already exist.
 *
 * @param eventId - The event ID to create schedules for
 * @param eventDate - The event date in ISO format (YYYY-MM-DD)
 * @param eventType - The type of event (wedding, birthday, etc.)
 * @returns Result state with success status and number of schedules created
 */
export async function createDefaultSchedules(
  eventId: string,
  eventDate: string,
  eventType: string = 'wedding',
): Promise<CreateDefaultSchedulesState> {
  try {
    const supabase = await createClient();

    // 1. Get default schedule configurations for this event type
    const defaultSchedules = DEFAULT_SCHEDULES_BY_EVENT_TYPE[eventType] || [];

    if (defaultSchedules.length === 0) {
      return {
        success: true,
        message: 'No default schedules configured for this event type.',
        schedulesCreated: 0,
      };
    }

    // 2. Get existing schedules for this event (to avoid duplicates)
    const { data: existingSchedules, error: fetchError } = await supabase
      .from('schedules')
      .select('template_key, scheduled_date')
      .eq('event_id', eventId);

    if (fetchError) {
      console.error('Error fetching existing schedules:', fetchError);
      return {
        success: false,
        message: 'Failed to check existing schedules.',
      };
    }

    // 3. Create a set of existing composite keys (template_key|scheduled_date)
    const existingKeys = new Set(
      existingSchedules?.map((s) => `${s.template_key}|${s.scheduled_date}`) ?? [],
    );

    // 4. Filter to only create schedules that don't already exist
    const schedulesToCreate = defaultSchedules.filter((schedule) => {
      const scheduledDate = calculateScheduledDate(eventDate, schedule.daysOffset, schedule.defaultTime);
      return !existingKeys.has(`${schedule.templateKey}|${scheduledDate}`);
    });

    if (schedulesToCreate.length === 0) {
      return {
        success: true,
        message: 'Default schedules already exist.',
        schedulesCreated: 0,
      };
    }

    // 5. Validate that all templates exist in local config
    const templateKeys = schedulesToCreate.map((s) => s.templateKey);
    const templateMap = getTemplatesByKeys(templateKeys);

    const missingTemplates = templateKeys.filter(
      (key) => !templateMap.has(key),
    );

    if (missingTemplates.length > 0) {
      console.error('Missing WhatsApp templates:', missingTemplates);
      return {
        success: false,
        message: `Missing templates with keys: ${missingTemplates.join(', ')}`,
      };
    }

    // 6. Create schedule records
    const records = schedulesToCreate.map((schedule) => ({
      event_id: eventId,
      template_key: schedule.templateKey,
      scheduled_date: calculateScheduledDate(
        eventDate,
        schedule.daysOffset,
        schedule.defaultTime,
      ),
      delivery_method: 'whatsapp' as const,
      target_status: schedule.targetStatus ?? null,
      action_type: schedule.actionType,
    }));

    const { error: insertError } = await supabase
      .from('schedules')
      .insert(records);

    if (insertError) {
      console.error('Error creating schedules:', insertError);
      return {
        success: false,
        message: 'Failed to create default schedules.',
      };
    }

    return {
      success: true,
      message: `Created ${schedulesToCreate.length} default schedule(s).`,
      schedulesCreated: schedulesToCreate.length,
    };
  } catch (error) {
    console.error('Unexpected error in createDefaultSchedules:', error);
    return {
      success: false,
      message: 'An unexpected error occurred.',
    };
  }
}
