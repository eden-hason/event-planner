export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'other'] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday Party',
  corporate: 'Corporate Event',
  other: 'Other',
};

export function getEventTypeLabel(value: string | undefined): string {
  if (!value) return '—';
  return EVENT_TYPE_LABELS[value as EventType] ?? value;
}
