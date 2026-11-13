'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { MessagePlan } from '@/features/schedules/utils/message-plan-kind';
import { parseNewEventMessagePlan } from '../utils/message-plan';

export type MessagePlanSetting = {
  /** The plan every Event created from now on starts on. */
  newEventMessagePlan: MessagePlan;
  updatedAt: string | null;
};

/**
 * The "new Events start on" setting (ADR 0053). `app_settings` is service role
 * only, so only the Back Office reads it.
 */
export async function getMessagePlanSetting(): Promise<MessagePlanSetting> {
  await assertAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('new_event_message_plan, updated_at')
    .eq('id', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    newEventMessagePlan: parseNewEventMessagePlan(data?.new_event_message_plan),
    updatedAt: data?.updated_at ?? null,
  };
}
