import { createClient } from '@/utils/supabase/server';
import { DbToAppTransformerSchema, GuestApp } from '@/features/guests/schemas';

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
