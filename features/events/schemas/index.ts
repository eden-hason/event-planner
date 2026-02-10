import { z } from 'zod';

// --- Location Schema ---
export const LocationCoordsSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export type LocationCoords = z.infer<typeof LocationCoordsSchema>;

// --- Invitations Schema ---
export const InvitationsSchema = z.object({
  frontImageUrl: z.string().optional(),
  backImageUrl: z.string().optional(),
});

export type Invitations = z.infer<typeof InvitationsSchema>;

export const LocationSchema = z.object({
  name: z.string(),
  coords: LocationCoordsSchema.optional(),
});

export type Location = z.infer<typeof LocationSchema>;

// --- Event Settings Sub-Schemas ---
// Paybox configuration for payment integration
export const PayboxConfigSchema = z.object({
  enabled: z.boolean(),
  link: z.string(),
});

export type PayboxConfig = z.infer<typeof PayboxConfigSchema>;

// Bit configuration for phone-based digital gifting
export const BitConfigSchema = z.object({
  enabled: z.boolean(),
  phoneNumber: z.string(),
});

export type BitConfig = z.infer<typeof BitConfigSchema>;

// Event settings object that contains various configuration options
export const EventSettingsSchema = z.object({
  paybox_config: PayboxConfigSchema.optional(),
  bit_config: BitConfigSchema.optional(),
});

export type EventSettings = z.infer<typeof EventSettingsSchema>;

// App-level event settings (camelCase)
export const EventSettingsAppSchema = z.object({
  payboxConfig: PayboxConfigSchema.optional(),
  bitConfig: BitConfigSchema.optional(),
});

export type EventSettingsApp = z.infer<typeof EventSettingsAppSchema>;

// --- Host Details Sub-Schemas ---
// Wedding host details structure
export const WeddingHostDetailsSchema = z.object({
  bride: z
    .object({
      name: z.string().optional(),
      parents: z.string().optional(),
    })
    .optional(),
  groom: z
    .object({
      name: z.string().optional(),
      parents: z.string().optional(),
    })
    .optional(),
});

export type WeddingHostDetails = z.infer<typeof WeddingHostDetailsSchema>;

// Generic host details schema (flexible for any event type)
export const HostDetailsSchema = z.record(z.string(), z.unknown());

export type HostDetails = z.infer<typeof HostDetailsSchema>;

// --- Guest Experience Sub-Schemas ---
export const GuestExperienceSchema = z.object({
  dietaryOptions: z.boolean().optional(),
});

export type GuestExperience = z.infer<typeof GuestExperienceSchema>;

// DB-level guest experience (snake_case)
export const GuestExperienceDbSchema = z.object({
  dietary_options: z.boolean().optional(),
});

export type GuestExperienceDb = z.infer<typeof GuestExperienceDbSchema>;

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
  receptionTime: z.string().optional(),
  ceremonyTime: z.string().optional(),
  venueName: z.string().optional(),
  location: LocationSchema.optional(),
  eventSettings: EventSettingsAppSchema.optional(),
  hostDetails: HostDetailsSchema.optional(),
  invitations: InvitationsSchema.optional(),
  guestExperience: GuestExperienceSchema.optional(),
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

// DB-level invitations schema (snake_case)
export const InvitationsDbSchema = z.object({
  front_image_url: z.string().optional(),
  back_image_url: z.string().optional(),
});

export type InvitationsDb = z.infer<typeof InvitationsDbSchema>;

