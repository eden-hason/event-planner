import { getEffectiveClient } from '@/lib/supabase/admin';
import { TableDbToAppTransformerSchema, type TableApp } from '../schemas';
import { getEventGuestsWithGroups } from '@/features/guests/queries';
import type {
  SeatingPageData,
  SeatingStatsView,
  TableOption,
  TableWithGuestsApp,
} from '../types';

export const getEventTables = async (eventId: string): Promise<TableApp[]> => {
  try {
    const { supabase } = await getEffectiveClient();
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tables for event:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const tables: TableApp[] = [];
    for (const row of data) {
      try {
        tables.push(TableDbToAppTransformerSchema.parse(row));
      } catch (err) {
        console.error('Failed to parse table row:', err, row);
      }
    }
    return tables;
  } catch (error) {
    console.error('Error fetching tables for event:', error);
    return [];
  }
};

/**
 * Every table on an event with its seated head count, ordered by table number.
 *
 * Feeds the table picker on the guests page. Deliberately lighter than
 * getSeatingPageData: it aggregates guests.amount instead of returning guest
 * rows, because the picker only ever renders "seated / capacity".
 */
export const getEventTableOptions = async (
  eventId: string,
): Promise<TableOption[]> => {
  try {
    const { supabase } = await getEffectiveClient();
    const [tablesResult, guestsResult] = await Promise.all([
      supabase
        .from('tables')
        .select('id, table_number, label, capacity')
        .eq('event_id', eventId)
        .order('table_number', { ascending: true }),
      supabase
        .from('guests')
        .select('table_id, amount')
        .eq('event_id', eventId)
        .not('table_id', 'is', null),
    ]);

    if (tablesResult.error) {
      console.error('Error fetching table options:', tablesResult.error);
      return [];
    }
    if (guestsResult.error) {
      console.error('Error fetching seated head counts:', guestsResult.error);
    }

    const headCountByTable = new Map<string, number>();
    for (const row of guestsResult.data ?? []) {
      const tableId = row.table_id as string | null;
      if (!tableId) continue;
      const amount = (row.amount as number | null) ?? 1;
      headCountByTable.set(tableId, (headCountByTable.get(tableId) ?? 0) + amount);
    }

    return (tablesResult.data ?? []).map((row) => ({
      id: row.id as string,
      tableNumber: row.table_number as number,
      label: (row.label as string | null) ?? null,
      capacity: row.capacity as number,
      seatedHeadCount: headCountByTable.get(row.id as string) ?? 0,
    }));
  } catch (error) {
    console.error('Error fetching table options:', error);
    return [];
  }
};

export const getSeatingPageData = async (
  eventId: string,
): Promise<SeatingPageData> => {
  const [tables, guests] = await Promise.all([
    getEventTables(eventId),
    getEventGuestsWithGroups(eventId),
  ]);

  const guestsByTable = new Map<string, typeof guests>();
  let seatedGuestCount = 0;
  let seatedHeadCount = 0;
  let totalHeadCount = 0;
  const unassignedGuests: typeof guests = [];

  for (const guest of guests) {
    totalHeadCount += guest.amount;
    if (guest.tableId) {
      const bucket = guestsByTable.get(guest.tableId) ?? [];
      bucket.push(guest);
      guestsByTable.set(guest.tableId, bucket);
      seatedGuestCount += 1;
      seatedHeadCount += guest.amount;
    } else {
      unassignedGuests.push(guest);
    }
  }

  const tablesWithGuests: TableWithGuestsApp[] = tables.map((t) => ({
    ...t,
    guests: guestsByTable.get(t.id) ?? [],
  }));

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const fullTables = tablesWithGuests.filter(
    (t) => t.guests.reduce((s, g) => s + g.amount, 0) >= t.capacity && t.capacity > 0,
  ).length;

  const stats: SeatingStatsView = {
    totalGuests: guests.length,
    totalHeadCount,
    seatedGuestCount,
    seatedHeadCount,
    totalCapacity,
    totalTables: tables.length,
    fullTables,
  };

  return {
    tables: tablesWithGuests,
    guests,
    unassignedGuests,
    stats,
  };
};
