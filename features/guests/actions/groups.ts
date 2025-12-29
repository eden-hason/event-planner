'use server';

import { getCurrentUser } from '@/lib/auth';
import {
  GroupUpsertSchema,
  GroupAppToDbTransformerSchema,
} from '@/features/guests/schemas';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

export type UpsertGroupState = {
  success: boolean;
  errors?: z.ZodError<z.input<typeof GroupUpsertSchema>>;
  message?: string | null;
};

export type DeleteGroupState = {
  success: boolean;
  message: string;
};

export async function upsertGroup(
  eventId: string,
  formData: FormData,
): Promise<UpsertGroupState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to upsert groups',
      };
    }

    const rawData = Object.fromEntries(formData);

    const validationResult = GroupUpsertSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const dbData = GroupAppToDbTransformerSchema.parse(validatedData);
    const supabase = await createClient();

    const { error } = await supabase.from('groups').upsert(
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
        message: 'Database error: Could not upsert group.',
      };
    }

    revalidatePath(`/app/${eventId}/guests`);
    return {
      success: true,
      message: validatedData.id
        ? 'Group updated successfully.'
        : 'Group created successfully.',
    };
  } catch (error) {
    console.error('Upsert group error:', error);
    return {
      success: false,
      message: 'Failed to upsert group. Please try again.',
    };
  }
}

export async function deleteGroup(
  eventId: string,
  groupId: string,
): Promise<DeleteGroupState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to delete groups',
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from('groups').delete().eq('id', groupId);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not delete group.',
      };
    }

    revalidatePath(`/app/${eventId}/guests`);
    return {
      success: true,
      message: 'Group deleted successfully.',
    };
  } catch (error) {
    console.error('Delete group error:', error);
    return {
      success: false,
      message: 'Failed to delete group. Please try again.',
    };
  }
}
