import type { SupabaseClient } from '@supabase/supabase-js';
import {
  gateScheduleForSend as gateSchedule,
  type ScheduleSendGate,
} from '@/features/schedules/services/schedule-send-gate';
import { sendGateRefusalLabel } from '../utils/labels';

export type { ScheduleSendGate } from '@/features/schedules/services/schedule-send-gate';

export type ScheduleSendGateResult =
  | { ok: true; gate: ScheduleSendGate }
  | { ok: false; message: string };

/**
 * The shared send gate (features/schedules), with its refusal in the Back
 * Office's Hebrew (ADR 0037).
 */
export async function gateScheduleForSend(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<ScheduleSendGateResult> {
  const gated = await gateSchedule(supabase, scheduleId);
  return gated.ok
    ? gated
    : { ok: false, message: sendGateRefusalLabel(gated.reason) };
}
