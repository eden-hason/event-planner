import { z } from 'zod';

// --- 1. The "Canonical" App-Level Schema ---
// This is the SINGLE SOURCE OF TRUTH for what a "Guest" object
// looks like inside your Next.js application (frontend and backend).
// It uses camelCase as is standard for JS/TS.

export const GuestAppSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid().nullable(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name is too long'),
  phone: z.string().max(20, 'Phone number is too long').nullable().optional(),
  // Foreign key to groups table
  groupId: z.uuid().nullable().optional(),
  rsvpStatus: z
    .enum(['pending', 'confirmed', 'declined'], {
      message: 'RSVP status must be pending, confirmed, or declined',
    })
    .default('pending'),
  dietaryRestrictions: z.string().nullable().optional(),
  amount: z.number().int().min(1, 'Amount must be at least 1').default(1),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// We infer the TypeScript type directly from the schema.
// This is the type you will use in your components and functions.
export type GuestApp = z.infer<typeof GuestAppSchema>;

// Minimal group info schema for embedding in GuestWithGroup
// (defined here to avoid circular dependency with GroupAppSchema)
export const GroupInfoSchema = z.object({
  id: z.uuid(),
  name: z.string().max(100),
  icon: z.string().nullable(),
  side: z.enum(['bride', 'groom']).nullable(),
});

export type GroupInfo = z.infer<typeof GroupInfoSchema>;

// Extended Guest schema with group info - used when fetching guests with their group populated
// The group relationship is resolved at query time via the group_id FK
export const GuestWithGroupAppSchema = GuestAppSchema.extend({
  group: GroupInfoSchema.nullable().optional(),
});

export type GuestWithGroupApp = z.infer<typeof GuestWithGroupAppSchema>;

// --- 2. The Database-Level Schema ---
// This schema matches the raw data structure in your Supabase (SQL) table.
// It uses snake_case.
// Note: Supabase sends timestamp_tz as ISO 8601 strings.

export const GuestDbSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid().nullable(),
  name: z.string().max(255),
  phone_number: z.string().max(20).nullable(),
  // Foreign key to groups table
  group_id: z.uuid().nullable(),
  rsvp_status: z.enum(['pending', 'confirmed', 'declined']).default('pending'),
  dietary_restrictions: z.string().nullable(),
  amount: z.number().int().default(1),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// We also infer the DB type for reference, though it's less used.
export type GuestDb = z.infer<typeof GuestDbSchema>;

// --- 3. Zod-based "DB to App" Transformer Schema ---
// Uses Zod's transform to convert snake_case DB data to camelCase app data.
// This provides validation and type safety through Zod.

export const DbToAppTransformerSchema = GuestDbSchema.transform((dbData) => {
  const rsvpStatus: 'pending' | 'confirmed' | 'declined' =
    dbData.rsvp_status || 'pending';

  return {
    id: dbData.id,
    eventId: dbData.event_id,
    name: dbData.name,
    phone: dbData.phone_number ?? undefined,
    groupId: dbData.group_id ?? undefined,
    rsvpStatus,
    dietaryRestrictions: dbData.dietary_restrictions ?? undefined,
    amount: dbData.amount,
    notes: dbData.notes ?? undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
});

// --- 4. "Upsert" Input Schema ---
// This schema is for VALIDATING upsert operations (create or update).
// It includes an optional id field (if provided, it's an update; if not, it's a create).
// All other fields are optional to support partial updates, but when provided, they must meet validation rules.

export const GuestUpsertSchema = z.object({
  id: z.uuid().optional(),
  eventId: z.uuid().nullable().optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name is too long')
    .optional(),
  phone: z.string().max(20, 'Phone number is too long').nullable().optional(),
  // Foreign key to groups table
  groupId: z.uuid().nullable().optional(),
  rsvpStatus: z
    .enum(['pending', 'confirmed', 'declined'], {
      message: 'RSVP status must be pending, confirmed, or declined',
    })
    .optional(),
  dietaryRestrictions: z.string().nullable().optional(),
  amount: z.number().int().min(1, 'Amount must be at least 1').optional(),
  notes: z.string().nullable().optional(),
});

export type GuestUpsert = z.infer<typeof GuestUpsertSchema>;

// --- 5. Zod-based "App to DB" Transformer Schema ---
// Uses Zod's transform to convert camelCase app data to snake_case DB data.
// This provides validation and type safety through Zod, consistent with DbToAppTransformerSchema.

export const AppToDbTransformerSchema = GuestUpsertSchema.transform(
  (appData) => {
    const dbData: Record<string, unknown> = {};

    // Only include fields that are defined (not undefined)
    if (appData.id !== undefined) {
      dbData.id = appData.id;
    }
    if (appData.name !== undefined) {
      dbData.name = appData.name;
    }
    if (appData.phone !== undefined) {
      dbData.phone_number = appData.phone ?? null;
    }
    if (appData.groupId !== undefined) {
      dbData.group_id = appData.groupId ?? null;
    }
    if (appData.rsvpStatus !== undefined) {
      dbData.rsvp_status = appData.rsvpStatus;
    }
    if (appData.dietaryRestrictions !== undefined) {
      dbData.dietary_restrictions = appData.dietaryRestrictions ?? null;
    }
    if (appData.amount !== undefined) {
      dbData.amount = appData.amount;
    }
    if (appData.notes !== undefined) {
      dbData.notes = appData.notes ?? null;
    }

    return dbData;
  },
);

export type GuestDbUpsert = z.infer<typeof AppToDbTransformerSchema>;

// --- 6. Group Schemas ---

// Group App Schema - the canonical app-level schema for a Group
export const GroupAppSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid().nullable(),
  name: z.string().max(100),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  side: z.enum(['bride', 'groom']).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type GroupApp = z.infer<typeof GroupAppSchema>;

// Extended Group schema with guests - used when fetching groups with their associated guests
// The guests relationship is resolved at query time via the group_id FK on the guests table
export const GroupWithGuestsAppSchema = GroupAppSchema.extend({
  guests: z.array(GuestAppSchema).default([]),
  guestCount: z.number().int().default(0),
});

export type GroupWithGuestsApp = z.infer<typeof GroupWithGuestsAppSchema>;

// Group DB Schema - matches the raw data structure in Supabase
export const GroupDbSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid().nullable(),
  name: z.string().max(100),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  side: z.enum(['bride', 'groom']).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type GroupDb = z.infer<typeof GroupDbSchema>;

// Zod-based "DB to App" Transformer Schema for Groups
export const GroupDbToAppTransformerSchema = GroupDbSchema.transform(
  (dbData) => ({
    id: dbData.id,
    eventId: dbData.event_id,
    name: dbData.name,
    description: dbData.description,
    icon: dbData.icon,
    side: dbData.side,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  }),
);

// Available icon names for groups (using exact Tabler icon component names)
// Lucide icons are prefixed with 'Lucide'
export const GROUP_ICONS = [
  'IconUsers',
  'IconSchool',
  'IconBriefcase',
  'IconHome',
  'LucideBeer',
  'IconTank',
  'IconHeart',
  'IconStar',
  'IconPlane',
  'IconCrown',
  'IconCar',
  'IconCake',
] as const;

export type GroupIcon = (typeof GROUP_ICONS)[number];

// Available sides for groups
export const GROUP_SIDES = ['bride', 'groom'] as const;
export type GroupSide = (typeof GROUP_SIDES)[number];

export const GROUP_SIDE_LABELS: Record<GroupSide, string> = {
  bride: "Bride's side",
  groom: "Groom's side",
};

export const GroupUpsertSchema = z.object({
  id: z.uuid().optional(),
  eventId: z.uuid().nullable().optional(),
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name is too long')
    .optional(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .nullable()
    .optional(),
  icon: z
    .enum(GROUP_ICONS, {
      message: 'Please select a valid icon',
    })
    .optional(),
  side: z
    .enum(GROUP_SIDES, {
      message: 'Please select a valid side',
    })
    .nullable()
    .optional(),
});

export type GroupUpsert = z.infer<typeof GroupUpsertSchema>;

// Zod-based "App to DB" Transformer Schema for Groups
export const GroupAppToDbTransformerSchema = GroupUpsertSchema.transform(
  (appData) => {
    const dbData: Record<string, unknown> = {};

    if (appData.id !== undefined) {
      dbData.id = appData.id;
    }
    if (appData.eventId !== undefined) {
      dbData.event_id = appData.eventId ?? null;
    }
    if (appData.name !== undefined) {
      dbData.name = appData.name;
    }
    if (appData.description !== undefined) {
      dbData.description = appData.description ?? null;
    }
    if (appData.icon !== undefined) {
      dbData.icon = appData.icon ?? null;
    }
    if (appData.side !== undefined) {
      dbData.side = appData.side ?? null;
    }

    return dbData;
  },
);

export type GroupDbUpsert = z.infer<typeof GroupAppToDbTransformerSchema>;

// --- 7. Import Guest Schema ---
// Schema for validating guest data during CSV import
// Uses same validation rules as GuestAppSchema but only includes importable fields

export const ImportGuestSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name is too long'),
  phone: z.string().superRefine((val, ctx) => {
    // Check if empty first - show friendly required message
    if (!val || val.trim().length === 0) {
      ctx.addIssue('Phone number is required');
      return;
    }

    // Only validate format if there's a value
    if (val.length < 7) {
      ctx.addIssue('Phone number must be at least 7 characters');
      return;
    }

    if (val.length > 20) {
      ctx.addIssue('Phone number is too long');
      return;
    }

    if (!/^[+]?[\d\s\-().]+$/.test(val)) {
      ctx.addIssue(
        'Invalid phone format (use digits, spaces, +, -, or parentheses)',
      );
    }
  }),
});

export type ImportGuestData = z.infer<typeof ImportGuestSchema>;
