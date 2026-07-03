export const EVENT_TYPES = ['wedding', 'henna', 'bar_mitzva', 'bat_mitzva'] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  henna: 'Henna',
  bar_mitzva: 'Bar Mitzva',
  bat_mitzva: 'Bat Mitzva',
};

export function getEventTypeLabel(value: string | undefined): string {
  if (!value) return '—';
  return EVENT_TYPE_LABELS[value as EventType] ?? value;
}
