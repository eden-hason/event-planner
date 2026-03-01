import { z } from 'zod';

// =====================================================
// ENUM TYPES
// =====================================================

// Event types for message templates
export const EVENT_TYPES = [
  'wedding',
  'birthday',
  'corporate',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// Action types for schedules (stored in DB)
export const ACTION_TYPES = [
  'initial_invitation',
  'confirmation',
  'event_reminder',
  'post_event',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  initial_invitation: 'Initial Invitation',
  confirmation: 'Confirmation',
  event_reminder: 'Event Reminder',
  post_event: 'Post Event',
};

// CTA (Call to Action) types
export const CTA_TYPES = [
  'none',
  'confirm_rsvp',
  'directions',
  'gift_registry',
  'custom',
  'view_photos',
  'view_directions',
  'view_invitation',
] as const;
export type CtaType = (typeof CTA_TYPES)[number];

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

// Interaction types for analytics
export const INTERACTION_TYPES = [
  'opened',
  'clicked',
  'rsvp_confirmed',
  'rsvp_declined',
  'rsvp_updated',
  'unsubscribed',
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

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

// --- App-Level Schema (camelCase) ---
export const ScheduleAppSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  scheduledDate: z.string(),
  status: z.enum(SCHEDULE_STATUSES).nullable().optional(),
  sentAt: z.string().nullable().optional(),
  targetStatus: z.enum(['pending', 'confirmed']).nullable().optional(),
  templateId: z.uuid().nullable().optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).default('whatsapp'),
  actionType: z.enum(ACTION_TYPES),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScheduleApp = z.infer<typeof ScheduleAppSchema>;

// --- DB-Level Schema (snake_case) ---
export const ScheduleDbSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid(),
  scheduled_date: z.string(),
  status: z.enum(SCHEDULE_STATUSES).nullable(),
  sent_at: z.string().nullable(),
  target_status: z.enum(['pending', 'confirmed']).nullable(),
  template_id: z.uuid().nullable(),
  delivery_method: z.enum(DELIVERY_METHODS).default('whatsapp'),
  action_type: z.enum(ACTION_TYPES),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ScheduleDb = z.infer<typeof ScheduleDbSchema>;

// --- DB to App Transformer ---
export const ScheduleDbToAppSchema = ScheduleDbSchema.transform((db) => ({
  id: db.id,
  eventId: db.event_id,
  scheduledDate: db.scheduled_date,
  status: db.status,
  sentAt: db.sent_at ?? undefined,
  targetStatus: db.target_status ?? null,
  templateId: db.template_id ?? undefined,
  deliveryMethod: db.delivery_method,
  actionType: db.action_type,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

// --- Upsert Schema ---
export const ScheduleUpsertSchema = z.object({
  id: z.uuid().optional(),
  eventId: z.uuid(),
  scheduledDate: z.string(),
  status: z.enum(SCHEDULE_STATUSES).nullable().optional(),
  targetStatus: z.enum(['pending', 'confirmed']).nullable().optional(),
  templateId: z.uuid().nullable().optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).optional(),
  actionType: z.enum(ACTION_TYPES),
});

export type ScheduleUpsert = z.infer<typeof ScheduleUpsertSchema>;

// --- App to DB Transformer ---
export const ScheduleAppToDbSchema = ScheduleUpsertSchema.transform((app) => {
  const dbData: Record<string, unknown> = {};

  if (app.id !== undefined) dbData.id = app.id;
  dbData.event_id = app.eventId;
  dbData.scheduled_date = app.scheduledDate;
  if (app.status !== undefined) dbData.status = app.status;
  if (app.targetStatus !== undefined) dbData.target_status = app.targetStatus;
  if (app.templateId !== undefined) dbData.template_id = app.templateId ?? null;
  if (app.deliveryMethod !== undefined)
    dbData.delivery_method = app.deliveryMethod;
  dbData.action_type = app.actionType;

  return dbData;
});

// =====================================================
// MESSAGE DELIVERIES
// =====================================================

// Response data schema for RSVP confirmations
export const ResponseDataSchema = z.object({
  guestCount: z.number().int().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
});

export type ResponseData = z.infer<typeof ResponseDataSchema>;

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
  respondedAt: z.string().nullable().optional(),
  responseData: ResponseDataSchema.nullable().optional(),
  externalMessageId: z.string().max(255).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
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
  responded_at: z.string().nullable(),
  response_data: z.record(z.string(), z.unknown()).nullable(),
  external_message_id: z.string().max(255).nullable(),
  error_message: z.string().nullable(),
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
    respondedAt: db.responded_at ?? undefined,
    responseData: db.response_data
      ? ResponseDataSchema.parse({
        guestCount: db.response_data.guest_count,
        dietaryRestrictions: db.response_data.dietary_restrictions,
        notes: db.response_data.notes,
      })
      : undefined,
    externalMessageId: db.external_message_id ?? undefined,
    errorMessage: db.error_message ?? undefined,
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

// Interaction metadata schema
export const InteractionMetadataSchema = z.object({
  guestCount: z.number().int().optional(),
  dietaryRestrictions: z.string().optional(),
  linkClicked: z.string().optional(),
  userAgent: z.string().optional(),
});

export type InteractionMetadata = z.infer<typeof InteractionMetadataSchema>;

// --- App-Level Schema (camelCase) ---
export const GuestInteractionAppSchema = z.object({
  id: z.uuid(),
  guestId: z.uuid(),
  scheduleId: z.uuid(),
  interactionType: z.enum(INTERACTION_TYPES),
  metadata: InteractionMetadataSchema.optional(),
  createdAt: z.string(),
});

export type GuestInteractionApp = z.infer<typeof GuestInteractionAppSchema>;

// --- DB-Level Schema (snake_case) ---
export const GuestInteractionDbSchema = z.object({
  id: z.uuid(),
  guest_id: z.uuid(),
  schedule_id: z.uuid(),
  interaction_type: z.enum(INTERACTION_TYPES),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

export type GuestInteractionDb = z.infer<typeof GuestInteractionDbSchema>;

// --- DB to App Transformer ---
export const GuestInteractionDbToAppSchema = GuestInteractionDbSchema.transform(
  (db) => ({
    id: db.id,
    guestId: db.guest_id,
    scheduleId: db.schedule_id,
    interactionType: db.interaction_type,
    metadata: db.metadata
      ? InteractionMetadataSchema.parse({
        guestCount: db.metadata.guest_count,
        dietaryRestrictions: db.metadata.dietary_restrictions,
        linkClicked: db.metadata.link_clicked,
        userAgent: db.metadata.user_agent,
      })
      : undefined,
    createdAt: db.created_at,
  }),
);

// --- Create Schema (interactions are typically insert-only) ---
export const GuestInteractionCreateSchema = z.object({
  guestId: z.uuid(),
  scheduleId: z.uuid(),
  interactionType: z.enum(INTERACTION_TYPES),
  metadata: InteractionMetadataSchema.optional(),
});

export type GuestInteractionCreate = z.infer<
  typeof GuestInteractionCreateSchema
>;

// --- App to DB Transformer ---
export const GuestInteractionAppToDbSchema =
  GuestInteractionCreateSchema.transform((app) => ({
    guest_id: app.guestId,
    schedule_id: app.scheduleId,
    interaction_type: app.interactionType,
    metadata: app.metadata
      ? {
        guest_count: app.metadata.guestCount,
        dietary_restrictions: app.metadata.dietaryRestrictions,
        link_clicked: app.metadata.linkClicked,
        user_agent: app.metadata.userAgent,
      }
      : null,
  }));

// =====================================================
// WHATSAPP TEMPLATES
// =====================================================
export * from './whatsapp-templates';
