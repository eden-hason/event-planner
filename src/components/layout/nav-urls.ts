import type { ComponentProps } from 'react';
import type { Link } from '@/i18n/navigation';

/**
 * The href type `@/i18n/navigation`'s `Link` accepts. Nav URLs are built from
 * strings, so every builder here hands back a value already narrowed to it.
 */
export type NavHref = ComponentProps<typeof Link>['href'];

/** `/app/{eventId}/…` - null on the routes above an event, like `/app`. */
export function getEventIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Rewrites an event-less template path (`/app/guests`) onto the current event.
 *
 * Without an event id the template is returned as-is; callers disable the nav
 * entry in that case rather than linking to a route that cannot resolve.
 */
export function buildNavUrl(basePath: string, eventId: string | null): NavHref {
  const url = eventId ? basePath.replace(/^\/app\//, `/app/${eventId}/`) : basePath;
  return url as NavHref;
}
