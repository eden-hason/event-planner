import { z } from 'zod';
import {
  MessageTemplateDbToAppSchema,
  type MessageTemplateApp,
} from './message-templates';

export { EVENT_TYPES, type EventType } from '@/features/events/utils/event-types';
export * from './catalog';
export * from './message-templates';

// =====================================================
// SHARED TYPES
// =====================================================

export type GuestStats = {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
};

// =====================================================
// ENUM TYPES
// =====================================================

// Schedule completion status (set after execution)
export const SCHEDULE_STATUSES = ['sent', 'cancelled'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

// Delivery methods
export const DELIVERY_METHODS = ['whatsapp', 'sms'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

// Delivery status for individual messages
export const DELIVERY_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'bounced',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// =====================================================
// SCHEDULES
// =====================================================

// Custom content override schema
export const CustomContentSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  whatsappBody: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.url().optional(),
});

export type CustomContent = z.infer<typeof CustomContentSchema>;

// The canonical select for schedule queries: every read joins the schedule
// type key and the full template row so channel/content always come from the
// catalog (schedules no longer store delivery_method or template_key).
export const SCHEDULE_SELECT =
  '*, schedule_types (key), message_templates (*)';

// --- DB-Level Schema (snake_case, with catalog joins) ---
export const ScheduleDbSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid(),
  scheduled_date: z.string(),
  scheduled_time: z.string().nullable().optional(),
  status: z.enum(SCHEDULE_STATUSES).nullable(),
  sent_at: z.string().nullable(),
  target_status: z.enum(['pending', 'confirmed']).nullable(),
  schedule_type_id: z.uuid(),
  template_id: z.uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  schedule_types: z.object({ key: z.string() }),
  message_templates: MessageTemplateDbToAppSchema.nullable(),
});

export type ScheduleDb = z.infer<typeof ScheduleDbSchema>;

// --- DB to App Transformer ---
export const ScheduleDbToAppSchema = ScheduleDbSchema.transform((db) => ({
  id: db.id,
  eventId: db.event_id,
  scheduledDate: db.scheduled_date,
  scheduledTime: db.scheduled_time ?? null,
  status: db.status,
  sentAt: db.sent_at ?? undefined,
  targetStatus: db.target_status ?? null,
  scheduleTypeId: db.schedule_type_id,
  scheduleTypeKey: db.schedule_types.key,
  templateId: db.template_id,
  template: db.message_templates as MessageTemplateApp | null,
  // Derived from the template row - the single source of truth for channel
  deliveryMethod: db.message_templates?.channel ?? null,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

export type ScheduleApp = z.infer<typeof ScheduleDbToAppSchema>;

// --- Setup Wizard Selection Schema ---
// One user-customized schedule chosen in the schedule setup wizard.
export const ScheduleSelectionItemSchema = z.object({
  scheduleTypeId: z.uuid(),
  templateId: z.uuid(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  targetStatus: z.enum(['pending', 'confirmed']).nullable(),
  // null = active; 'cancelled' = created but disabled (user opted out in the wizard)
  status: z.enum(SCHEDULE_STATUSES).nullable(),
});

export type ScheduleSelectionItem = z.infer<typeof ScheduleSelectionItemSchema>;

export const ScheduleSelectionSchema = z.array(ScheduleSelectionItemSchema);

// =====================================================
// MESSAGE DELIVERIES
// =====================================================

// --- App-Level Schema (camelCase) ---
export const MessageDeliveryAppSchema = z.object({
  id: z.uuid(),
  scheduleId: z.uuid(),
  guestId: z.uuid(),
  deliveryMethod: z.enum(DELIVERY_METHODS),
  status: z.enum(DELIVERY_STATUSES).default('pending'),
  sentAt: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),
  readAt: z.string().nullable().optional(),
  clickedAt: z.string().nullable().optional(),
  externalMessageId: z.string().max(255).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  errorCode: z.number().int().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageDeliveryApp = z.infer<typeof MessageDeliveryAppSchema>;

// --- DB-Level Schema (snake_case) ---
export const MessageDeliveryDbSchema = z.object({
  id: z.uuid(),
  schedule_id: z.uuid(),
  guest_id: z.uuid(),
  delivery_method: z.enum(DELIVERY_METHODS),
  status: z.enum(DELIVERY_STATUSES).default('pending'),
  sent_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  read_at: z.string().nullable(),
  clicked_at: z.string().nullable(),
  external_message_id: z.string().max(255).nullable(),
  error_message: z.string().nullable(),
  error_code: z.number().int().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MessageDeliveryDb = z.infer<typeof MessageDeliveryDbSchema>;

// --- DB to App Transformer ---
export const MessageDeliveryDbToAppSchema = MessageDeliveryDbSchema.transform(
  (db) => ({
    id: db.id,
    scheduleId: db.schedule_id,
    guestId: db.guest_id,
    deliveryMethod: db.delivery_method,
    status: db.status,
    sentAt: db.sent_at ?? undefined,
    deliveredAt: db.delivered_at ?? undefined,
    readAt: db.read_at ?? undefined,
    clickedAt: db.clicked_at ?? undefined,
    externalMessageId: db.external_message_id ?? undefined,
    errorMessage: db.error_message ?? undefined,
    errorCode: db.error_code ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }),
);

// --- Upsert Schema ---
export const MessageDeliveryUpsertSchema = z.object({
  id: z.uuid().optional(),
  scheduleId: z.uuid(),
  guestId: z.uuid(),
  deliveryMethod: z.enum(DELIVERY_METHODS),
  status: z.enum(DELIVERY_STATUSES).optional(),
});

export type MessageDeliveryUpsert = z.infer<typeof MessageDeliveryUpsertSchema>;

// --- App to DB Transformer ---
export const MessageDeliveryAppToDbSchema =
  MessageDeliveryUpsertSchema.transform((app) => {
    const dbData: Record<string, unknown> = {};

    if (app.id !== undefined) dbData.id = app.id;
    dbData.schedule_id = app.scheduleId;
    dbData.guest_id = app.guestId;
    dbData.delivery_method = app.deliveryMethod;
    if (app.status !== undefined) dbData.status = app.status;

    return dbData;
  });

// =====================================================
// GUEST INTERACTIONS
// =====================================================

// Metadata: DB shape (snake_case JSON keys)
const GuestInteractionMetadataDbSchema = z.object({
  guest_count: z.number().optional(),
  meal_choice: z.string().optional(),
}).nullable();

// Metadata: App shape (camelCase)
export const GuestInteractionMetadataAppSchema = z.object({
  guestCount: z.number().optional(),
  mealChoice: z.string().optional(),
}).nullable();

export type GuestInteractionMetadataApp = z.infer<typeof GuestInteractionMetadataAppSchema>;

// DB-level schema for the fields we select
const GuestInteractionDbSchema = z.object({
  guest_id: z.string(),
  interaction_type: z.string(),
  created_at: z.string(),
  metadata: z.unknown().transform((val) =>
    GuestInteractionMetadataDbSchema.parse(val ?? null)
  ),
});

// Transformer: DB → App
export const GuestInteractionDbToAppSchema = GuestInteractionDbSchema.transform((db) => ({
  guestId: db.guest_id,
  interactionType: db.interaction_type,
  createdAt: db.created_at,
  metadata: db.metadata
    ? {
        guestCount: db.metadata.guest_count,
        mealChoice: db.metadata.meal_choice,
      }
    : null,
}));

