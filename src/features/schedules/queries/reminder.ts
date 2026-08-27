import { createServiceClient } from '@/lib/supabase/service';
import {
  buildEventTitleParts,
  readEventTypeKey,
  readHostNames,
  EventTypeKeySchema,
} from '@/features/events';

/**
 * Loads the little an event reminder page needs, keyed by the event's public
 * short code.
 *
 * Unauthenticated and service-role, exactly like /nav/[code]: a guest holding
 * the link has no session, and RLS scopes events to their owner. The defence
 * here is the column list - never `select('*')` - so a public page cannot leak
 * user_id, budget, guest counts, or anything else on the row.
 */
export type ReminderPageEvent = {
  /** The "החתונה של" frame, printed above the names. Absent on an event whose
   *  type never resolved, where `title` carries the whole sentence instead. */
  titlePrefix: string | null;
  /** The host names on their own, so the page can set them apart. Falls back
   *  to the stored title when there is no type to frame them with. */
  hosts: string[];
  title: string;
  eventDate: string | null;
  receptionTime: string | null;
  location: { name?: string; coords?: { lat: number; lng: number } } | null;
  paybox: { link: string } | null;
  bit: { link: string } | null;
};

export async function getReminderPageEvent(
  code: string,
): Promise<ReminderPageEvent | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select(
      'title, location, event_settings, event_date, reception_time, host_details, event_types (key)',
    )
    .eq('short_code', code)
    .single();

  if (error || !data) return null;

  const settings = data.event_settings as {
    paybox_config?: { enabled: boolean; link: string };
    // `link` is optional: legacy rows configured before Bit moved from a phone
    // number to a link have `phoneNumber` and no `link`. Such a row must read
    // as "not configured", never crash - hence the optional chaining below.
    bit_config?: { enabled: boolean; link?: string };
  } | null;

  const paybox = settings?.paybox_config;
  const bit = settings?.bit_config;

  // The stored title already reads "החתונה של דניאל ונועה"; the page wants the
  // frame and the names apart. Splitting it back out of `host_details` rather
  // than parsing the string keeps the two agreeing with each other.
  const eventType = EventTypeKeySchema.safeParse(
    readEventTypeKey(data.event_types),
  );
  const parts = eventType.success
    ? buildEventTitleParts(
        eventType.data,
        readHostNames(data.host_details as Record<string, unknown> | undefined),
      )
    : null;

  return {
    titlePrefix: parts?.hosts.length ? parts.prefix : null,
    hosts: parts?.hosts.length ? parts.hosts : [data.title],
    title: data.title,
    eventDate: data.event_date,
    receptionTime: data.reception_time,
    location: data.location,
    // A provider shows up only when it is both enabled and configured - the
    // toggle and its value are separate fields, and a button pointing at an
    // empty link is worse than no button.
    paybox: paybox?.enabled && paybox.link.trim() ? { link: paybox.link } : null,
    bit: bit?.enabled && bit.link?.trim() ? { link: bit.link } : null,
  };
}
