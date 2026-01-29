import { z } from 'zod';

// --- Enum Schemas ---
// These enums match the database enum types defined in PostgreSQL

// Schedule type enum - defines the type of scheduled message
// Maps to: schedule_type_enum ('invite', 'followup', 'reminder', 'thankyou')
export const ScheduleTypeEnum = z.enum([
  'invite',
  'followup',
  'reminder',
  'thankyou',
]);

export type ScheduleType = z.infer<typeof ScheduleTypeEnum>;

// Schedule status enum - defines the current state of the schedule
// Maps to: schedule_status_enum ('active', 'paused', 'completed', 'draft')
export const ScheduleStatusEnum = z.enum([
  'active',
  'paused',
  'completed',
  'draft',
]);

export type ScheduleStatus = z.infer<typeof ScheduleStatusEnum>;

// Trigger strategy enum - defines how the schedule timing is determined
// Maps to: trigger_strategy_enum ('absolute_date', 'days_before_event', 'days_after_event', 'immediate')
export const TriggerStrategyEnum = z.enum([
  'absolute_date',
  'days_before_event',
  'days_after_event',
]);

export type TriggerStrategy = z.infer<typeof TriggerStrategyEnum>;

// Target audience status - possible RSVP statuses to target
export const AudienceStatusEnum = z.enum([
  'pending',
  'attending',
  'not_attending',
  'maybe',
]);

export type AudienceStatus = z.infer<typeof AudienceStatusEnum>;

// Channel enum - communication channels
export const ChannelEnum = z.enum(['sms', 'whatsapp', 'email']);

export type Channel = z.infer<typeof ChannelEnum>;

// --- 1. The "Canonical" App-Level Schema ---
// This is the SINGLE SOURCE OF TRUTH for what an "EventSchedule" object
// looks like inside your Next.js application (frontend and backend).
// It uses camelCase as is standard for JS/TS.

export const EventScheduleAppSchema = z.object({
  // Identity
  id: z.string().uuid(),
  eventId: z.string().uuid(),

  // Core Configuration
  scheduleType: ScheduleTypeEnum,
  status: ScheduleStatusEnum.default('draft'),

  // Timing Logic
  triggerStrategy: TriggerStrategyEnum.default('absolute_date'),

  // If strategy is 'absolute_date', use this:
  scheduledAt: z.string().datetime().optional().nullable(),

  // If strategy is relative (before/after), use these:
  offsetDays: z.number().int().default(0),
  triggerTime: z.string().default('09:00:00'), // HH:MM:SS format

  // Content & Targeting
  messageBody: z.string().min(1, 'Message body is required'),

  // Who gets this? (array like ['pending'] or ['attending'])
  targetAudienceStatus: z.array(AudienceStatusEnum).default(['pending']),

  // Channels (array like ['sms', 'whatsapp'])
  channels: z.array(ChannelEnum).default(['sms']),

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
});

// We infer the TypeScript type directly from the schema.
// This is the type you will use in your components and functions.
export type EventScheduleApp = z.infer<typeof EventScheduleAppSchema>;

// --- 2. The Database-Level Schema ---
// This schema matches the raw data structure in your Supabase (SQL) table.
// It uses snake_case.
// Note: Supabase sends timestamp_tz as ISO 8601 strings.

export const EventScheduleDbSchema = z.object({
  // Identity
  id: z.string().uuid(),
  event_id: z.string().uuid(),

  // Core Configuration
  schedule_type: ScheduleTypeEnum,
  status: ScheduleStatusEnum.default('draft'),

  // Timing Logic
  trigger_strategy: TriggerStrategyEnum.default('absolute_date'),

  // If strategy is 'absolute_date', use this:
  scheduled_at: z.string().nullable().optional(),

  // If strategy is relative (before/after), use these:
  offset_days: z.number().int().default(0).nullable().optional(),
  trigger_time: z.string().default('09:00:00').nullable().optional(), // TIME format

  // Content & Targeting
  message_body: z.string().min(1),

  // Who gets this? (JSONB array)
  target_audience_status: z
    .array(AudienceStatusEnum)
    .default(['pending'])
    .nullable()
    .optional(),

  // Channels (JSONB array)
  channels: z.array(ChannelEnum).default(['sms']).nullable().optional(),

  // Metadata
  created_at: z.string(),
  updated_at: z.string(),
});

