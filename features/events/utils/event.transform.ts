import { type EventUpsert } from '../schemas';

// This is the type for data you'll send to Supabase for upsert
type EventDbUpsert = {
  id?: string;
  title?: string;
  description?: string | null;
  event_date?: string;
  event_type?: string | null;
  location?: string | null;
  max_guests?: number | null;
  budget?: number | null;
  file_metadata?: Record<string, unknown> | null;
  status?: 'draft' | 'published' | 'archived';
  is_default?: boolean | null;
};

// Transforms our camelCase "Upsert" object into a snake_case DB upsert object
export function eventUpsertToDb(data: EventUpsert): EventDbUpsert {
  const dbData: EventDbUpsert = {};

  // Include id if provided
  if (data.id !== undefined) {
    dbData.id = data.id;
  }

  // Map all provided fields
  if (data.title !== undefined) {
    dbData.title = data.title;
  }
  if (data.description !== undefined) {
    dbData.description = data.description ?? null;
  }
  if (data.eventDate !== undefined) {
    dbData.event_date = data.eventDate;
  }
  if (data.eventType !== undefined) {
    dbData.event_type = data.eventType ?? null;
  }
  if (data.location !== undefined) {
    dbData.location = data.location ?? null;
  }
  if (data.maxGuests !== undefined) {
    dbData.max_guests = data.maxGuests ?? null;
  }
  if (data.budget !== undefined) {
    dbData.budget = data.budget ?? null;
  }
  if (data.fileMetadata !== undefined) {
    dbData.file_metadata = data.fileMetadata ?? null;
  }
  if (data.status !== undefined) {
    dbData.status = data.status;
  }
  if (data.isDefault !== undefined) {
    dbData.is_default = data.isDefault ?? null;
  }

  return dbData;
}
