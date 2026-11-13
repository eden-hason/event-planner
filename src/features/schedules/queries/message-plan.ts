import { getEffectiveClient } from '@/lib/supabase/admin';

import { MAPPED_EVENT_COLUMNS, mapEventRow, type MappedEvent } from '../services/map-event-row';
import { loadTableNumbers, type TableNumber } from '../services/table-numbers';

export type MessagePlanPageData = {
  /** The Event exactly as the send maps it, so the preview is the message that goes out. */
  event: MappedEvent;
  /** The Event's preview token: the RSVP link a Test Message carries, and the preview shows. */
  previewToken: string | null;
  /** The Event's tables by id, for the Guests' table numbers. */
  tables: Map<string, TableNumber>;
};

/**
 * What the schedules page needs beyond its own reads for an Event on the
 * current Message Plan: the Event as the send maps it, and its tables. Read
 * only for that plan, so the Classic page costs nothing more.
 * RLS-bound, like the rest of the page.
 */
export async function getMessagePlanPageData(
  eventId: string,
): Promise<MessagePlanPageData | null> {
  const { supabase } = await getEffectiveClient();
  const [eventResult, tables] = await Promise.all([
    supabase
      .from('events')
      .select(`${MAPPED_EVENT_COLUMNS}, preview_token`)
      .eq('id', eventId)
      .single(),
    loadTableNumbers(supabase, eventId).catch((error) => {
      // Without tables the preview shows every Guest unseated, which is better than no page.
      console.error('Error fetching tables for the Message Plan preview:', error);
      return new Map<string, TableNumber>();
    }),
  ]);

  if (eventResult.error || !eventResult.data) {
    console.error('Error fetching the Message Plan event:', eventResult.error);
    return null;
  }

  const raw = eventResult.data as unknown as Record<string, unknown>;
  return {
    event: mapEventRow(raw),
    previewToken: (raw.preview_token as string | null) ?? null,
    tables,
  };
}
