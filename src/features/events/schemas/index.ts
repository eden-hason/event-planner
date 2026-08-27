import { z } from 'zod';

// --- Location Schema ---
export const LocationCoordsSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export type LocationCoords = z.infer<typeof LocationCoordsSchema>;

// --- Invitations Schema ---
export const InvitationsSchema = z.object({
  imageUrl: z.string().optional(),
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

// Bit configuration for link-based digital gifting. The link is the
// organiser's personal Bit payment link (copied from the Bit app, e.g. its
// "personal QR"), used verbatim - Bit resolves the recipient from an opaque
// token in the URL, not from a phone number.
//
// `link` is optional so legacy rows configured before this change - which hold
// a `phoneNumber` and no `link` - still parse instead of throwing on read. Zod
// drops the unknown `phoneNumber`; downstream code treats a missing link as
// "not configured".
export const BitConfigSchema = z.object({
  enabled: z.boolean(),
  link: z.string().optional(),
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
  dietaryTypes: z.array(z.string()).optional(),
  lockGuestCount: z.boolean().optional(),
  // Whether the event reminder carries each guest's table number. Controls
  // message content only - the seating page and the guest form's table picker
  // are available regardless.
  sendTableNumbers: z.boolean().optional(),
});

export type GuestExperience = z.infer<typeof GuestExperienceSchema>;

// DB-level guest experience (snake_case)
export const GuestExperienceDbSchema = z.object({
  dietary_options: z.boolean().optional(),
  dietary_types: z.array(z.string()).optional(),
  lock_guest_count: z.boolean().optional(),
  send_table_numbers: z.boolean().optional(),
});

export type GuestExperienceDb = z.infer<typeof GuestExperienceDbSchema>;

// --- Guests Estimate Schema ---
// Roughly how many guest records the owner expects, from the onboarding slider.
// A guess, not a limit - nothing enforces it.
export const GuestsEstimateSchema = z.number().int().positive();
export type GuestsEstimate = z.infer<typeof GuestsEstimateSchema>;

// Bounds of the onboarding slider. Exported so the estimate screen and anything
// clamping a stored value read the same numbers.
export const GUESTS_ESTIMATE_MIN = 50;
export const GUESTS_ESTIMATE_MAX = 800;
export const GUESTS_ESTIMATE_STEP = 10;
export const GUESTS_ESTIMATE_DEFAULT = 300;

// --- 1. The "Canonical" App-Level Schema ---
// This is the SINGLE SOURCE OF TRUTH for what an "Event" object
// looks like inside your Next.js application (frontend and backend).
// It uses camelCase as is standard for JS/TS.

export const EventAppSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  // No minimum: a Draft Event exists before the names are known, and the row
  // defaults to an empty title until the names screen generates one.
  title: z.string().max(200, 'Title is too long'),
  description: z.string().optional(),
  // Null until the date question is answered, and permanently null for events
  // whose owner said they do not have a date yet. Anything derived from it -
  // countdowns, schedule offsets - is undefined for those events.
  eventDate: z.string().nullable(),
  eventType: z.string().optional(),
  receptionTime: z.string().optional(),
  ceremonyTime: z.string().optional(),
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
  guestsEstimate: GuestsEstimateSchema.optional(),
  guestsCapacity: z.number().int().positive().optional(),
  budget: z.number().optional(),
  landingTemplateId: z.string().optional(),
  canCreateSchedules: z.boolean().default(false),
  shortCode: z.string(),
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
  image_url: z.string().optional(),
});

export type InvitationsDb = z.infer<typeof InvitationsDbSchema>;

