'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { SetBonusOverrideSchema } from '../schemas';
import type { BillingActionResult } from '../types';

/**
 * Sets an Event's Bonus Records by hand, or (with null) hands them back to the automatic
 * rule. The override stays through later top-ups until an Operator resets it (ADR 0027).
 */
export async function setBonusOverride(input: unknown): Promise<BillingActionResult> {
  await assertAdmin();

  const parsed = SetBonusOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { eventId, bonus } = parsed.data;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('events')
    .update({ bonus_records_override: bonus })
    .eq('id', eventId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('setBonusOverride failed:', error);
    return { success: false, message: 'Could not update the bonus' };
  }
  if (!data) return { success: false, message: 'That event no longer exists' };

  revalidateOutreach(eventId);
  return {
    success: true,
    message: bonus === null ? 'Bonus reset to automatic' : 'Bonus updated',
  };
}
