import { z } from 'zod';

// --- 1. The "Canonical" App-Level Schema ---
// This is the SINGLE SOURCE OF TRUTH for what a "Guest" object
// looks like inside your Next.js application (frontend and backend).
// It uses camelCase as is standard for JS/TS.

export const GuestAppSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  phone: z.string().min(1, 'Phone is required'),
  guestGroup: z.string().optional(),
  rsvpStatus: z
    .enum(['pending', 'confirmed', 'declined'], {
      message: 'RSVP status must be pending, confirmed, or declined',
    })
    .default('pending'),
  dietaryRestrictions: z.string().optional(),
  amount: z.number().min(1, 'Amount must be at least 1').default(1),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// We infer the TypeScript type directly from the schema.
// This is the type you will use in your components and functions.
export type GuestApp = z.infer<typeof GuestAppSchema>;

// --- 2. The Database-Level Schema ---
// This schema matches the raw data structure in your Supabase (SQL) table.
// It uses snake_case.
// Note: Supabase sends timestamp_tz as ISO 8601 strings.

export const GuestDbSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone_number: z.string(),
  guest_group: z.string().optional(),
  rsvp_status: z.enum(['pending', 'confirmed', 'declined']),
  dietary_restrictions: z.string().optional().nullable(),
  amount: z.number(),
  notes: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// We also infer the DB type for reference, though it's less used.
export type GuestDb = z.infer<typeof GuestDbSchema>;

// --- 3. The "DB to App" Transformer Function ---
// Simple function to transform snake_case DB data to camelCase app data.
// No validation - just field name transformation.

export function dbToAppTransformer(dbData: {
  id: string;
  name: string;
  phone_number: string;
  guest_group?: string | null;
  rsvp_status: string;
  dietary_restrictions?: string | null;
  amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}): GuestApp {
  return {
    id: dbData.id,
    name: dbData.name,
    phone: dbData.phone_number,
    guestGroup: dbData.guest_group ?? undefined,
    rsvpStatus: (dbData.rsvp_status || 'pending') as
      | 'pending'
      | 'confirmed'
      | 'declined',
    dietaryRestrictions: dbData.dietary_restrictions ?? undefined,
    amount: dbData.amount,
    notes: dbData.notes ?? undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
}

// --- 3b. Zod-based "DB to App" Transformer Schema ---
// Uses Zod's transform to convert snake_case DB data to camelCase app data.
// This provides validation and type safety through Zod.

export const DbToAppTransformerSchema = GuestDbSchema.transform((dbData) => {
  const rsvpStatus: 'pending' | 'confirmed' | 'declined' =
    dbData.rsvp_status || 'pending';

  return {
    id: dbData.id,
    name: dbData.name,
    phone: dbData.phone_number,
    guestGroup: dbData.guest_group,
    rsvpStatus,
    dietaryRestrictions: dbData.dietary_restrictions ?? undefined,
    amount: dbData.amount,
    notes: dbData.notes ?? undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
});

export type UpsertGuestState = {
  success: boolean;
  errors?: z.ZodError<z.input<typeof GuestUpsertSchema>>;
  message?: string | null;
};

// --- 6. "Upsert" Input Schema ---
// This schema is for VALIDATING upsert operations (create or update).
// It includes an optional id field (if provided, it's an update; if not, it's a create).
// All other fields are optional to support partial updates, but when provided, they must meet validation rules.

export const GuestUpsertSchema = z.object({
  id: z.uuid().optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  guestGroup: z.string().optional(),
  rsvpStatus: z
    .enum(['pending', 'confirmed', 'declined'], {
      message: 'RSVP status must be pending, confirmed, or declined',
    })
    .optional(),
  dietaryRestrictions: z.string().optional(),
  amount: z.number().min(1, 'Amount must be at least 1').optional(),
  notes: z.string().optional(),
});

export type GuestUpsert = z.infer<typeof GuestUpsertSchema>;
