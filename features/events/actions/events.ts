'use server';

import { getCurrentUser } from '@/lib/auth';
import { EventUpsertSchema, UpsertEventState } from '../schemas';
import { eventUpsertToDb } from '../utils/event.transform';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export type DeleteEventState = {
  success: boolean;
  message: string;
};

export type SetDefaultEventState = {
  success: boolean;
  message: string;
};

export async function upsertEvent(
  formData: FormData,
): Promise<UpsertEventState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to create or update events',
      };
    }

    const rawData = Object.fromEntries(formData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: Record<string, any> = { ...rawData };

    // Convert numeric fields
    if (parsedData.maxGuests && typeof parsedData.maxGuests === 'string') {
      parsedData.maxGuests = Number(parsedData.maxGuests);
    }
    if (parsedData.budget && typeof parsedData.budget === 'string') {
      parsedData.budget = Number(parsedData.budget);
    }

    // Convert boolean fields
    if (parsedData.isDefault !== undefined) {
      parsedData.isDefault =
        parsedData.isDefault === 'true' || parsedData.isDåefault === true;
    }

    // Parse fileMetadata if it's a string
    if (
      parsedData.fileMetadata &&
      typeof parsedData.fileMetadata === 'string'
    ) {
      try {
        parsedData.fileMetadata = JSON.parse(parsedData.fileMetadata);
      } catch {
        // If parsing fails, keep as is or set to undefined
        parsedData.fileMetadata = undefined;
      }
    }

    const validationResult = EventUpsertSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const dbData = eventUpsertToDb(validatedData);
    const supabase = await createClient();

    // Always include user_id for new events
    const eventData = {
      ...dbData,
      user_id: currentUser.id,
    };

    const { error } = await supabase.from('events').upsert(eventData, {
      onConflict: 'id',
    });

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not create or update event.',
      };
    }

    revalidatePath('/app/dashboard');
    revalidatePath('/events');
    return {
      success: true,
      message: validatedData.id
        ? 'Event updated successfully.'
        : 'Event created successfully.',
    };
  } catch (error) {
    console.error('Upsert event error:', error);
    return {
      success: false,
      message: 'Failed to create or update event. Please try again.',
    };
  }
}

export async function deleteEvent(eventId: string): Promise<DeleteEventState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to delete events',
      };
    }

    const supabase = await createClient();

    // Verify the event belongs to the current user
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      return {
        success: false,
        message: 'Event not found.',
      };
    }

    if (event.user_id !== currentUser.id) {
      return {
        success: false,
        message: 'You do not have permission to delete this event.',
      };
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not delete event.',
      };
    }

    revalidatePath('/app/dashboard');
    revalidatePath('/events');
    return {
      success: true,
      message: 'Event deleted successfully.',
    };
  } catch (error) {
    console.error('Delete event error:', error);
    return {
      success: false,
      message: 'Failed to delete event. Please try again.',
    };
  }
}

export async function setDefaultEvent(
  eventId: string,
): Promise<SetDefaultEventState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to set default event',
      };
    }

    const supabase = await createClient();

    // Verify the event belongs to the current user
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      return {
        success: false,
        message: 'Event not found.',
      };
    }

    if (event.user_id !== currentUser.id) {
      return {
        success: false,
        message: 'You do not have permission to modify this event.',
      };
    }

    // First, unset all other default events for this user
    await supabase
      .from('events')
      .update({ is_default: false })
      .eq('user_id', currentUser.id)
      .neq('id', eventId);

    // Then set this event as default
    const { error } = await supabase
      .from('events')
      .update({ is_default: true })
      .eq('id', eventId);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not set default event.',
      };
    }

    revalidatePath('/app/dashboard');
    revalidatePath('/events');
    return {
      success: true,
      message: 'Default event set successfully.',
    };
  } catch (error) {
    console.error('Set default event error:', error);
    return {
      success: false,
      message: 'Failed to set default event. Please try again.',
    };
  }
}
