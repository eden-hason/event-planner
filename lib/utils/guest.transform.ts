import {
type GuestUpsert
} from '@/lib/schemas/guest.schema';

// This is the type for data you'll send to Supabase for upsert
type GuestDbUpsert = {
  id?: string;
  name?: string;
  phone_number?: string;
  guest_group?: string;
  rsvp_status?: 'pending' | 'confirmed' | 'declined';
  dietary_restrictions?: string | null;
  amount?: number;
  notes?: string | null;
};

// Transforms our camelCase "Upsert" object into a snake_case DB upsert object
export function guestUpsertToDb(data: GuestUpsert): GuestDbUpsert {
  const dbData: GuestDbUpsert = {};

  // Include id if provided
  if (data.id !== undefined) {
    dbData.id = data.id;
  }

  // Map all provided fields
  if (data.name !== undefined) {
    dbData.name = data.name;
  }
  if (data.phone !== undefined) {
    dbData.phone_number = data.phone;
  }
  if (data.guestGroup !== undefined) {
    dbData.guest_group = data.guestGroup;
  }
  if (data.rsvpStatus !== undefined) {
    dbData.rsvp_status = data.rsvpStatus;
  }
  if (data.dietaryRestrictions !== undefined) {
    dbData.dietary_restrictions = data.dietaryRestrictions ?? null;
  }
  if (data.amount !== undefined) {
    dbData.amount = data.amount;
  }
  if (data.notes !== undefined) {
    dbData.notes = data.notes ?? null;
  }

  return dbData;
}