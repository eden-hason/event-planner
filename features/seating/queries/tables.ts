import { createClient } from '@/lib/supabase/server';
import { TableDbToAppTransformerSchema, type TableApp } from '../schemas';
import { getEventGuestsWithGroups } from '@/features/guests/queries';
import type { SeatingPageData, SeatingStatsView, TableWithGuestsApp } from '../types';

export const getEventTables = async (eventId: string): Promise<TableApp[]> => {
  try {
    const supabase = await createClient();
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
