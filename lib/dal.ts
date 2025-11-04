import { GuestData } from '@/app/actions/guests';
import { createClient } from '@/utils/supabase/server';

// TypeScript interfaces
export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
  initial_setup_complete: boolean;
}

// Profile operations
export const getCurrentUserProfile = async (): Promise<Profile | null> => {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    return null;
  }
};

// Alternative function to get profile by user ID (useful for server actions)
export const getUserProfile = async (
  userId: string,
): Promise<Profile | null> => {
  try {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

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

export interface Guest {
  id?: string;
  name: string;
  email?: string;
  phone: string;
  group: string;
  rsvpStatus: 'confirmed' | 'pending' | 'declined';
  dietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneName?: string;
  notes?: string;
  amount: number;
  createdAt?: string; // ISO string when returned from DAL
  updatedAt?: string; // ISO string when returned from DAL
}

export interface Event {
  id?: string;
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
): Promise<GuestData[]> => {
  try {
    // TODO: Implement Supabase query
    console.log('getGuests called with userId:', userId, 'eventId:', eventId);
    return [];
  } catch (error) {
    console.error('Error fetching guests:', error);
    throw new Error('Failed to fetch guests');
  }
};

export const getGuest = async (
  userId: string,
  eventId: string,
  guestId: string,
): Promise<GuestData | null> => {
  try {
    // TODO: Implement Supabase query
    console.log(
      'getGuest called with userId:',
      userId,
      'eventId:',
      eventId,
      'guestId:',
      guestId,
    );
    return null;
  } catch (error) {
    console.error('Error fetching guest:', error);
    throw new Error('Failed to fetch guest');
  }
};

export const getGuestsByStatus = async (
  userId: string,
  eventId: string,
  status: Guest['rsvpStatus'],
): Promise<Guest[]> => {
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
): Promise<Guest[]> => {
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
