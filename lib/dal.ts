import { firestore } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

// TypeScript interfaces
export interface Guest {
  id?: string;
  name: string;
  email: string;
  phone: string;
  group: string;
  rsvpStatus: 'confirmed' | 'pending' | 'declined';
  dietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneName?: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Event {
  id?: string;
  title: string;
  description?: string;
  date: Timestamp;
  location?: string;
  maxGuests?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Guest operations - Read only
export const getGuests = async (
  userId: string,
  eventId: string,
): Promise<Guest[]> => {
  try {
    const guestsRef = firestore
      .collection('users')
      .doc(userId)
      .collection('events')
      .doc(eventId)
      .collection('guests');
    const querySnapshot = await guestsRef.get();

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Guest[];
  } catch (error) {
    console.error('Error fetching guests:', error);
    throw new Error('Failed to fetch guests');
  }
};

export const getGuest = async (
  userId: string,
  eventId: string,
  guestId: string,
): Promise<Guest | null> => {
  try {
    const guestRef = firestore
      .collection('users')
      .doc(userId)
      .collection('events')
      .doc(eventId)
      .collection('guests')
      .doc(guestId);
    const guestDoc = await guestRef.get();

    if (guestDoc.exists) {
      return {
        id: guestDoc.id,
        ...guestDoc.data(),
      } as Guest;
    }
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
    const guestsRef = firestore
      .collection('users')
      .doc(userId)
      .collection('events')
      .doc(eventId)
      .collection('guests');
    const querySnapshot = await guestsRef
      .where('rsvpStatus', '==', status)
      .get();

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Guest[];
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
    const guestsRef = firestore
      .collection('users')
      .doc(userId)
      .collection('events')
      .doc(eventId)
      .collection('guests');
    const querySnapshot = await guestsRef.where('group', '==', group).get();

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Guest[];
  } catch (error) {
    console.error('Error fetching guests by group:', error);
    throw new Error('Failed to fetch guests by group');
  }
};

// Event operations - Read only
export const getEvents = async (userId: string): Promise<Event[]> => {
  try {
    const eventsRef = firestore
      .collection('users')
      .doc(userId)
      .collection('events');
    const querySnapshot = await eventsRef.get();

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];
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
    const eventRef = firestore
      .collection('users')
      .doc(userId)
      .collection('events')
      .doc(eventId);
    const eventDoc = await eventRef.get();

    if (eventDoc.exists) {
      return {
        id: eventDoc.id,
        ...eventDoc.data(),
      } as Event;
    }
    return null;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw new Error('Failed to fetch event');
  }
};
