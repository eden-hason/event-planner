'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { isMessagePlan, type MessagePlan } from '@/features/schedules/utils/message-plan-kind';
import {
  MOVE_FAILED,
  movedMessage,
  moveBlockLabel,
  NEW_EVENT_PLAN_COPY,
  parseMoveRefusal,
  SETTING_SAVE_FAILED,
} from '../utils/message-plan';
import type { EventControlResult } from './event-controls';

/**
 * Moves one Event from the Classic Message Plan to the current one (ADR 0053),
 * through `admin_move_event_to_message_plan`: one way, only while nothing has
 * been sent, every unsent message Schedule deleted and the plan seeded afresh.
 * Call Schedules and Call Rounds stay. The function is the authority; its
 * refusal codes come back in DETAIL and are worded here.
 */
export async function moveEventToMessagePlanAdmin(eventId: string): Promise<EventControlResult> {
  await assertAdmin();
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('admin_move_event_to_message_plan', {
      p_event_id: eventId,
    });
    if (error) {
      const refusal = parseMoveRefusal(error);
      if (refusal) return { success: false, message: moveBlockLabel(refusal) };
      console.error('moveEventToMessagePlanAdmin failed:', error);
      return { success: false, message: MOVE_FAILED };
    }

    revalidateOutreach(eventId);
    return { success: true, message: movedMessage(typeof data === 'number' ? data : 0) };
  } catch (error) {
    console.error('moveEventToMessagePlanAdmin failed:', error);
    return { success: false, message: MOVE_FAILED };
  }
}

/**
 * Sets the Message Plan every Event created from now on starts on
 * (`app_settings.new_event_message_plan`). Events that already exist keep
 * theirs; only a move changes an Event's plan.
 */
export async function setNewEventMessagePlanAdmin(plan: MessagePlan): Promise<EventControlResult> {
  await assertAdmin();
  if (!isMessagePlan(plan)) {
    return { success: false, message: 'תוכנית לא מוכרת' };
  }
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('app_settings')
      .update({ new_event_message_plan: plan })
      .eq('id', true)
      .select('id');
    if (error) {
      console.error('setNewEventMessagePlanAdmin failed:', error);
      return { success: false, message: SETTING_SAVE_FAILED };
    }
    if (!data?.length) {
      console.error('setNewEventMessagePlanAdmin: the app_settings row is missing');
      return { success: false, message: 'שורת ההגדרות חסרה במסד הנתונים' };
    }

    revalidatePath('/admin/configuration');
    return { success: true, message: NEW_EVENT_PLAN_COPY[plan].saved };
  } catch (error) {
    console.error('setNewEventMessagePlanAdmin failed:', error);
    return { success: false, message: SETTING_SAVE_FAILED };
  }
}
