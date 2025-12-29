import { createClient } from '@/utils/supabase/server';
import {
  DbToAppTransformerSchema,
  GuestApp,
  GuestWithGroupApp,
  GroupInfoSchema,
} from '@/features/guests/schemas';

export const getEventGuests = async (eventId: string): Promise<GuestApp[]> => {
  try {
    const supabase = await createClient();
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId);
    if (error) {
      console.error('Error fetching guests for event:', error);
      return [];
    }

    if (!guests || guests.length === 0) {
      return [];
    }

    // Transform each guest from DB model to app model using Zod transformer
    const transformedGuests: GuestApp[] = [];
    for (const guest of guests) {
      try {
        const transformedGuest = DbToAppTransformerSchema.parse(guest);
        transformedGuests.push(transformedGuest);
      } catch (err) {
        console.error(
          'Failed to parse guest data with Zod transformer:',
          err,
          guest,
        );
      }
    }

    return transformedGuests;
  } catch (error) {
    console.error('Error fetching guests for event:', error);
    return [];
  }
};

/**
 * Fetches all guests for an event with their associated group info.
 * Uses the group_id FK to resolve the group relationship via Supabase join.
 */
export const getEventGuestsWithGroups = async (
  eventId: string,
): Promise<GuestWithGroupApp[]> => {
  try {
    const supabase = await createClient();

    // Fetch guests with their group using Supabase's relation syntax
    const { data: guests, error } = await supabase
      .from('guests')
      .select(
        `
        *,
        groups (
          id,
          name,
          icon,
          side
        )
      `,
      )
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching guests with groups:', error);
      return [];
    }

    if (!guests || guests.length === 0) {
      return [];
    }

    // Transform each guest and its group
    const transformedGuests: GuestWithGroupApp[] = [];
    for (const guest of guests) {
      try {
        const baseGuest = DbToAppTransformerSchema.parse(guest);

        // Transform the nested group object
        let group = null;
        if (guest.groups) {
          try {
            group = GroupInfoSchema.parse(guest.groups);
          } catch {
            console.error(
              'Failed to parse group info for guest:',
              guest.groups,
            );
          }
        }

        transformedGuests.push({
          ...baseGuest,
          group,
        });
      } catch (err) {
        console.error('Failed to parse guest with group:', err, guest);
      }
    }

    return transformedGuests;
  } catch (error) {
    console.error('Error fetching guests with groups:', error);
    return [];
  }
};
