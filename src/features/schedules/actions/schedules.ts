'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { sendingConfig } from '@/lib/config/sending';
import { CustomTextSchema } from '../schemas';
import { dueTimeIssue } from '../utils/due-time-guards';

/**
 * A Schedule the organiser is not allowed to change, and why.
 *
 * 'disabled' is the whole locked timeline: the seed trigger writes it for every
 * Schedule of an Event that cannot send, and paying flips the set to null in
 * one move. So "this row is disabled" and "this Event has not paid" are the
 * same fact, and rejecting the write here is what makes the lock real rather
 * than a greyed-out input the API would happily accept anyway.
 */
function editRejection(status: string | null): string | null {
  if (status === 'sent') {
    return 'Cannot modify a schedule that has already been sent';
  }
  if (status === 'disabled') {
    return 'Sending is not enabled for this event yet';
  }
  return null;
}

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
 * Updates a schedule's Due Time.
 * RLS ensures the user can only update their own schedules.
 *
 * Refuses a Due Time after the Event (except for the Thank You) and one so far
 * in the past that the Dispatcher would expire it instead of sending it - the
 * same `dueTimeIssue` the page checks, because this action is callable without
 * the page (backlog 0014). A Due Time only a little in the past is accepted:
 * the page has already asked the organiser to confirm it sends right away.
 *
 * One column, one instant. The caller authors it as an Israel wall clock
 * through `israelWallClockToIso`; this used to take a separate naive time and
 * write both independently, which is how they came to disagree on most rows
 * (ADR 0015).
 *
 * @param scheduleId - The schedule ID to update
 * @param scheduledDate - The new Due Time as an ISO 8601 instant
 * @returns Result state with success status
 */
export async function updateScheduledDate(
  scheduleId: string,
  scheduledDate: string,
): Promise<UpdateScheduledDateState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const supabase = await createClient();

    if (!Number.isFinite(Date.parse(scheduledDate))) {
      return { success: false, message: 'That is not a valid date' };
    }

    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select('status, schedule_types (execution_kind, key), events (event_date)')
      .eq('id', scheduleId)
      .single();

    if (fetchError || !existing) {
      return { success: false, message: 'Schedule not found.' };
    }

    const rejection = editRejection(existing.status);
    if (rejection) return { success: false, message: rejection };

    // A restrictive RLS policy already blocks this, but an UPDATE that matches
    // no rows returns no error - without this the caller would be told it
    // succeeded. Rescheduling a call plan is a back-office action.
    if (!isMessageScheduleRow(existing)) {
      return {
        success: false,
        message: 'A call round can only be rescheduled from the back office.',
      };
    }

    const types = Array.isArray(existing.schedule_types)
      ? existing.schedule_types[0]
      : existing.schedule_types;
    const event = Array.isArray(existing.events) ? existing.events[0] : existing.events;
    const config = sendingConfig();
    const issue = dueTimeIssue({
      eventDate: event?.event_date ?? null,
      scheduleTypeKey: types?.key ?? '',
      scheduledDate,
      now: new Date(),
      rules: {
        sendWindow: config.sendWindow,
        maxLatenessHours: config.scheduleMaxLatenessHours,
      },
    });
    if (issue === 'afterEvent') {
      return { success: false, message: 'Pick a date on or before the event day' };
    }
    if (issue === 'expires') {
      return {
        success: false,
        message: 'That time is too far in the past to send - pick a later time',
      };
    }

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

export type UpdateCustomTextState = {
  success: boolean;
  message?: string | null;
};

/**
 * Updates the organiser-authored note (schedules.custom_text) for a schedule.
 * A blank value is stored as null so "no note" reads the same way whether the
 * organiser never typed one or cleared it - the resolver only checks for a
 * non-empty trimmed value.
 * RLS ensures the user can only update their own schedules.
 */
export async function updateCustomText(
  scheduleId: string,
  customText: string,
): Promise<UpdateCustomTextState> {
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
      return { success: false, message: 'Schedule not found' };
    }

    if (existing.status === 'cancelled') {
      return { success: false, message: 'This schedule is turned off' };
    }

    const rejection = editRejection(existing.status);
    if (rejection) return { success: false, message: rejection };

    if (!isMessageScheduleRow(existing)) {
      return {
        success: false,
        message: 'A call round has no message content to note',
      };
    }

    // The note is appended to an already long WhatsApp body, and the textarea
    // caps it - but a cap only the UI enforces is not one.
    const parsed = CustomTextSchema.safeParse(customText);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const trimmed = parsed.data.trim();
    const { error } = await supabase
      .from('schedules')
      .update({ custom_text: trimmed === '' ? null : trimmed })
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating custom text:', error);
      return { success: false, message: 'Failed to update note' };
    }

    revalidatePath('/app');

    return { success: true, message: 'Note updated' };
  } catch (error) {
    console.error('Error in updateCustomText:', error);
    return { success: false, message: 'An unexpected error occurred' };
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

    const rejection = editRejection(existing.status);
    if (rejection) return { success: false, message: rejection };

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
