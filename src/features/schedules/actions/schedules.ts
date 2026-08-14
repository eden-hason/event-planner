'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { ScheduleSelectionSchema, type ScheduleSelectionItem } from '../schemas';

/**
 * Reads execution_kind off a raw `schedule_types` embed. PostgREST returns a
 * to-one embed as an object, but the generated types allow an array, so both
 * shapes are handled. Defaults to treating the row as a message: the safe
 * direction is to keep applying the existing guards, never to skip them.
 */
function isMessageScheduleRow(row: {
  schedule_types: { execution_kind: string } | { execution_kind: string }[] | null;
}): boolean {
  const types = Array.isArray(row.schedule_types)
    ? row.schedule_types[0]
    : row.schedule_types;
  return (types?.execution_kind ?? 'message') === 'message';
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
  scheduledTime: string,
): Promise<UpdateScheduledDateState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select('status, schedule_types (execution_kind)')
      .eq('id', scheduleId)
      .single();

    if (fetchError || !existing) {
      return { success: false, message: 'Schedule not found.' };
    }

    if (existing.status === 'sent') {
      return { success: false, message: 'Cannot modify a schedule that has already been sent.' };
    }

    // A restrictive RLS policy already blocks this, but an UPDATE that matches
    // no rows returns no error - without this the caller would be told it
    // succeeded. Rescheduling a call plan is a back-office action.
    if (!isMessageScheduleRow(existing)) {
      return {
        success: false,
        message: 'A call round can only be rescheduled from the back office.',
      };
    }

    const { error } = await supabase
      .from('schedules')
      .update({ scheduled_date: scheduledDate, scheduled_time: scheduledTime })
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

export type UpdateScheduleStatusState = {
  success: boolean;
  message?: string | null;
};

export async function updateScheduleStatus(
  scheduleId: string,
  enabled: boolean,
): Promise<UpdateScheduleStatusState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select('status, schedule_types (execution_kind)')
      .eq('id', scheduleId)
      .single();

    if (fetchError || !existing) {
      return { success: false, message: 'Schedule not found.' };
    }

    if (existing.status === 'sent') {
      return { success: false, message: 'Cannot modify a schedule that has already been sent.' };
    }

    // See updateScheduledDate: RLS blocks the write, but silently.
    if (!isMessageScheduleRow(existing)) {
      return {
        success: false,
        message: 'A call round can only be changed from the back office.',
      };
    }

    const { error } = await supabase
      .from('schedules')
      .update({ status: enabled ? null : 'cancelled' })
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating schedule status:', error);
      return { success: false, message: 'Failed to update schedule status.' };
    }

    revalidatePath('/app');

    return { success: true, message: enabled ? 'Schedule enabled.' : 'Schedule disabled.' };
  } catch (error) {
    console.error('Error in updateScheduleStatus:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

export type CreateSchedulesFromSelectionState = {
  success: boolean;
  message?: string | null;
  schedulesCreated?: number;
};

/**
 * Creates schedules from a user-customized selection made in the setup wizard.
 * Each selection carries a fully-resolved date/time decided by the user.
 * Idempotent - skips selections whose type|template|date already exists.
 * Referential integrity of schedule_type_id/template_id is enforced by FKs.
 *
 * @param eventId - The event ID to create schedules for
 * @param selections - The schedules the user chose to create, with custom dates/times
 * @returns Result state with success status and number of schedules created
 */
export async function createSchedulesFromSelection(
  eventId: string,
  selections: ScheduleSelectionItem[],
): Promise<CreateSchedulesFromSelectionState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const parsed = ScheduleSelectionSchema.safeParse(selections);
    if (!parsed.success) {
      return { success: false, message: 'Invalid schedule selection.' };
    }

    if (parsed.data.length === 0) {
      return { success: true, message: 'No schedules selected.', schedulesCreated: 0 };
    }

    const supabase = await createClient();

    // Skip selections that already exist (guards against double-submit).
    // Keyed on the schedule type as well as the template: a call round has no
    // template, so a template-only key would collapse every call plan to
    // 'null|<date>' and silently drop all but the first.
    const { data: existingSchedules, error: fetchError } = await supabase
      .from('schedules')
      .select('schedule_type_id, template_id, scheduled_date')
      .eq('event_id', eventId);

    if (fetchError) {
      console.error('Error fetching existing schedules:', fetchError);
      return { success: false, message: 'Failed to check existing schedules.' };
    }

    const existingKeys = new Set(
      existingSchedules?.map(
        (s) => `${s.schedule_type_id}|${s.template_id ?? ''}|${s.scheduled_date}`,
      ) ?? [],
    );

    const toCreate = parsed.data.filter(
      (s) =>
        !existingKeys.has(
          `${s.scheduleTypeId}|${s.templateId ?? ''}|${s.scheduledDate}`,
        ),
    );

    if (toCreate.length === 0) {
      return { success: true, message: 'Schedules already exist.', schedulesCreated: 0 };
    }

    const records = toCreate.map((s) => ({
      event_id: eventId,
      schedule_type_id: s.scheduleTypeId,
      template_id: s.templateId,
      scheduled_date: s.scheduledDate,
      scheduled_time: s.scheduledTime,
      target_status: s.targetStatus,
      status: s.status,
    }));

    const { error: insertError } = await supabase.from('schedules').insert(records);

    if (insertError) {
      console.error('Error creating schedules:', insertError);
      return { success: false, message: 'Failed to create schedules.' };
    }

    revalidatePath('/app');

    return {
      success: true,
      message: 'Schedules created',
      schedulesCreated: records.length,
    };
  } catch (error) {
    console.error('Unexpected error in createSchedulesFromSelection:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
