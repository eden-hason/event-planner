import { GuestData } from '@/app/actions/guests';

// TypeScript interfaces
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
  date: string; // ISO string when returned from DAL
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
