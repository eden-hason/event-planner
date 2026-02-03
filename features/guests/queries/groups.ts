import { createClient } from '@/lib/supabase/server';
import {
  GroupDbToAppTransformerSchema,
  GroupApp,
  GroupWithGuestsApp,
  DbToAppTransformerSchema,
} from '@/features/guests/schemas';

export const getEventGroups = async (eventId: string): Promise<GroupApp[]> => {
  try {
    const supabase = await createClient();
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching groups for event:', error);
      return [];
    }

    if (!groups || groups.length === 0) {
      return [];
    }

    // Transform each group from DB model to app model using Zod transformer
    const transformedGroups: GroupApp[] = [];
    for (const group of groups) {
      try {
        const transformedGroup = GroupDbToAppTransformerSchema.parse(group);
        transformedGroups.push(transformedGroup);
      } catch (err) {
        console.error(
          'Failed to parse group data with Zod transformer:',
          err,
          group,
        );
      }
    }

    return transformedGroups;
  } catch (error) {
    console.error('Error fetching groups for event:', error);
    return [];
  }
};

/**
 * Fetches all groups for an event with their associated guests.
 * Uses the group_id FK on the guests table to resolve the relationship.
 */
export const getEventGroupsWithGuests = async (
  eventId: string,
): Promise<GroupWithGuestsApp[]> => {
  try {
    const supabase = await createClient();

    // Fetch groups with their guests using Supabase's relation syntax
    // This assumes you have set up the foreign key relationship in Supabase
    const { data: groups, error } = await supabase
      .from('groups')
      .select(
        `
        *,
        guests (*)
      `,
      )
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching groups with guests:', error);
      return [];
    }

    if (!groups || groups.length === 0) {
      return [];
    }

    // Transform each group and its guests
    const transformedGroups: GroupWithGuestsApp[] = [];
    for (const group of groups) {
      try {
        const baseGroup = GroupDbToAppTransformerSchema.parse(group);

        // Transform the nested guests array
        const guests = (group.guests || [])
          .map((guest: unknown) => {
            try {
              return DbToAppTransformerSchema.parse(guest);
            } catch {
              console.error('Failed to parse guest in group:', guest);
              return null;
            }
          })
          .filter(Boolean);

        transformedGroups.push({
          ...baseGroup,
          guests,
          guestCount: guests.length,
        });
      } catch (err) {
        console.error('Failed to parse group with guests:', err, group);
      }
    }

    return transformedGroups;
  } catch (error) {
    console.error('Error fetching groups with guests:', error);
    return [];
  }
};
