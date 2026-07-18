import { z } from 'zod';
import {
  MessageTemplateDbToAppSchema,
  type MessageTemplateApp,
} from './message-templates';

// Known schedule type keys. The catalog lives in the schedule_types table;
// this list only drives UI ordering and behavioral special cases, so unknown
// keys coming from the DB must still parse (hence z.string() in schemas).
export const SCHEDULE_TYPE_KEYS = [
  'initial_invitation',
  'confirmation',
  'event_reminder',
  'post_event',
] as const;
export type ScheduleTypeKey = (typeof SCHEDULE_TYPE_KEYS)[number];

// English fallback labels for back-office UI (the app UI uses i18n catalogs)
export const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  initial_invitation: 'Initial Invitation',
  confirmation: 'Confirmation',
  event_reminder: 'Event Reminder',
  post_event: 'Thank You',
};

// --- event_type_default_schedules (joined with schedule_types + message_templates) ---

export const DefaultScheduleDbSchema = z.object({
  id: z.uuid(),
  event_type_id: z.uuid(),
  schedule_type_id: z.uuid(),
  template_id: z.uuid(),
  days_offset: z.number().int(),
  default_time: z.string(),
  target_status: z.enum(['pending', 'confirmed']).nullable(),
  sort_order: z.number().int(),
  schedule_types: z.object({ key: z.string() }),
  message_templates: MessageTemplateDbToAppSchema,
});

export const DefaultScheduleDbToAppSchema = DefaultScheduleDbSchema.transform(
  (db) => ({
    id: db.id,
    eventTypeId: db.event_type_id,
    scheduleTypeId: db.schedule_type_id,
    scheduleTypeKey: db.schedule_types.key,
    templateId: db.template_id,
    template: db.message_templates as MessageTemplateApp,
    daysOffset: db.days_offset,
    // Postgres time comes back as HH:MM:SS; the UI works in HH:MM
    defaultTime: db.default_time.slice(0, 5),
    targetStatus: db.target_status,
    sortOrder: db.sort_order,
  }),
);

export type DefaultScheduleApp = z.infer<typeof DefaultScheduleDbToAppSchema>;
