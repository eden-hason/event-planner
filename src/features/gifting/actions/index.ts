'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/queries';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { GiftingSettingsUpdateSchema } from '../schemas';

export type GiftingActionState = {
  success: boolean;
  message?: string | null;
};

/**
 * Save the PayBox and/or Bit connection for an event. Only the provider blocks
 * present in `formData` are written; the rest of `event_settings` (including
 * the other provider) is read back and preserved, so the two cards can save
 * independently without clobbering each other.
 *
 * RLS on `events` enforces that the caller owns / collaborates on the row - no
 * manual ownership check here (see CLAUDE.md).
 */
export async function updateGiftingSettings(
  formData: FormData,
): Promise<GiftingActionState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in' };
    }

    const raw = Object.fromEntries(formData);
    const parsed = {
      eventId: raw.eventId,
      payboxConfig:
        typeof raw.payboxConfig === 'string'
          ? safeJson(raw.payboxConfig)
          : undefined,
      bitConfig:
        typeof raw.bitConfig === 'string' ? safeJson(raw.bitConfig) : undefined,
    };

    const validation = GiftingSettingsUpdateSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message ?? 'Invalid data',
      };
    }
    const { eventId, payboxConfig, bitConfig } = validation.data;

    const supabase = await createClient();

    const { data: row, error: fetchError } = await supabase
      .from('events')
      .select('event_settings')
      .eq('id', eventId)
      .single();

    if (fetchError || !row) {
      return { success: false, message: 'Event not found' };
    }

    const current =
      (row.event_settings as Record<string, unknown> | null) ?? {};
    const next: Record<string, unknown> = { ...current };

    if (payboxConfig) {
      next.paybox_config = {
        enabled: payboxConfig.enabled,
        link: payboxConfig.link,
      };
    }
    if (bitConfig) {
      next.bit_config = {
        enabled: bitConfig.enabled,
        link: bitConfig.link,
      };
    }

    const { error } = await supabase
      .from('events')
      .update({ event_settings: next })
      .eq('id', eventId);

    if (error) {
      console.error('updateGiftingSettings:', error);
      return { success: false, message: 'Could not save. Please try again' };
    }

    revalidatePath('/app');
    revalidatePath(`/app/${eventId}/gifting`);
    return { success: true };
  } catch (error) {
    console.error('updateGiftingSettings error:', error);
    return { success: false, message: 'Something went wrong' };
  }
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
