import { createClient } from '@/utils/supabase/server';
import { DbToAppTransformerSchema, GuestApp } from './schemas/guest.schema';
import { ScheduleApp } from './schemas/schedule.schemas';

// Check if user has completed initial setup
export const getInitialSetupStatus = async (): Promise<boolean> => {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('initial_setup_complete')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching setup status:', error);
      return false;
    }

    return profile?.initial_setup_complete ?? false;
  } catch (error) {
    console.error('Error checking initial setup status:', error);
    return false;
  }
};

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string; // ISO string when returned from DAL
  event_type?: string;
  location?: string;
  maxGuests?: number;
  createdAt?: string; // ISO string when returned from DAL
  updatedAt?: string; // ISO string when returned from DAL
}

// Guest operations - Read only
export const getGuests = async (
  userId: string,
  eventId: string,
): Promise<GuestApp[]> => {
  try {
    // TODO: Implement Supabase query
    return [];
  } catch (error) {
    console.error('Error fetching guests:', error);
    throw new Error('Failed to fetch guests');
  }
};

export const getGuest = async (id: string): Promise<GuestApp | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error(error);
    return null;
  }

  return DbToAppTransformerSchema.parse(data);
};

export const getGuestsByStatus = async (
  userId: string,
  eventId: string,
  status: GuestApp['rsvpStatus'],
): Promise<GuestApp[]> => {
  try {
    // TODO: Implement Supabase query
    console.log(
      'getGuestsByStatus called with userId:',
      userId,
      'eventId:',
      eventId,
      'status:',
      status,
    );
    return [];
  } catch (error) {
    console.error('Error fetching guests by status:', error);
    throw new Error('Failed to fetch guests by status');
  }
};

export const getGuestsByGroup = async (
  userId: string,
  eventId: string,
  group: string,
): Promise<GuestApp[]> => {
  try {
    // TODO: Implement Supabase query
    console.log(
      'getGuestsByGroup called with userId:',
      userId,
      'eventId:',
      eventId,
      'group:',
      group,
    );
    return [];
  } catch (error) {
    console.error('Error fetching guests by group:', error);
    throw new Error('Failed to fetch guests by group');
  }
};

// Event operations - Read only
export const getEvents = async (userId: string): Promise<Event[]> => {
  try {
    // TODO: Implement Supabase query
    console.log('getEvents called with userId:', userId);
    return [];
  } catch (error) {
    console.error('Error fetching events:', error);
    throw new Error('Failed to fetch events');
  }
};

export const getEvent = async (
  userId: string,
  eventId: string,
): Promise<Event | null> => {
  try {
    // TODO: Implement Supabase query
    console.log('getEvent called with userId:', userId, 'eventId:', eventId);
    return null;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw new Error('Failed to fetch event');
  }
};

export const getUserEvent = async (userId: string): Promise<Event | null> => {
  try {
    const supabase = await createClient();
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching user event:', error);
      return null;
    }
    return event;
  } catch (error) {
    console.error('Error fetching user event:', error);
    return null;
  }
};

export const getGuestsForEvent = async (
  eventId: string,
): Promise<GuestApp[]> => {
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
        console.log('guest:', guest);
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

export const getSchedules = async (): Promise<ScheduleApp[]> => {
  try {
    return [{
      id: '1',
      name: 'Schedule 1',
      description: 'Description 1',
      dueTime: '2025-01-01T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }];
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw new Error('Failed to fetch schedules');
  }
};
