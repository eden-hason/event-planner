import { type MessageType } from '../schemas';

// Keep MESSAGE_TYPES for UI categorization
export const MESSAGE_TYPES = [
  'initial_invitation',
  'first_confirmation',
  'second_confirmation',
  'event_reminder',
  'thank_you',
] as const;

export type DefaultScheduleConfig = {
  templateId: string;           // UUID reference to whatsapp_templates
  messageType: MessageType;      // UI category (not stored in DB)
  daysOffset: number;            // Negative = before event, positive = after
  defaultTime: string;           // HH:MM format
};

// Default schedules for wedding events
// These are created automatically when a new wedding event is created
export const WEDDING_DEFAULT_SCHEDULES: DefaultScheduleConfig[] = [
  {
    templateId: 'a68d0f3c-cd30-4fe7-a515-60011e0e027c',
    messageType: 'initial_invitation',
    daysOffset: -90,
    defaultTime: '10:00',
  },
  {
    templateId: '99adcc20-9e1b-4b6d-afe9-bd6b387a4cd9',
    messageType: 'confirmation_casual_v1_he',
    daysOffset: -14,
    defaultTime: '10:00',
  },
  // Add more schedules as needed:
  // { templateId: 'uuid-2', messageType: 'first_confirmation', daysOffset: -45, defaultTime: '10:00' },
  // { templateId: 'uuid-3', messageType: 'event_reminder', daysOffset: -7, defaultTime: '10:00' },
];

// Map of event types to their default schedules
export const DEFAULT_SCHEDULES_BY_EVENT_TYPE: Record<
  string,
  DefaultScheduleConfig[]
> = {
  wedding: WEDDING_DEFAULT_SCHEDULES,
  // Other event types can be added here as needed
};

// Mapping from template ID to message type for UI categorization
export const TEMPLATE_TO_MESSAGE_TYPE: Record<string, MessageType> = {
  'a68d0f3c-cd30-4fe7-a515-60011e0e027c': 'initial_invitation',
  // Add mappings for other templates as they're added
};

// Helper function to get message type from template ID
export function getMessageTypeForTemplate(templateId: string): MessageType | null {
  return TEMPLATE_TO_MESSAGE_TYPE[templateId] ?? null;
}