// We also infer the DB type for reference.
export type EventScheduleDb = z.infer<typeof EventScheduleDbSchema>;

// --- 3. The "DB to App" Transformer Function ---
// Simple function to transform snake_case DB data to camelCase app data.
// No validation - just field name transformation.

export function scheduleDbToApp(dbData: {
  id: string;
  event_id: string;
  schedule_type: ScheduleType;
  status?: ScheduleStatus | null;
  trigger_strategy?: TriggerStrategy | null;
  scheduled_at?: string | null;
  offset_days?: number | null;
  trigger_time?: string | null;
  message_body: string;
  target_audience_status?: AudienceStatus[] | null;
  channels?: Channel[] | null;
  created_at: string;
  updated_at: string;
}): EventScheduleApp {
  return {
    id: dbData.id,
    eventId: dbData.event_id,
    scheduleType: dbData.schedule_type,
    status: dbData.status ?? 'draft',
    triggerStrategy: dbData.trigger_strategy ?? 'absolute_date',
    scheduledAt: dbData.scheduled_at ?? null,
    offsetDays: dbData.offset_days ?? 0,
    triggerTime: dbData.trigger_time ?? '09:00:00',
    messageBody: dbData.message_body,
    targetAudienceStatus: dbData.target_audience_status ?? ['pending'],
    channels: dbData.channels ?? ['sms'],
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
}

// --- 3b. Zod-based "DB to App" Transformer Schema ---
// Uses Zod's transform to convert snake_case DB data to camelCase app data.
// This provides validation and type safety through Zod.

export const ScheduleDbToAppTransformerSchema = EventScheduleDbSchema.transform(
  (dbData): EventScheduleApp => {
    return {
      id: dbData.id,
      eventId: dbData.event_id,
      scheduleType: dbData.schedule_type,
      status: dbData.status ?? 'draft',
      triggerStrategy: dbData.trigger_strategy ?? 'absolute_date',
      scheduledAt: dbData.scheduled_at ?? null,
      offsetDays: dbData.offset_days ?? 0,
      triggerTime: dbData.trigger_time ?? '09:00:00',
      messageBody: dbData.message_body,
      targetAudienceStatus: dbData.target_audience_status ?? ['pending'],
      channels: dbData.channels ?? ['sms'],
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at,
    };
  },
);

// --- 4. The "App to DB" Transformer Function ---
// Simple function to transform camelCase app data to snake_case DB data.
// Used when inserting or updating records in the database.

export function scheduleAppToDb(appData: EventScheduleApp): EventScheduleDb {
  return {
    id: appData.id,
    event_id: appData.eventId,
    schedule_type: appData.scheduleType,
    status: appData.status,
    trigger_strategy: appData.triggerStrategy,
    scheduled_at: appData.scheduledAt,
    offset_days: appData.offsetDays,
    trigger_time: appData.triggerTime,
    message_body: appData.messageBody,
    target_audience_status: appData.targetAudienceStatus,
    channels: appData.channels,
    created_at: appData.createdAt,
    updated_at: appData.updatedAt,
  };
}

// --- 5. Create/Update Schemas ---
// These are partial schemas for creating and updating schedules.

// Schema for creating a new schedule (without id, created_at, updated_at)
export const CreateScheduleSchema = z.object({
  eventId: z.string().uuid(),
  scheduleType: ScheduleTypeEnum,
  status: ScheduleStatusEnum.optional().default('draft'),
  triggerStrategy: TriggerStrategyEnum.optional().default('absolute_date'),
  scheduledAt: z.string().datetime().optional().nullable(),
  offsetDays: z.number().int().optional().default(0),
  triggerTime: z.string().optional().default('09:00:00'),
  messageBody: z.string().min(1, 'Message body is required'),
  targetAudienceStatus: z
    .array(AudienceStatusEnum)
    .optional()
    .default(['pending']),
  channels: z.array(ChannelEnum).optional().default(['sms']),
});

export type CreateSchedule = z.infer<typeof CreateScheduleSchema>;

// Schema for updating an existing schedule (all fields optional except id)
export const UpdateScheduleSchema = z.object({
  id: z.string().uuid(),
  scheduleType: ScheduleTypeEnum.optional(),
  status: ScheduleStatusEnum.optional(),
  triggerStrategy: TriggerStrategyEnum.optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  offsetDays: z.number().int().optional(),
  triggerTime: z.string().optional(),
  messageBody: z.string().min(1, 'Message body is required').optional(),
  targetAudienceStatus: z.array(AudienceStatusEnum).optional(),
  channels: z.array(ChannelEnum).optional(),
});

export type UpdateSchedule = z.infer<typeof UpdateScheduleSchema>;

// --- 6. "Create/Update to DB" Transformer Functions ---

// Transform CreateSchedule to DB format for insertion
export function createScheduleToDb(
  data: CreateSchedule,
): Omit<EventScheduleDb, 'id' | 'created_at' | 'updated_at'> {
  return {
    event_id: data.eventId,
    schedule_type: data.scheduleType,
    status: data.status ?? 'draft',
    trigger_strategy: data.triggerStrategy ?? 'absolute_date',
    scheduled_at: data.scheduledAt ?? null,
    offset_days: data.offsetDays ?? 0,
    trigger_time: data.triggerTime ?? '09:00:00',
    message_body: data.messageBody,
    target_audience_status: data.targetAudienceStatus ?? ['pending'],
    channels: data.channels ?? ['sms'],
  };
}

// Transform UpdateSchedule to DB format for update
export function updateScheduleToDb(data: UpdateSchedule): {
  id: string;
  schedule_type?: ScheduleType;
  status?: ScheduleStatus;
  trigger_strategy?: TriggerStrategy;
  scheduled_at?: string | null;
  offset_days?: number;
  trigger_time?: string;
  message_body?: string;
  target_audience_status?: AudienceStatus[];
  channels?: Channel[];
} {
  const dbData: {
    id: string;
    schedule_type?: ScheduleType;
    status?: ScheduleStatus;
    trigger_strategy?: TriggerStrategy;
    scheduled_at?: string | null;
    offset_days?: number;
    trigger_time?: string;
    message_body?: string;
    target_audience_status?: AudienceStatus[];
    channels?: Channel[];
  } = {
    id: data.id,
  };

  if (data.scheduleType !== undefined) {
    dbData.schedule_type = data.scheduleType;
  }
  if (data.status !== undefined) {
    dbData.status = data.status;
  }
  if (data.triggerStrategy !== undefined) {
    dbData.trigger_strategy = data.triggerStrategy;
  }
  if (data.scheduledAt !== undefined) {
    dbData.scheduled_at = data.scheduledAt;
  }
  if (data.offsetDays !== undefined) {
    dbData.offset_days = data.offsetDays;
  }
  if (data.triggerTime !== undefined) {
    dbData.trigger_time = data.triggerTime;
  }
  if (data.messageBody !== undefined) {
    dbData.message_body = data.messageBody;
  }
  if (data.targetAudienceStatus !== undefined) {
    dbData.target_audience_status = data.targetAudienceStatus;
  }
  if (data.channels !== undefined) {
    dbData.channels = data.channels;
  }

  return dbData;
}

// --- 7. Action Result Types ---

export type ScheduleActionState = {
  success: boolean;
  message?: string | null;
  data?: EventScheduleApp | null;
};

export type ScheduleListActionState = {
  success: boolean;
  message?: string | null;
  data?: EventScheduleApp[] | null;
};