export const EventDbSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  title: z.string(),
  description: z.string().optional().nullable(),
  event_date: z.string().nullable(),
  event_type_id: z.uuid().optional().nullable(),
  // Joined from event_types when the query selects it
  event_types: z.object({ key: z.string() }).optional().nullable(),
  reception_time: z.string().optional().nullable(),
  ceremony_time: z.string().optional().nullable(),
  location: LocationSchema.optional().nullable(),
  event_settings: EventSettingsSchema.optional().nullable(),
  host_details: HostDetailsSchema.optional().nullable(),
  invitations: InvitationsDbSchema.optional().nullable(),
  guests_experience: GuestExperienceDbSchema.optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_default: z.boolean().optional().nullable(),
  guests_estimate: GuestsEstimateSchema.optional().nullable(),
  guests_capacity: z.number().int().positive().optional().nullable(),
  budget: z.number().optional().nullable(),
  landing_template_id: z.string().optional().nullable(),
  can_create_schedules: z.boolean().default(false),
  short_code: z.string(),
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
  event_date: string | null;
  event_type_id?: string | null;
  event_types?: { key: string } | null;
  reception_time?: string | null;
  ceremony_time?: string | null;
  location?: Location | null;
  event_settings?: EventSettings | null;
  host_details?: HostDetails | null;
  invitations?: InvitationsDb | null;
  guests_experience?: GuestExperienceDb | null;
  status?: string | null;
  is_default?: boolean | null;
  guests_estimate?: GuestsEstimate | null;
  guests_capacity?: number | null;
  budget?: number | null;
  landing_template_id?: string | null;
  can_create_schedules?: boolean | null;
  short_code: string;
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
      imageUrl: dbData.invitations.image_url,
    }
    : undefined;

  const guestExperience: GuestExperience | undefined = dbData.guests_experience
    ? {
      dietaryOptions: dbData.guests_experience.dietary_options,
      dietaryTypes: dbData.guests_experience.dietary_types,
      lockGuestCount: dbData.guests_experience.lock_guest_count,
      sendTableNumbers: dbData.guests_experience.send_table_numbers,
    }
    : undefined;

  return {
    id: dbData.id,
    userId: dbData.user_id,
    title: dbData.title,
    description: dbData.description ?? undefined,
    eventDate: dbData.event_date ?? null,
    eventType: dbData.event_types?.key ?? undefined,
    receptionTime: dbData.reception_time ?? undefined,
    ceremonyTime: dbData.ceremony_time ?? undefined,
    location: dbData.location ?? undefined,
    eventSettings,
    hostDetails: dbData.host_details ?? undefined,
    invitations,
    guestExperience,
    status,
    isDefault: dbData.is_default ?? undefined,
    guestsEstimate: dbData.guests_estimate ?? undefined,
    guestsCapacity: dbData.guests_capacity ?? undefined,
    budget: dbData.budget ?? undefined,
    landingTemplateId: dbData.landing_template_id ?? undefined,
    canCreateSchedules: dbData.can_create_schedules ?? false,
    shortCode: dbData.short_code,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
}

// --- 3b. Zod-based "DB to App" Transformer Schema ---
// Delegates to dbToAppTransformer so the mapping is defined once.
export const DbToAppTransformerSchema = EventDbSchema.transform(dbToAppTransformer);

// --- 4. Event Details Update Schema ---
// Schema for updating event details from the event details page form.
// Requires id since this is always an update operation.
// Uses nested structure to match DB schema (hostDetails, eventSettings).

export const EventDetailsUpdateSchema = z.object({
  id: z.uuid(),
  eventDate: z.string().optional(),
  receptionTime: z.string().optional(),
  ceremonyTime: z.string().optional(),
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
          link: z.string().optional(),
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
  eventType: z.enum(['wedding', 'henna', 'bar_mitzva', 'bat_mitzva']),
});

export type EventCreate = z.infer<typeof EventCreateSchema>;

export type CreateEventState = {
  success: boolean;
  message?: string | null;
  eventId?: string | null;
};

// --- 6. Event Onboarding Schemas ---

export const EventTypeKeySchema = z.enum([
  'wedding',
  'henna',
  'bar_mitzva',
  'bat_mitzva',
]);

export type EventTypeKey = z.infer<typeof EventTypeKeySchema>;

/** Wedding and henna are hosted by two people; the mitzvas by one. */
export function isCoupleEvent(eventType: EventTypeKey): boolean {
  return eventType === 'wedding' || eventType === 'henna';
}

// --- 7. Draft Event step schemas ---
// One schema per onboarding question. Each patches the Draft Event created at
// the type screen, so every field beyond the id is what that one screen asked
// for. See docs/adr/0003-events-exist-before-they-are-complete.md.

export const DraftNamesSchema = z
  .object({
    eventId: z.uuid(),
    brideName: z.string().trim().max(100).optional(),
    groomName: z.string().trim().max(100).optional(),
    childName: z.string().trim().max(100).optional(),
  })
  .refine((v) => !!(v.brideName || v.groomName || v.childName), {
    message: 'At least one name is required',
    path: ['brideName'],
  });

export const DraftDateSchema = z.object({
  eventId: z.uuid(),
  // Empty string is the explicit "we don't have a date yet" answer, which is a
  // real answer and stores null - not the same as never having reached this
  // screen, which the resume logic tells apart via answeredSteps.
  eventDate: z.string(),
});

export const DraftLocationSchema = z.object({
  eventId: z.uuid(),
  location: LocationSchema.optional(),
});

export const DraftEstimateSchema = z.object({
  eventId: z.uuid(),
  guestsEstimate: z
    .number()
    .int()
    .min(GUESTS_ESTIMATE_MIN)
    .max(GUESTS_ESTIMATE_MAX),
});

export type DraftStepState = {
  success: boolean;
  message?: string | null;
};

export type CreateDraftEventState = {
  success: boolean;
  message?: string | null;
  eventId?: string | null;
};
