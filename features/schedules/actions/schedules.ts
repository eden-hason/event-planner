'use server';

import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  UpdateScheduleSchema,
  updateScheduleToDb,
  scheduleDbToApp,
  ScheduleActionState,
} from '../schemas';

export async function updateSchedule(
  formData: FormData,
): Promise<ScheduleActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to update schedules',
      };
    }

    const rawData = Object.fromEntries(formData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: Record<string, any> = { ...rawData };

    // Parse JSON fields if they exist
    if (
      parsedData.targetAudienceStatus &&
      typeof parsedData.targetAudienceStatus === 'string'
    ) {
      try {
        parsedData.targetAudienceStatus = JSON.parse(
          parsedData.targetAudienceStatus,
        );
      } catch {
        parsedData.targetAudienceStatus = undefined;
      }
    }

    if (parsedData.channels && typeof parsedData.channels === 'string') {
      try {
        parsedData.channels = JSON.parse(parsedData.channels);
      } catch {
        parsedData.channels = undefined;
      }
    }

    // Parse numeric fields
    if (parsedData.offsetDays && typeof parsedData.offsetDays === 'string') {
      parsedData.offsetDays = parseInt(parsedData.offsetDays, 10);
    }

    const validationResult = UpdateScheduleSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const supabase = await createClient();

    const dbData = updateScheduleToDb(validatedData);

    const { data: updatedSchedule, error } = await supabase
      .from('schedules')
      .update(dbData)
      .eq('id', validatedData.id)
      .select()
      .single();

    if (error) {
      console.error('Update schedule error:', error);
      return {
        success: false,
        message: 'Database error: Could not update schedule.',
      };
    }

    revalidatePath(`/app/${updatedSchedule.event_id}/schedules`);

    return {
      success: true,
      message: 'Schedule updated successfully.',
      data: scheduleDbToApp(updatedSchedule),
    };
  } catch (error) {
    console.error('Update schedule error:', error);
    return {
      success: false,
      message: 'Failed to update schedule. Please try again.',
    };
  }
}
