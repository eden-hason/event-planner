import { type MessageType } from '../schemas';

export type DefaultScheduleConfig = {
  messageType: MessageType;
  daysOffset: number;
  defaultTime: string;
};

// Default schedules for wedding events
// These are created automatically when a new wedding event is created
// messageType values must match DB enum message_type
export const WEDDING_DEFAULT_SCHEDULES: DefaultScheduleConfig[] = [
  { messageType: 'initial_invitation', daysOffset: -90, defaultTime: '10:00' },
  { messageType: 'first_confirmation', daysOffset: -45, defaultTime: '10:00' },
  { messageType: 'event_reminder', daysOffset: -7, defaultTime: '10:00' },
  { messageType: 'second_confirmation', daysOffset: -3, defaultTime: '12:00' },
  { messageType: 'thank_you', daysOffset: 7, defaultTime: '10:00' },
];

// Map of event types to their default schedules
export const DEFAULT_SCHEDULES_BY_EVENT_TYPE: Record<
  string,
  DefaultScheduleConfig[]
> = {
  wedding: WEDDING_DEFAULT_SCHEDULES,
  // Other event types can be added here as needed
};
