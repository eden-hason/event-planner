'use server';

import { revalidatePath } from 'next/cache';

import { sendingConfig } from '@/lib/config/sending';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { MAPPED_EVENT_COLUMNS, mapEventRow } from '../services/map-event-row';
import { dueTimeIssue } from '../utils/due-time-guards';
import {
  checkMessagePlanSave,
  type MessagePlanSaveError,
  type MessagePlanSaveInput,
} from '../utils/message-plan-save';

export type UpdateMessagePlanScheduleState = {
  success: boolean;
  message?: string | null;
  /**
   * Why it was refused, for the page to say in the Owner's language. The
   * page checks the same rules before it saves, so this is a backstop.
   */
  code?:
    | MessagePlanSaveError['code']
    | 'not_found'
    | 'not_editable'
    | 'not_current_plan'
    | 'due_time'
    | 'failed';
};

/** A to-one embed, which the generated types also allow as an array. */
function one<T>(value: unknown): T | null {
  return ((Array.isArray(value) ? value[0] : value) as T | undefined) ?? null;
}

/**
 * Saves an open Schedule on the current Message Plan (ADR 0053, 0054): its
 * message choice, the Owner's Personal Message, the Asks' attachment, the
 * gift switch and the Due Time, in one write. Only the fields the Owner
 * changed are sent.
 *
 * Checked with the shared message-plan code the editor and the send use
 * (`checkMessagePlanSave`), and the Due Time with `dueTimeIssue`, the same as
 * `updateScheduledDate`. A sent, claimed, switched-off or locked Schedule is
 * refused. RLS keeps the Owner to their own Schedules.
 */
export async function updateMessagePlanSchedule(
  scheduleId: string,
  input: MessagePlanSaveInput,
): Promise<UpdateMessagePlanScheduleState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select(
        `status, dispatched_at, wording, personal_text, schedule_types (key, execution_kind), events (${MAPPED_EVENT_COLUMNS})`,
      )
      .eq('id', scheduleId)
      .single();
    if (fetchError || !existing) {
      return { success: false, code: 'not_found', message: 'Schedule not found' };
    }

    const type = one<{ key: string; execution_kind: string }>(existing.schedule_types);
    const rawEvent = one<Record<string, unknown>>(existing.events);
    if (!type || !rawEvent) {
      return { success: false, code: 'not_found', message: 'Schedule not found' };
    }

    // A claimed Schedule is as good as sent: its messages are already queued.
    if (
      existing.dispatched_at ||
      existing.status === 'sent' ||
      existing.status === 'disabled' ||
      existing.status === 'cancelled' ||
      existing.status === 'expired' ||
      type.execution_kind !== 'message'
    ) {
      return { success: false, code: 'not_editable', message: 'This message can no longer be changed' };
    }

    const event = mapEventRow(rawEvent);
    if (event.messagePlan !== 'current') {
      return { success: false, code: 'not_current_plan', message: 'This event is on the Classic Message Plan' };
    }

    // The guests are read only when there is a Personal Message to count.
    let guests: { name: string; table: { tableNumber: number; label: string | null } | null }[] = [];
    if (input.wording !== undefined || input.personalText !== undefined) {
      const [guestRows, tableRows] = await Promise.all([
        supabase.from('guests').select('name, table_id').eq('event_id', event.id),
        supabase.from('tables').select('id, table_number, label').eq('event_id', event.id),
      ]);
      if (guestRows.error || tableRows.error) {
        console.error('Error reading guests for the Personal Message:', guestRows.error ?? tableRows.error);
        return { success: false, code: 'failed', message: 'Failed to save the message' };
      }
      const tables = new Map(
        (tableRows.data ?? []).map((row) => [
          row.id,
          { tableNumber: row.table_number, label: row.label },
        ]),
      );
      guests = (guestRows.data ?? []).map((guest) => ({
        name: guest.name ?? '',
        table: guest.table_id ? (tables.get(guest.table_id) ?? null) : null,
      }));
    }

    const checked = checkMessagePlanSave({
      scheduleTypeKey: type.key,
      input,
      stored: {
        wording: (existing.wording as 'kululu' | 'personal' | null) ?? null,
        personalText: existing.personal_text ?? null,
      },
      event,
      guests,
    });
    if (!checked.ok) {
      return { success: false, code: checked.error.code, message: 'This message cannot be saved' };
    }

    const update: Record<string, unknown> = { ...checked.update };
    if (input.scheduledDate !== undefined) {
      if (!Number.isFinite(Date.parse(input.scheduledDate))) {
        return { success: false, code: 'due_time', message: 'That is not a valid date' };
      }
      const config = sendingConfig();
      const issue = dueTimeIssue({
        eventDate: event.eventDate,
        scheduleTypeKey: type.key,
        scheduledDate: input.scheduledDate,
        messagePlan: 'current',
        now: new Date(),
        rules: {
          sendWindow: config.sendWindow,
          maxLatenessHours: config.scheduleMaxLatenessHours,
        },
      });
      if (issue) {
        return { success: false, code: 'due_time', message: `The Due Time cannot be saved: ${issue}` };
      }
      update.scheduled_date = input.scheduledDate;
    }

    if (Object.keys(update).length === 0) return { success: true };

    const { error } = await supabase.from('schedules').update(update).eq('id', scheduleId);
    if (error) {
      console.error('Error updating a Message Plan schedule:', error);
      return { success: false, code: 'failed', message: 'Failed to save the message' };
    }

    revalidatePath('/app');
    return { success: true };
  } catch (error) {
    console.error('Error in updateMessagePlanSchedule:', error);
    return { success: false, code: 'failed', message: 'An unexpected error occurred' };
  }
}
