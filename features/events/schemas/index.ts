import { z } from 'zod';

// --- 1. The "Canonical" App-Level Schema ---
// This is the SINGLE SOURCE OF TRUTH for what an "Event" object
// looks like inside your Next.js application (frontend and backend).
// It uses camelCase as is standard for JS/TS.

export const EventAppSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title is too long'),
  description: z.string().optional(),
  eventDate: z.string(),
  eventType: z.string().optional(),
  location: z.string().optional(),
  maxGuests: z.number().int().positive().optional(),
  budget: z.number().nonnegative().optional(),
  fileMetadata: z.record(z.string(), z.unknown()).optional(),
  status: z
    .enum(['draft', 'published', 'archived'], {
      message: 'Status must be draft, published, or archived',
    })
    .default('draft'),
  isDefault: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// We infer the TypeScript type directly from the schema.
// This is the type you will use in your components and functions.
export type EventApp = z.infer<typeof EventAppSchema>;

// Event status type for convenience
export type EventStatus = EventApp['status'];

// --- 2. The Database-Level Schema ---
// This schema matches the raw data structure in your Supabase (SQL) table.
// It uses snake_case.
// Note: Supabase sends timestamp_tz as ISO 8601 strings.

export const EventDbSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  title: z.string(),
  description: z.string().optional().nullable(),
  event_date: z.string(),
  event_type: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  max_guests: z.number().int().positive().optional().nullable(),
  budget: z.number().nonnegative().optional().nullable(),
  file_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_default: z.boolean().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// We also infer the DB type for reference, though it's less used.
export type EventDb = z.infer<typeof EventDbSchema>;

// --- 3. The "DB to App" Transformer Function ---
// Simple function to transform snake_case DB data to camelCase app data.
// No validation - just field name transformation.

export function dbToAppTransformer(dbData: {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  event_date: string;
  event_type?: string | null;
  location?: string | null;
  max_guests?: number | null;
  budget?: number | null;
  file_metadata?: Record<string, unknown> | null;
  status?: string | null;
  is_default?: boolean | null;
  created_at: string;
  updated_at: string;
}): EventApp {
  const status: 'draft' | 'published' | 'archived' =
    (dbData.status as 'draft' | 'published' | 'archived') || 'draft';

  return {
    id: dbData.id,
    userId: dbData.user_id,
    title: dbData.title,
    description: dbData.description ?? undefined,
    eventDate: dbData.event_date,
    eventType: dbData.event_type ?? undefined,
    location: dbData.location ?? undefined,
    maxGuests: dbData.max_guests ?? undefined,
    budget: dbData.budget ?? undefined,
    fileMetadata: dbData.file_metadata ?? undefined,
    status,
    isDefault: dbData.is_default ?? undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
}

// --- 3b. Zod-based "DB to App" Transformer Schema ---
// Uses Zod's transform to convert snake_case DB data to camelCase app data.
// This provides validation and type safety through Zod.

export const DbToAppTransformerSchema = EventDbSchema.transform((dbData) => {
  const status: 'draft' | 'published' | 'archived' = (dbData.status ||
    'draft') as 'draft' | 'published' | 'archived';

  return {
    id: dbData.id,
    userId: dbData.user_id,
    title: dbData.title,
    description: dbData.description ?? undefined,
    eventDate: dbData.event_date,
    eventType: dbData.event_type ?? undefined,
    location: dbData.location ?? undefined,
    maxGuests: dbData.max_guests ?? undefined,
    budget: dbData.budget ?? undefined,
    fileMetadata: dbData.file_metadata ?? undefined,
    status,
    isDefault: dbData.is_default ?? undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
});

export type UpsertEventState = {
  success: boolean;
  errors?: z.ZodError<z.input<typeof EventUpsertSchema>>;
  message?: string | null;
};

// --- 4. "Upsert" Input Schema ---
// This schema is for VALIDATING upsert operations (create or update).
// It includes an optional id field (if provided, it's an update; if not, it's a create).
// All other fields are optional to support partial updates, but when provided, they must meet validation rules.

export const EventUpsertSchema = z.object({
  id: z.uuid().optional(),
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title is too long')
    .optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  eventType: z.string().optional(),
  location: z.string().optional(),
  maxGuests: z.number().int().positive().optional(),
  budget: z.number().nonnegative().optional(),
  fileMetadata: z.record(z.string(), z.unknown()).optional(),
  status: z
    .enum(['draft', 'published', 'archived'], {
      message: 'Status must be draft, published, or archived',
    })
    .optional(),
  isDefault: z.boolean().optional(),
});

export type EventUpsert = z.infer<typeof EventUpsertSchema>;
