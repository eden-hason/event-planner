import { type ActionType } from '../schemas';

export type DefaultScheduleConfig = {
  templateKey: string; // Key referencing local config in WHATSAPP_TEMPLATES
  actionType: ActionType; // Stored directly in DB
  daysOffset: number; // Negative = before event, positive = after
  defaultTime: string; // HH:MM format
  targetStatus?: 'pending' | 'confirmed';
};

// Default schedules for wedding events
// These are created automatically when a new wedding event is created
export const WEDDING_DEFAULT_SCHEDULES: DefaultScheduleConfig[] = [
  {
    templateKey: 'invitation_casual',
    actionType: 'initial_invitation',
    daysOffset: -30,
    defaultTime: '10:00',
    targetStatus: 'pending',
  },
  {
    templateKey: 'confirmation_casual_v1_he',
    actionType: 'confirmation',
    daysOffset: -21,
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
  {
    templateKey: 'confirmation_casual_v1_he',
    actionType: 'confirmation',
    daysOffset: -10,
    defaultTime: '10:00',
    targetStatus: 'pending',
  },
  {
    templateKey: 'event_reminder_v1_he',
    actionType: 'event_reminder',
    daysOffset: 0,
    defaultTime: '10:00',
    targetStatus: 'confirmed',
  },
  {
    templateKey: 'thank_you_v1_he',
    actionType: 'post_event',
    daysOffset: 1,
    defaultTime: '10:00',
    targetStatus: 'confirmed',
  },
];

// Map of event types to their default schedules
export const DEFAULT_SCHEDULES_BY_EVENT_TYPE: Record<
  string,
  DefaultScheduleConfig[]
> = {
  wedding: WEDDING_DEFAULT_SCHEDULES,
  // Other event types can be added here as needed
};
