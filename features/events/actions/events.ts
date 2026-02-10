'use server';

import { getCurrentUser } from '@/features/auth/queries';
import {
  EventDetailsUpdateSchema,
  UpdateEventDetailsState,
  EventCreateSchema,
  CreateEventState,
  Invitations,
  InvitationsDb,
} from '../schemas';
import { eventDetailsUpdateToDb } from '../utils/event.transform';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { deleteInvitationImage } from '@/lib/storage.server';
import { createDefaultSchedules } from '@/features/schedules/actions/schedules';

export type DeleteEventState = {
  success: boolean;
  message: string;
};

export type SetDefaultEventState = {
  success: boolean;
  message: string;
};

/**
 * Creates a new event and its default schedules.
 *
 * @param formData - Form data containing title, eventDate, and eventType
 * @returns Result state with success status and new event ID
 */
export async function createEvent(formData: FormData): Promise<CreateEventState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to create events',
      };
    }

    const rawData = Object.fromEntries(formData);
    const validationResult = EventCreateSchema.safeParse(rawData);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const { title, eventDate, eventType } = validationResult.data;
    const supabase = await createClient();

    // Insert the new event
    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        user_id: currentUser.id,
        title,
        event_date: eventDate,
        event_type: eventType,
        status: 'draft',
        is_default: true,
      })
      .select('id')
      .single();

    if (error || !newEvent) {
      console.error('Error creating event:', error);
      return {
        success: false,
        message: 'Failed to create event',
      };
    }

    // Unset is_default on other events for this user
    await supabase
      .from('events')
      .update({ is_default: false })
      .eq('user_id', currentUser.id)
      .neq('id', newEvent.id);

    // Create default schedules for the event
    const schedulesResult = await createDefaultSchedules(
      newEvent.id,
      eventDate,
      eventType,
    );

    if (!schedulesResult.success) {
      console.warn('Failed to create default schedules:', schedulesResult.message);
      // Don't fail the event creation if schedules fail
    }

    revalidatePath('/app');
    revalidatePath('/app/dashboard');

    return {
      success: true,
      message: 'Event created successfully',
      eventId: newEvent.id,
    };
  } catch (error) {
    console.error('Create event error:', error);
    return {
      success: false,
      message: 'Failed to create event. Please try again.',
    };
  }
}

// Helper function to process invitations
// Images are now uploaded directly from the client to Supabase Storage,
// so this function only handles URL passthrough and removal logic
function processInvitations(invitations: Invitations): Invitations {
  const result: Invitations = {};

  if (invitations.frontImageUrl !== undefined) {
    if (invitations.frontImageUrl === '') {
      // Empty string means the image was removed
      result.frontImageUrl = undefined;
    } else {
      // URL is already uploaded from client, pass through
      result.frontImageUrl = invitations.frontImageUrl;
    }
  }

  if (invitations.backImageUrl !== undefined) {
    if (invitations.backImageUrl === '') {
      // Empty string means the image was removed
      result.backImageUrl = undefined;
    } else {
      // URL is already uploaded from client, pass through
      result.backImageUrl = invitations.backImageUrl;
    }
  }

  return result;
}

export async function updateEventDetails(
  formData: FormData,
): Promise<UpdateEventDetailsState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to update events',
      };
    }

    const rawData = Object.fromEntries(formData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: Record<string, any> = { ...rawData };

    // Parse JSON fields (hostDetails, eventSettings)
    if (parsedData.hostDetails && typeof parsedData.hostDetails === 'string') {
      try {
        parsedData.hostDetails = JSON.parse(parsedData.hostDetails);
      } catch {
        parsedData.hostDetails = undefined;
      }
    }

    if (
      parsedData.eventSettings &&
      typeof parsedData.eventSettings === 'string'
    ) {
      try {
        parsedData.eventSettings = JSON.parse(parsedData.eventSettings);
      } catch {
        parsedData.eventSettings = undefined;
      }
    }

    if (parsedData.location && typeof parsedData.location === 'string') {
      try {
        parsedData.location = JSON.parse(parsedData.location);
      } catch {
        parsedData.location = undefined;
      }
    }

    if (parsedData.invitations && typeof parsedData.invitations === 'string') {
      try {
        parsedData.invitations = JSON.parse(parsedData.invitations);
      } catch {
        parsedData.invitations = undefined;
      }
    }

    if (
      parsedData.guestExperience &&
      typeof parsedData.guestExperience === 'string'
    ) {
      try {
        parsedData.guestExperience = JSON.parse(parsedData.guestExperience);
      } catch {
        parsedData.guestExperience = undefined;
      }
    }

    const validationResult = EventDetailsUpdateSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const supabase = await createClient();

    // Fetch existing event data (including invitation URLs for cleanup)
    // RLS handles ownership verification
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('invitations')
      .eq('id', validatedData.id)
      .single();

    if (fetchError || !event) {
      return {
        success: false,
        message: 'Event not found.',
      };
    }

    // Store old URLs for potential cleanup after successful update
    const existingInvitations = event.invitations as InvitationsDb | null;
    const oldFrontImageUrl = existingInvitations?.front_image_url ?? null;
    const oldBackImageUrl = existingInvitations?.back_image_url ?? null;

    // Process invitations - images are already uploaded from client
    const dataToTransform = { ...validatedData };
    if (validatedData.invitations) {
      const processedInvitations = processInvitations(
        validatedData.invitations,
      );
      dataToTransform.invitations = processedInvitations;
    }

    const dbData = eventDetailsUpdateToDb(dataToTransform);

    const { error } = await supabase
      .from('events')
      .update(dbData)
      .eq('id', validatedData.id);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not update event.',
      };
    }

    // Clean up removed images from storage after successful database update
    const imagesToDelete: string[] = [];

    // Check if front image was removed (old URL exists, new value is being cleared)
    if (oldFrontImageUrl && validatedData.invitations?.frontImageUrl === '') {
      imagesToDelete.push(oldFrontImageUrl);
    }

    // Check if back image was removed (old URL exists, new value is being cleared)
    if (oldBackImageUrl && validatedData.invitations?.backImageUrl === '') {
      imagesToDelete.push(oldBackImageUrl);
    }

    // Delete removed images in parallel
    if (imagesToDelete.length > 0) {
      await Promise.all(
        imagesToDelete.map((url) =>
          deleteInvitationImage(url).catch((err) =>
            console.error('Failed to delete image from storage:', url, err),
          ),
        ),
      );
    }

    revalidatePath('/app');
    revalidatePath(`/app/${validatedData.id}`);
    return {
      success: true,
      message: 'Event updated successfully.',
    };
  } catch (error) {
    console.error('Update event details error:', error);
    return {
      success: false,
      message: 'Failed to update event. Please try again.',
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

    // First, unset all other default events for this user (RLS filters to current user)
    await supabase
      .from('events')
      .update({ is_default: false })
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
