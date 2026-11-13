import { createClient } from '@/lib/supabase/server';

/**
 * The gift switch of each message on an Event on the current Message Plan,
 * read off its Event Reminder and Thank You (schedules.gift_button, ADR 0053).
 * Server-only; not exported from the feature barrel.
 */
export async function getScheduleGiftButtons(
  eventId: string,
): Promise<Partial<Record<string, boolean>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('gift_button, dispatched_at, schedule_types!inner (key)')
    .eq('event_id', eventId)
    .in('schedule_types.key', ['event_reminder', 'post_event']);
  if (error) {
    console.error('getScheduleGiftButtons:', error);
    return {};
  }
  const buttons: Partial<Record<string, boolean>> = {};
  for (const row of data ?? []) {
    const type = row.schedule_types as unknown as { key: string } | { key: string }[] | null;
    const key = Array.isArray(type) ? type[0]?.key : type?.key;
    if (!key || typeof row.gift_button !== 'boolean') continue;
    // An unsent Schedule says what will go out; a sent one only fills in.
    if (row.dispatched_at === null || buttons[key] === undefined) buttons[key] = row.gift_button;
  }
  return buttons;
}
