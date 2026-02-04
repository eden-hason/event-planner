'use server';

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SCHEDULES_BY_EVENT_TYPE } from '../constants';
import { getExistingMessageTypes } from '../queries/schedules';
import { calculateScheduledDate } from '../utils';

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

    // Prepare records for insertion
    const records = schedulesToCreate.map((schedule) => ({
      event_id: eventId,
      message_type: schedule.messageType,
      scheduled_date: calculateScheduledDate(
        eventDate,
        schedule.daysOffset,
        schedule.defaultTime,
      ),
      status: 'draft' as const,
      delivery_method: 'both' as const,
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
