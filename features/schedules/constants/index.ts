import { type ActionType } from '../schemas';

export type DefaultScheduleConfig = {
  templateKey: string;           // Key referencing local config in WHATSAPP_TEMPLATES
  actionType: ActionType;        // Stored directly in DB
  daysOffset: number;            // Negative = before event, positive = after
  defaultTime: string;           // HH:MM format
  targetStatus?: 'pending' | 'confirmed';
};

// Default schedules for wedding events
// These are created automatically when a new wedding event is created
export const WEDDING_DEFAULT_SCHEDULES: DefaultScheduleConfig[] = [
  {
    templateKey: 'initial_invitation',
    actionType: 'initial_invitation',
    daysOffset: -90,
    defaultTime: '10:00',
    targetStatus: 'pending',
  },
  {
    templateKey: 'confirmation_casual_v1_he',
    actionType: 'confirmation',
    daysOffset: -14,
    defaultTime: '10:00',
    targetStatus: 'pending',
  },
  // Add more schedules as needed:
  // { templateKey: 'event_reminder_v1', actionType: 'event_reminder', daysOffset: -7, defaultTime: '10:00' },
  // { templateKey: 'post_event_v1', actionType: 'post_event', daysOffset: 1, defaultTime: '10:00' },
];

// Map of event types to their default schedules
export const DEFAULT_SCHEDULES_BY_EVENT_TYPE: Record<
  string,
  DefaultScheduleConfig[]
> = {
  wedding: WEDDING_DEFAULT_SCHEDULES,
  // Other event types can be added here as needed
};
