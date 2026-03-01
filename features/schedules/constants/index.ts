import { type ActionType } from '../schemas';

export type DefaultScheduleConfig = {
  templateId: string;           // UUID reference to whatsapp_templates
  actionType: ActionType;        // Stored directly in DB
  daysOffset: number;            // Negative = before event, positive = after
  defaultTime: string;           // HH:MM format
  targetStatus?: 'pending' | 'confirmed';
};

// Default schedules for wedding events
// These are created automatically when a new wedding event is created
export const WEDDING_DEFAULT_SCHEDULES: DefaultScheduleConfig[] = [
  {
    templateId: 'a68d0f3c-cd30-4fe7-a515-60011e0e027c',
    actionType: 'initial_invitation',
    daysOffset: -90,
    defaultTime: '10:00',
    targetStatus: 'pending',
  },
  {
    templateId: '99adcc20-9e1b-4b6d-afe9-bd6b387a4cd9',
    actionType: 'confirmation',
    daysOffset: -14,
    defaultTime: '10:00',
    targetStatus: 'pending',
  },
  // Add more schedules as needed:
  // { templateId: 'uuid-2', actionType: 'event_reminder', daysOffset: -7, defaultTime: '10:00' },
  // { templateId: 'uuid-3', actionType: 'post_event', daysOffset: 1, defaultTime: '10:00' },
];

// Map of event types to their default schedules
export const DEFAULT_SCHEDULES_BY_EVENT_TYPE: Record<
  string,
  DefaultScheduleConfig[]
> = {
  wedding: WEDDING_DEFAULT_SCHEDULES,
  // Other event types can be added here as needed
};
