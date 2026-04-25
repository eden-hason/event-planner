'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { GiftUpsertSchema, GiftAppToDbTransformerSchema } from '../schemas/gifts';

export type UpsertGiftState = {
  success: boolean;
  message?: string | null;
};

export type DeleteGiftState = {
  success: boolean;
  message: string;
};

export async function upsertGift(
  eventId: string,
  formData: FormData,
): Promise<UpsertGiftState> {
  try {
    const raw = Object.fromEntries(formData);
    const parsedData = {
      id: raw.id as string | undefined,
      guestId: (raw.guestId as string) || null,
      guestName: raw.guestName as string,
      amount: Number(raw.amount) || 0,
      isReceived: raw.isReceived === 'true',
      notes: (raw.notes as string) || null,
    };
    if (!parsedData.id) delete (parsedData as Record<string, unknown>).id;
    if (!parsedData.guestId) parsedData.guestId = null;

    const validation = GiftUpsertSchema.safeParse(parsedData);
    if (!validation.success) {
      return { success: false, message: validation.error.issues[0]?.message };
    }

    const dbData = GiftAppToDbTransformerSchema.parse(validation.data);
    const supabase = await createClient();

    const { error } = await supabase
      .from('gifts')
      .upsert({ ...dbData, event_id: eventId }, { onConflict: 'id' });

    if (error) {
      console.error(error);
      return { success: false, message: 'Database error: Could not save gift.' };
    }

    revalidatePath(`/app/${eventId}/budget`);
    return {
      success: true,
      message: parsedData.id ? 'Gift updated.' : 'Gift added.',
    };
  } catch (error) {
    console.error('upsertGift error:', error);
    return { success: false, message: 'Failed to save gift. Please try again.' };
  }
}

export async function deleteGift(giftId: string, eventId: string): Promise<DeleteGiftState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('gifts').delete().eq('id', giftId);

    if (error) {
      console.error(error);
      return { success: false, message: 'Database error: Could not delete gift.' };
    }

    revalidatePath(`/app/${eventId}/budget`);
    return { success: true, message: 'Gift deleted.' };
  } catch (error) {
    console.error('deleteGift error:', error);
    return { success: false, message: 'Failed to delete gift. Please try again.' };
  }
}
