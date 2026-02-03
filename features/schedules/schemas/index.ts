import { z } from 'zod';

// =====================================================
// ENUM TYPES
// =====================================================

// Event types for message templates
export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// Message types (must match DB enum message_type)
export const MESSAGE_TYPES = [
  'initial_invitation',
  'first_confirmation',
  'second_confirmation',
  'event_reminder',
  'thank_you',
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

// CTA (Call to Action) types
export const CTA_TYPES = ['none', 'rsvp', 'directions', 'gift_registry', 'custom'] as const;
export type CtaType = (typeof CTA_TYPES)[number];

// Schedule status
export const SCHEDULE_STATUSES = ['draft', 'scheduled', 'sent', 'cancelled'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

// Delivery methods
export const DELIVERY_METHODS = ['email', 'whatsapp', 'both'] as const;
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
// MESSAGE TEMPLATES
// =====================================================

// --- App-Level Schema (camelCase) ---
export const MessageTemplateAppSchema = z.object({
  id: z.uuid(),
  eventType: z.enum(EVENT_TYPES),
  messageType: z.enum(MESSAGE_TYPES),
  name: z.string().max(255),
  subject: z.string().max(500).nullable().optional(),
  bodyTemplate: z.string(),
  whatsappTemplate: z.string().nullable().optional(),
  ctaText: z.string().max(100).nullable().optional(),
  ctaType: z.enum(CTA_TYPES).default('none'),
  defaultDaysOffset: z.number().int(),
  defaultTime: z.string(),
  isSystem: z.boolean().default(false),
  createdBy: z.uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageTemplateApp = z.infer<typeof MessageTemplateAppSchema>;

// --- DB-Level Schema (snake_case) ---
export const MessageTemplateDbSchema = z.object({
  id: z.uuid(),
  event_type: z.enum(EVENT_TYPES),
  message_type: z.enum(MESSAGE_TYPES),
  name: z.string().max(255),
  subject: z.string().max(500).nullable(),
  body_template: z.string(),
  whatsapp_template: z.string().nullable(),
  cta_text: z.string().max(100).nullable(),
  cta_type: z.enum(CTA_TYPES).default('none'),
  default_days_offset: z.number().int(),
  default_time: z.string(),
  is_system: z.boolean().default(false),
  created_by: z.uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MessageTemplateDb = z.infer<typeof MessageTemplateDbSchema>;

// --- DB to App Transformer ---
export const MessageTemplateDbToAppSchema = MessageTemplateDbSchema.transform((db) => ({
  id: db.id,
  eventType: db.event_type,
  messageType: db.message_type,
  name: db.name,
  subject: db.subject ?? undefined,
  bodyTemplate: db.body_template,
  whatsappTemplate: db.whatsapp_template ?? undefined,
  ctaText: db.cta_text ?? undefined,
  ctaType: db.cta_type,
  defaultDaysOffset: db.default_days_offset,
  defaultTime: db.default_time,
  isSystem: db.is_system,
  createdBy: db.created_by ?? undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

// --- Upsert Schema ---
export const MessageTemplateUpsertSchema = z.object({
  id: z.uuid().optional(),
  eventType: z.enum(EVENT_TYPES),
  messageType: z.enum(MESSAGE_TYPES),
  name: z.string().min(1, 'Name is required').max(255),
  subject: z.string().max(500).nullable().optional(),
  bodyTemplate: z.string().min(1, 'Body template is required'),
  whatsappTemplate: z.string().nullable().optional(),
  ctaText: z.string().max(100).nullable().optional(),
  ctaType: z.enum(CTA_TYPES).optional(),
  defaultDaysOffset: z.number().int(),
  defaultTime: z.string(),
});

export type MessageTemplateUpsert = z.infer<typeof MessageTemplateUpsertSchema>;

// --- App to DB Transformer ---
export const MessageTemplateAppToDbSchema = MessageTemplateUpsertSchema.transform((app) => {
  const dbData: Record<string, unknown> = {};

  if (app.id !== undefined) dbData.id = app.id;
  dbData.event_type = app.eventType;
  dbData.message_type = app.messageType;
  dbData.name = app.name;
  if (app.subject !== undefined) dbData.subject = app.subject ?? null;
  dbData.body_template = app.bodyTemplate;
  if (app.whatsappTemplate !== undefined) dbData.whatsapp_template = app.whatsappTemplate ?? null;
  if (app.ctaText !== undefined) dbData.cta_text = app.ctaText ?? null;
  if (app.ctaType !== undefined) dbData.cta_type = app.ctaType;
  dbData.default_days_offset = app.defaultDaysOffset;
  dbData.default_time = app.defaultTime;

  return dbData;
});

// =====================================================
// SCHEDULES
// =====================================================

// Target filter schema for schedule targeting
export const TargetFilterSchema = z.object({
  guestStatus: z.array(z.enum(['pending', 'confirmed', 'declined'])).optional(),
  tags: z.array(z.string()).optional(),
  groupIds: z.array(z.uuid()).optional(),
});

export type TargetFilter = z.infer<typeof TargetFilterSchema>;

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
  messageType: z.enum(MESSAGE_TYPES),
  scheduledDate: z.string(),
  status: z.enum(SCHEDULE_STATUSES).default('draft'),
  sentAt: z.string().nullable().optional(),
  targetFilter: TargetFilterSchema.optional(),
  templateId: z.uuid().nullable().optional(),
  customContent: CustomContentSchema.nullable().optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).default('both'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScheduleApp = z.infer<typeof ScheduleAppSchema>;

// --- DB-Level Schema (snake_case) ---
// Note: target_filter and custom_content are JSONB in Supabase
export const ScheduleDbSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid(),
  message_type: z.enum(MESSAGE_TYPES),
  scheduled_date: z.string(),
  status: z.enum(SCHEDULE_STATUSES).default('draft'),
  sent_at: z.string().nullable(),
  target_filter: z.record(z.string(), z.unknown()).nullable(),
  template_id: z.uuid().nullable(),
  custom_content: z.record(z.string(), z.unknown()).nullable(),
  delivery_method: z.enum(DELIVERY_METHODS).default('both'),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ScheduleDb = z.infer<typeof ScheduleDbSchema>;

// --- DB to App Transformer ---
export const ScheduleDbToAppSchema = ScheduleDbSchema.transform((db) => ({
  id: db.id,
  eventId: db.event_id,
  messageType: db.message_type,
  scheduledDate: db.scheduled_date,
  status: db.status,
  sentAt: db.sent_at ?? undefined,
  targetFilter: db.target_filter
    ? TargetFilterSchema.parse({
      guestStatus: db.target_filter.guest_status,
      tags: db.target_filter.tags,
      groupIds: db.target_filter.group_ids,
    })
    : undefined,
  templateId: db.template_id ?? undefined,
  customContent: db.custom_content
    ? CustomContentSchema.parse({
      subject: db.custom_content.subject,
      body: db.custom_content.body,
      whatsappBody: db.custom_content.whatsapp_body,
      ctaText: db.custom_content.cta_text,
      ctaUrl: db.custom_content.cta_url,
    })
    : undefined,
  deliveryMethod: db.delivery_method,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

// --- Upsert Schema ---
export const ScheduleUpsertSchema = z.object({
  id: z.uuid().optional(),
  eventId: z.uuid(),
  messageType: z.enum(MESSAGE_TYPES),
  scheduledDate: z.string(),
  status: z.enum(SCHEDULE_STATUSES).optional(),
  targetFilter: TargetFilterSchema.optional(),
  templateId: z.uuid().nullable().optional(),
  customContent: CustomContentSchema.nullable().optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).optional(),
});

export type ScheduleUpsert = z.infer<typeof ScheduleUpsertSchema>;

// --- App to DB Transformer ---
export const ScheduleAppToDbSchema = ScheduleUpsertSchema.transform((app) => {
  const dbData: Record<string, unknown> = {};

  if (app.id !== undefined) dbData.id = app.id;
  dbData.event_id = app.eventId;
  dbData.message_type = app.messageType;
  dbData.scheduled_date = app.scheduledDate;
  if (app.status !== undefined) dbData.status = app.status;
  if (app.targetFilter !== undefined) {
    dbData.target_filter = {
      guest_status: app.targetFilter.guestStatus,
      tags: app.targetFilter.tags,
      group_ids: app.targetFilter.groupIds,
    };
  }
  if (app.templateId !== undefined) dbData.template_id = app.templateId ?? null;
  if (app.customContent !== undefined) {
    dbData.custom_content = app.customContent
      ? {
        subject: app.customContent.subject,
        body: app.customContent.body,
        whatsapp_body: app.customContent.whatsappBody,
        cta_text: app.customContent.ctaText,
        cta_url: app.customContent.ctaUrl,
      }
      : null;
  }
  if (app.deliveryMethod !== undefined) dbData.delivery_method = app.deliveryMethod;

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
  whatsappMessageId: z.string().max(255).nullable().optional(),
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
  whatsapp_message_id: z.string().max(255).nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MessageDeliveryDb = z.infer<typeof MessageDeliveryDbSchema>;

// --- DB to App Transformer ---
export const MessageDeliveryDbToAppSchema = MessageDeliveryDbSchema.transform((db) => ({
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
  whatsappMessageId: db.whatsapp_message_id ?? undefined,
  errorMessage: db.error_message ?? undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

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
export const MessageDeliveryAppToDbSchema = MessageDeliveryUpsertSchema.transform((app) => {
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
export const GuestInteractionDbToAppSchema = GuestInteractionDbSchema.transform((db) => ({
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
}));

// --- Create Schema (interactions are typically insert-only) ---
export const GuestInteractionCreateSchema = z.object({
  guestId: z.uuid(),
  scheduleId: z.uuid(),
  interactionType: z.enum(INTERACTION_TYPES),
  metadata: InteractionMetadataSchema.optional(),
});

export type GuestInteractionCreate = z.infer<typeof GuestInteractionCreateSchema>;

// --- App to DB Transformer ---
export const GuestInteractionAppToDbSchema = GuestInteractionCreateSchema.transform((app) => ({
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
