import { getEffectiveClient } from '@/lib/supabase/admin';

import { MAPPED_EVENT_COLUMNS, mapEventRow, type MappedEvent } from '../services/map-event-row';

export type MessagePlanPageData = {
  /** The Event exactly as the send maps it, so the preview is the message that goes out. */
  event: MappedEvent;
  /** The Event's preview token: the RSVP link a Test Message carries, and the preview shows. */
  previewToken: string | null;
  /** The Event's tables by id, for the Guests' table numbers. */
  tables: Map<string, { tableNumber: number; label: string | null }>;
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
  const [eventResult, tablesResult] = await Promise.all([
    supabase
      .from('events')
      .select(`${MAPPED_EVENT_COLUMNS}, preview_token`)
      .eq('id', eventId)
      .single(),
    supabase.from('tables').select('id, table_number, label').eq('event_id', eventId),
  ]);

  if (eventResult.error || !eventResult.data) {
    console.error('Error fetching the Message Plan event:', eventResult.error);
    return null;
  }
  if (tablesResult.error) {
    console.error('Error fetching tables for the Message Plan preview:', tablesResult.error);
  }

  const raw = eventResult.data as unknown as Record<string, unknown>;
  const tables = new Map<string, { tableNumber: number; label: string | null }>();
  for (const row of tablesResult.data ?? []) {
    tables.set(row.id, { tableNumber: row.table_number, label: row.label });
  }

  return {
    event: mapEventRow(raw),
    previewToken: (raw.preview_token as string | null) ?? null,
    tables,
  };
}
