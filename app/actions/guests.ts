'use server';

import { getCurrentUser } from '@/lib/auth';
import { GuestUpsertSchema } from '@/lib/schemas/guest.schema';
import { guestUpsertToDb } from '@/lib/utils/guest.transform';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { UpsertGuestState } from '@/lib/schemas/guest.schema';

export async function upsertGuest(
  eventId: string,
  formData: FormData,
): Promise<UpsertGuestState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to upsert guests',
      };
    }

    const rawData = Object.fromEntries(formData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: Record<string, any> = { ...rawData };
    if (parsedData.amount && typeof parsedData.amount === 'string') {
      parsedData.amount = Number(parsedData.amount);
    }

    const validationResult = GuestUpsertSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const dbData = guestUpsertToDb(validatedData);
    const supabase = await createClient();

    const { error } = await supabase.from('guests').upsert(
      {
        ...dbData,
        event_id: eventId,
      },
      {
        onConflict: 'id',
      },
    );

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not upsert guest.',
      };
    }

    revalidatePath('/guests');
    return {
      success: true,
      message: validatedData.id
        ? 'Guest updated successfully.'
        : 'Guest created successfully.',
    };
  } catch (error) {
    console.error('Upsert guest error:', error);
    return {
      success: false,
      message: 'Failed to upsert guest. Please try again.',
    };
  }
}

export type DeleteGuestState = {
  success: boolean;
  message: string;
};

export async function deleteGuest(
  guestId: string,
): Promise<DeleteGuestState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to delete guests',
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from('guests').delete().eq('id', guestId);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not delete guest.',
      };
    }

    revalidatePath('/guests');
    return {
      success: true,
      message: 'Guest deleted successfully.',
    };
  } catch (error) {
    console.error('Delete guest error:', error);
    return {
      success: false,
      message: 'Failed to delete guest. Please try again.',
    };
  }
}
