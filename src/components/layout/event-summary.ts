import { readHostNames, type EventApp } from '@/features/events';
import { avatarTintFor } from '@/lib/avatar-tint';

/** The hosts an event is named after, in the order they are read out. */
export function eventHostNames(event: EventApp): string[] {
  const { brideName, groomName, childName } = readHostNames(event.hostDetails);

  return [brideName, groomName, childName].filter(
    (name): name is string => Boolean(name?.trim()),
  );
}

/**
 * "Noa & Daniel" for a couple, "Itay" for a mitzva, and the stored title for an
 * event whose names screen has not been answered yet.
 */
export function eventDisplayTitle(event: EventApp, locale: string): string {
  const hosts = eventHostNames(event);
  if (hosts.length === 0) return event.title;

  return new Intl.ListFormat(locale, {
    style: 'short',
    type: 'conjunction',
  }).format(hosts);
}

/**
 * Monogram for the event's avatar tile: one initial per host, so a couple reads
 * as two letters and a mitzva as one. Falls back to the title's first letter.
 */
export function eventInitials(event: EventApp): string {
  const hosts = eventHostNames(event);
  const source = hosts.length > 0 ? hosts : [event.title.trim()];

  return source
    .slice(0, 2)
    .map((name) => [...name.trim()][0] ?? '')
    .filter(Boolean)
    .join('&');
}

/**
 * Stable per event, so an event keeps the same colour between renders. The
 * active event always takes `--primary`, so these only have to look distinct
 * from each other.
 */
export function eventAvatarTint(eventId: string): string {
  return avatarTintFor(eventId);
}

/** "12.11.2026" in Hebrew, "12/11/2026" in English. */
export function formatEventDateShort(
  eventDate: string | null,
  locale: string,
): string | null {
  if (!eventDate) return null;

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(eventDate));
}
