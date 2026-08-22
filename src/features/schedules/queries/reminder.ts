import { createServiceClient } from '@/lib/supabase/service';

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
  title: string;
  location: { name?: string; coords?: { lat: number; lng: number } } | null;
  paybox: { link: string } | null;
  bit: { phoneNumber: string } | null;
};

export async function getReminderPageEvent(
  code: string,
): Promise<ReminderPageEvent | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select('title, location, event_settings')
    .eq('short_code', code)
    .single();

  if (error || !data) return null;

  const settings = data.event_settings as {
    paybox_config?: { enabled: boolean; link: string };
    bit_config?: { enabled: boolean; phoneNumber: string };
  } | null;

  const paybox = settings?.paybox_config;
  const bit = settings?.bit_config;

  return {
    title: data.title,
    location: data.location,
    // A provider shows up only when it is both enabled and configured - the
    // toggle and its value are separate fields, and a button pointing at an
    // empty link is worse than no button.
    paybox: paybox?.enabled && paybox.link.trim() ? { link: paybox.link } : null,
    bit:
      bit?.enabled && bit.phoneNumber.trim()
        ? { phoneNumber: bit.phoneNumber }
        : null,
  };
}
