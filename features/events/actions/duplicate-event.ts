'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';

export type DuplicateEventState = {
  success: boolean;
  message: string;
  eventId?: string;
};

export async function duplicateEvent(
  eventId: string,
): Promise<DuplicateEventState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to duplicate events',
      };
    }

    const supabase = await createClient();

    // Fetch original event
    const { data: originalEvent, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !originalEvent) {
      return {
        success: false,
        message: 'Event not found.',
      };
    }

    // Insert new event (copy all fields, reset specific ones)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...eventFields } = originalEvent;

    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        ...eventFields,
        title: `Copy of ${originalEvent.title}`,
        status: 'draft',
        is_default: false,
      })
      .select('id')
      .single();

    if (insertError || !newEvent) {
      console.error('Error duplicating event:', insertError);
      return {
        success: false,
        message: 'Failed to duplicate event.',
      };
    }

    // Copy groups and build old→new ID mapping
    const { data: originalGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('event_id', eventId);

    const groupIdMap = new Map<string, string>();

    if (originalGroups && originalGroups.length > 0) {
      for (const group of originalGroups) {
        const oldGroupId = group.id;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, ...groupFields } = group;

        const { data: newGroup } = await supabase
          .from('groups')
          .insert({
            ...groupFields,
            event_id: newEvent.id,
          })
          .select('id')
          .single();

        if (newGroup) {
          groupIdMap.set(oldGroupId, newGroup.id);
        }
      }
    }

    // Copy guests with remapped group IDs and reset RSVP
    const { data: originalGuests } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId);

    if (originalGuests && originalGuests.length > 0) {
      const guestsToInsert = originalGuests.map((guest) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, ...guestFields } = guest;

        return {
          ...guestFields,
          event_id: newEvent.id,
          group_id: guest.group_id
            ? (groupIdMap.get(guest.group_id) ?? null)
            : null,
          rsvp_status: 'pending' as const,
        };
      });

      const { error: guestsError } = await supabase
        .from('guests')
        .insert(guestsToInsert);

      if (guestsError) {
        console.error('Error copying guests:', guestsError);
      }
    }

    // Copy schedules with remapped group IDs in target_filter, reset status
    const { data: originalSchedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('event_id', eventId);

    if (originalSchedules && originalSchedules.length > 0) {
      const schedulesToInsert = originalSchedules.map((schedule) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, sent_at, ...scheduleFields } =
          schedule;

        // Remap group_ids inside target_filter
        let targetFilter = schedule.target_filter as Record<
          string,
          unknown
        > | null;
        if (targetFilter?.group_ids && Array.isArray(targetFilter.group_ids)) {
          targetFilter = {
            ...targetFilter,
            group_ids: (targetFilter.group_ids as string[])
              .map((gid) => groupIdMap.get(gid))
              .filter(Boolean),
          };
        }

        return {
          ...scheduleFields,
          event_id: newEvent.id,
          target_filter: targetFilter,
          status: 'draft' as const,
          sent_at: null,
        };
      });

      const { error: schedulesError } = await supabase
        .from('schedules')
        .insert(schedulesToInsert);

      if (schedulesError) {
        console.error('Error copying schedules:', schedulesError);
      }
    }

    revalidatePath('/app');
    revalidatePath('/app/dashboard');

    return {
      success: true,
      message: 'Event duplicated successfully.',
      eventId: newEvent.id,
    };
  } catch (error) {
    console.error('Duplicate event error:', error);
    return {
      success: false,
      message: 'Failed to duplicate event. Please try again.',
    };
  }
}
