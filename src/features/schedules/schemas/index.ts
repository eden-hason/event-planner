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

// Schedule completion status (set after execution). 'expired' is the Dispatcher
// deciding a Schedule's moment has passed - the Event already happened, or the
// Due Time is too far back to send now. Not 'cancelled': nobody cancelled it.
// See docs/adr/0015.
//
// 'disabled' is the one value nothing sets after execution: it is what the seed
// trigger writes for an Event that cannot send yet, meaning "created but never
// enabled". It is not 'cancelled' because the organiser never made that choice,
// and the timeline shows the two differently - "off" is a decision, "locked" is
// an offer not yet made. Paying flips every 'disabled' row to null in one move.
export const SCHEDULE_STATUSES = [
  'sent',
  'cancelled',
  'expired',
  'disabled',
] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

/**
 * How long an organiser's personal note on a Schedule may be.
 *
 * The note is appended to a WhatsApp body that is already near its own limits,
 * so this is a kindness as much as a constraint. Enforced both in the textarea
 * and in `updateCustomText`, because a cap only the UI knows about is not one.
 */
export const CUSTOM_TEXT_MAX_LENGTH = 160;

// Delivery methods
export const DELIVERY_METHODS = ['whatsapp', 'sms'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

// A Delivery's rolled-up state (message_deliveries.status). 'not_sent' is a
// guest in the audience no attempt could be made for; an attempt itself is
// never 'not_sent'. 'bounced' is not a database value and is kept only so older
// parsed shapes still type-check.
export const DELIVERY_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'not_sent',
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
// type key/name and the full template row so channel/content always come
// from the catalog (schedules no longer store delivery_method or
// template_key). The schedule type's own name is included so the UI can
// render a schedule type it has no curated i18n label/icon for yet - the
// catalog is meant to grow past the four types known at build time.
export const SCHEDULE_SELECT =
  '*, schedule_types (key, name, execution_kind), message_templates (*)';

// The same columns, but joining schedule_types inner so a filter on
// execution_kind actually excludes rows. Spelled out rather than derived from
// SCHEDULE_SELECT at runtime: PostgREST's types are parsed from the string
// literal, and a computed one loses every column type. Embedding the relation
// twice does not work either - PostgREST then ignores the filter and returns
// nothing.
export const DISPATCH_SCHEDULE_SELECT =
  '*, schedule_types!inner (key, name, execution_kind), message_templates (*)';

// --- DB-Level Schema (snake_case, with catalog joins) ---
export const ScheduleDbSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid(),
  // The Due Time: one instant, authored as Israel wall clock (ADR 0015).
  scheduled_date: z.string(),
  status: z.enum(SCHEDULE_STATUSES).nullable(),
  // When the Dispatcher claimed this Schedule and queued its Deliveries.
  dispatched_at: z.string().nullable().optional(),
  sent_at: z.string().nullable(),
  target_status: z.enum(['pending', 'confirmed']).nullable(),
  schedule_type_id: z.uuid(),
  template_id: z.uuid().nullable(),
  // Organiser-authored free-text line for this schedule instance (e.g. a
  // custom note). Read by templates whose family offers requires_note - see
  // services/resolve-reminder-templates.ts.
  custom_text: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  schedule_types: z.object({
    key: z.string(),
    name: z.string(),
    execution_kind: z.string(),
  }),
  message_templates: MessageTemplateDbToAppSchema.nullable(),
});

export type ScheduleDb = z.infer<typeof ScheduleDbSchema>;

// --- DB to App Transformer ---
export const ScheduleDbToAppSchema = ScheduleDbSchema.transform((db) => ({
  id: db.id,
  eventId: db.event_id,
  scheduledDate: db.scheduled_date,
  status: db.status,
  dispatchedAt: db.dispatched_at ?? null,
  sentAt: db.sent_at ?? undefined,
  targetStatus: db.target_status ?? null,
  scheduleTypeId: db.schedule_type_id,
  scheduleTypeKey: db.schedule_types.key,
  scheduleTypeName: db.schedule_types.name,
  // Which engine owns this row. Only 'message' may reach sendSchedule.
  executionKind: db.schedule_types.execution_kind,
  templateId: db.template_id,
  template: db.message_templates as MessageTemplateApp | null,
  // Derived from the template row - the single source of truth for channel
  deliveryMethod: db.message_templates?.channel ?? null,
  customText: db.custom_text ?? null,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

export type ScheduleApp = z.infer<typeof ScheduleDbToAppSchema>;

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
