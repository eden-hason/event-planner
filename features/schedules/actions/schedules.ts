'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SCHEDULES_BY_EVENT_TYPE } from '../constants';
import { getDefaultTemplatesByMessageTypes } from '../queries/message-templates';
import { getExistingMessageTypes } from '../queries/schedules';
import type { EventType, MessageType, ScheduleStatus } from '../schemas';
import { calculateScheduledDate } from '../utils';

export type UpdateScheduleStatusState = {
  success: boolean;
  message?: string | null;
};

/**
 * Updates the status of a schedule (e.g. toggling between draft and scheduled).
 * RLS ensures the user can only update their own schedules.
 *
 * @param scheduleId - The schedule ID to update
 * @param status - The new schedule status
 * @returns Result state with success status
 */
export async function updateScheduleStatus(
  scheduleId: string,
  status: ScheduleStatus,
): Promise<UpdateScheduleStatusState> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('schedules')
      .update({ status })
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating schedule status:', error);
      return {
        success: false,
        message: 'Failed to update schedule status.',
      };
    }

    revalidatePath('/app');

    return {
      success: true,
      message:
        status === 'scheduled'
          ? 'Schedule enabled.'
          : 'Schedule disabled.',
    };
  } catch (error) {
    console.error('Error in updateScheduleStatus:', error);
    return {
      success: false,
      message: 'An unexpected error occurred.',
    };
  }
}

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
 * This function is idempotent - it skips creating schedules for message types
 * that already exist for the event.
 *
 * @param eventId - The event ID to create schedules for
 * @param eventDate - The event date in ISO format (YYYY-MM-DD)
 * @param eventType - The type of event (wedding, birthday, etc.)
 * @returns Result state with success status and number of schedules created
 */
export async function createDefaultSchedules(
  eventId: string,
  eventDate: string,
  eventType: string,
): Promise<CreateDefaultSchedulesState> {
  try {
    const supabase = await createClient();

    // Get default schedules for this event type
    const defaultSchedules = DEFAULT_SCHEDULES_BY_EVENT_TYPE[eventType];
    if (!defaultSchedules || defaultSchedules.length === 0) {
      return {
        success: true,
        message: 'No default schedules defined for this event type',
        schedulesCreated: 0,
      };
    }

    // Get existing message types to avoid duplicates (idempotency)
    const existingTypes = await getExistingMessageTypes(eventId);
    const existingTypesSet = new Set(existingTypes);

    // Filter out schedules that already exist
    const schedulesToCreate = defaultSchedules.filter(
      (schedule) => !existingTypesSet.has(schedule.messageType),
    );

    if (schedulesToCreate.length === 0) {
      return {
        success: true,
        message: 'All default schedules already exist',
        schedulesCreated: 0,
      };
    }

    // Get message types that need templates
    const messageTypesToCreate = schedulesToCreate.map(
      (s) => s.messageType as MessageType,
    );

    // Fetch default templates for all message types
    const templateMap = await getDefaultTemplatesByMessageTypes(
      messageTypesToCreate,
      eventType as EventType,
    );

    // Validate all message types have default templates
    for (const messageType of messageTypesToCreate) {
      if (!templateMap.has(messageType)) {
        console.error(`No default template found for message_type: ${messageType}`);
        return {
          success: false,
          message: `No default template found for message type: ${messageType}`,
        };
      }
    }

    // Prepare records for insertion
    const records = schedulesToCreate.map((schedule) => ({
      event_id: eventId,
      message_type: schedule.messageType,
      template_id: templateMap.get(schedule.messageType as MessageType),
      scheduled_date: calculateScheduledDate(
        eventDate,
        schedule.daysOffset,
        schedule.defaultTime,
      ),
      status: 'draft' as const,
      delivery_method: 'whatsapp' as const,
    }));

    // Insert schedules
    const { error } = await supabase.from('schedules').insert(records);

    if (error) {
      console.error('Error creating default schedules:', error);
      return {
        success: false,
        message: 'Failed to create default schedules',
      };
    }

    return {
      success: true,
      message: `Created ${schedulesToCreate.length} default schedules`,
      schedulesCreated: schedulesToCreate.length,
    };
  } catch (error) {
    console.error('Error in createDefaultSchedules:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
    };
  }
}
