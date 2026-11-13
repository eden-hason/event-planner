'use server';

import { revalidatePath } from 'next/cache';

import { sendingConfig } from '@/lib/config/sending';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { embeddedOne, pageAll } from '@/lib/supabase/row-cap';
import { createClient } from '@/lib/supabase/server';

import type { MessagePlanSaveInput } from '../schemas/message-plan';
import { MAPPED_EVENT_COLUMNS, mapEventRow } from '../services/map-event-row';
import { loadTableNumbers } from '../services/table-numbers';
import { dueTimeIssue } from '../utils/due-time-guards';
import {
  checkMessagePlanSave,
  savesPersonalText,
  type MessagePlanSaveError,
} from '../utils/message-plan-save';
import { isScheduleEditable } from '../utils/schedule-editable';

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

    const type = embeddedOne(existing.schedule_types);
    const rawEvent = embeddedOne<Record<string, unknown>>(
      existing.events as unknown as Record<string, unknown> | null,
    );
    if (!type || !rawEvent) {
      return { success: false, code: 'not_found', message: 'Schedule not found' };
    }

    if (
      !isScheduleEditable({ status: existing.status, dispatchedAt: existing.dispatched_at }) ||
      type.execution_kind !== 'message'
    ) {
      return { success: false, code: 'not_editable', message: 'This message can no longer be changed' };
    }

    const event = mapEventRow(rawEvent);
    if (event.messagePlan !== 'current') {
      return { success: false, code: 'not_current_plan', message: 'This event is on the Classic Message Plan' };
    }

    const stored = {
      wording: (existing.wording as 'kululu' | 'personal' | null) ?? null,
      personalText: existing.personal_text ?? null,
    };

    // The Guests are read only when a Personal Message is to be counted.
    let guests: { name: string; table: { tableNumber: number; label: string | null } | null }[] = [];
    if (savesPersonalText(input, stored)) {
      const eventId = event.id;
      const [guestRows, tables] = await Promise.all([
        pageAll<{ name: string | null; table_id: string | null }>((from, to) =>
          supabase
            .from('guests')
            .select('name, table_id')
            .eq('event_id', eventId)
            .order('id')
            .range(from, to),
        ),
        loadTableNumbers(supabase, eventId),
      ]);
      guests = guestRows.map((guest) => ({
        name: guest.name ?? '',
        table: guest.table_id ? (tables.get(guest.table_id) ?? null) : null,
      }));
    }

    const checked = checkMessagePlanSave({
      scheduleTypeKey: type.key,
      input,
      stored,
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