export const EventDbSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  title: z.string(),
  description: z.string().optional().nullable(),
  event_date: z.string(),
  event_type: z.string().optional().nullable(),
  reception_time: z.string().optional().nullable(),
  ceremony_time: z.string().optional().nullable(),
  venue_name: z.string().optional().nullable(),
  location: LocationSchema.optional().nullable(),
  event_settings: EventSettingsSchema.optional().nullable(),
  host_details: HostDetailsSchema.optional().nullable(),
  invitations: InvitationsDbSchema.optional().nullable(),
  guests_experience: GuestExperienceDbSchema.optional().nullable(),
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
  reception_time?: string | null;
  ceremony_time?: string | null;
  venue_name?: string | null;
  location?: Location | null;
  event_settings?: EventSettings | null;
  host_details?: HostDetails | null;
  invitations?: InvitationsDb | null;
  guests_experience?: GuestExperienceDb | null;
  status?: string | null;
  is_default?: boolean | null;
  created_at: string;
  updated_at: string;
}): EventApp {
  const status: 'draft' | 'published' | 'archived' =
    (dbData.status as 'draft' | 'published' | 'archived') || 'draft';

  // Transform event_settings from snake_case to camelCase
  const eventSettings: EventSettingsApp | undefined = dbData.event_settings
    ? {
      payboxConfig: dbData.event_settings.paybox_config,
      bitConfig: dbData.event_settings.bit_config,
    }
    : undefined;

  // Transform invitations from snake_case to camelCase
  const invitations: Invitations | undefined = dbData.invitations
    ? {
      frontImageUrl: dbData.invitations.front_image_url,
      backImageUrl: dbData.invitations.back_image_url,
    }
    : undefined;

  const guestExperience: GuestExperience | undefined = dbData.guests_experience
    ? {
      dietaryOptions: dbData.guests_experience.dietary_options,
    }
    : undefined;

  return {
    id: dbData.id,
    userId: dbData.user_id,
    title: dbData.title,
    description: dbData.description ?? undefined,
    eventDate: dbData.event_date,
    eventType: dbData.event_type ?? undefined,
    receptionTime: dbData.reception_time ?? undefined,
    ceremonyTime: dbData.ceremony_time ?? undefined,
    venueName: dbData.venue_name ?? undefined,
    location: dbData.location ?? undefined,
    eventSettings,
    hostDetails: dbData.host_details ?? undefined,
    invitations,
    guestExperience,
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

  // Transform event_settings from snake_case to camelCase
  const eventSettings: EventSettingsApp | undefined = dbData.event_settings
    ? {
      payboxConfig: dbData.event_settings.paybox_config,
      bitConfig: dbData.event_settings.bit_config,
    }
    : undefined;

  // Transform invitations from snake_case to camelCase
  const invitations: Invitations | undefined = dbData.invitations
    ? {
      frontImageUrl: dbData.invitations.front_image_url,
      backImageUrl: dbData.invitations.back_image_url,
    }
    : undefined;

  // Transform guests_experience from snake_case to camelCase
  const guestExperience: GuestExperience | undefined = dbData.guests_experience
    ? {
      dietaryOptions: dbData.guests_experience.dietary_options,
    }
    : undefined;

  return {
    id: dbData.id,
    userId: dbData.user_id,
    title: dbData.title,
    description: dbData.description ?? undefined,
    eventDate: dbData.event_date,
    eventType: dbData.event_type ?? undefined,
    receptionTime: dbData.reception_time ?? undefined,
    ceremonyTime: dbData.ceremony_time ?? undefined,
    venueName: dbData.venue_name ?? undefined,
    location: dbData.location ?? undefined,
    eventSettings,
    hostDetails: dbData.host_details ?? undefined,
    invitations,
    guestExperience,
    status,
    isDefault: dbData.is_default ?? undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
});

// --- 4. Event Details Update Schema ---
// Schema for updating event details from the event details page form.
// Requires id since this is always an update operation.
// Uses nested structure to match DB schema (hostDetails, eventSettings).

export const EventDetailsUpdateSchema = z.object({
  id: z.uuid(),
  eventDate: z.string().optional(),
  eventType: z.string().optional(),
  receptionTime: z.string().optional(),
  ceremonyTime: z.string().optional(),
  venueName: z.string().optional(),
  location: LocationSchema.optional(),
  hostDetails: WeddingHostDetailsSchema.optional(),
  eventSettings: z
    .object({
      payboxConfig: z
        .object({
          enabled: z.boolean().optional(),
          link: z.string().optional(),
        })
        .optional(),
      bitConfig: z
        .object({
          enabled: z.boolean().optional(),
          phoneNumber: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  invitations: InvitationsSchema.optional(),
  guestExperience: GuestExperienceSchema.optional(),
});

export type EventDetailsUpdate = z.infer<typeof EventDetailsUpdateSchema>;

export type UpdateEventDetailsState = {
  success: boolean;
  message?: string | null;
};

// --- 5. Event Create Schema ---
// Schema for creating a new event from the create event dialog.
// Uses minimal required fields, with sensible defaults for the rest.

export const EventCreateSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title is too long'),
  eventDate: z.string().min(1, 'Event date is required'),
  eventType: z.enum(['wedding', 'birthday', 'corporate', 'other']),
});

export type EventCreate = z.infer<typeof EventCreateSchema>;

export type CreateEventState = {
  success: boolean;
  message?: string | null;
  eventId?: string | null;
};
