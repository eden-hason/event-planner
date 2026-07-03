'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function upsertGift(
  eventId: string,
  data: {
    giftId: string | null;
    guestId: string | null;
    guestName: string;
    amount: number | null;
    paymentMethod: string | null;
    notes: string | null;
  },
): Promise<{ success: boolean; giftId: string | null; message?: string }> {
  try {
    const supabase = await createClient();
    const row = {
      event_id: eventId,
      guest_id: data.guestId,
      guest_name: data.guestName,
      amount: data.amount,
      payment_method: data.paymentMethod,
      notes: data.notes,
    };

    let result: { id: string } | null = null;
    let error;

    if (data.giftId) {
      ({ data: result, error } = await supabase
        .from('gifts')
        .update(row)
        .eq('id', data.giftId)
        .select('id')
        .single());
    } else if (data.guestId) {
      ({ data: result, error } = await supabase
        .from('gifts')
        .upsert(row, { onConflict: 'event_id,guest_id' })
        .select('id')
        .single());
    } else {
      ({ data: result, error } = await supabase
        .from('gifts')
        .insert(row)
        .select('id')
        .single());
    }

    if (error) {
      console.error('upsertGift error:', error);
      return { success: false, giftId: null, message: 'Failed to save gift.' };
    }

    revalidatePath(`/app/${eventId}/budget`);
    return { success: true, giftId: result?.id ?? null };
  } catch (error) {
    console.error('upsertGift error:', error);
    return { success: false, giftId: null, message: 'Failed to save gift.' };
  }
}

export async function deleteGift(
  eventId: string,
  giftId: string,
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('gifts').delete().eq('id', giftId);
    if (error) {
      console.error('deleteGift error:', error);
      return { success: false };
    }
    revalidatePath(`/app/${eventId}/budget`);
    return { success: true };
  } catch (error) {
    console.error('deleteGift error:', error);
    return { success: false };
  }
}
