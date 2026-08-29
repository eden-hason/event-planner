import { getEffectiveClient } from '@/lib/supabase/admin';
import { getEventGuestsWithGroups } from '@/features/guests/queries';
import { getCollaboratorRole } from '@/features/collaborate/queries';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import { TableDbToAppTransformerSchema, type TableApp } from '../schemas';
import type {
  SeatingPageData,
  TableOccupancy,
  TableOption,
  TableView,
} from '../types';
import {
  composeProgress,
  guestProgressCounts,
  splitHeads,
  type GuestProgressCounts,
} from '../utils/occupancy';

interface OccupancyRow {
  table_id: string;
  confirmed_heads: number;
  pending_heads: number;
  record_count: number;
  visible_record_count: number;
  visible_heads: number;
}

interface ProgressRow {
  confirmed_records_total: number;
  confirmed_records_seated: number;
  confirmed_heads_total: number;
  confirmed_heads_seated: number;
  pending_heads_unseated: number;
}

/**
 * Event-wide progress counts, computed by a privileged aggregate so a scoped
 * Seating Manager is measured against every confirmed Guest Record in the
 * Event - not just the ones RLS lets them read (ADR-0008). Returns null when
 * the aggregate is unavailable, so the caller can fall back to the visible set.
 */
const getGlobalProgressCounts = async (
  eventId: string,
): Promise<GuestProgressCounts | null> => {
  try {
    const { supabase } = await getEffectiveClient();
    const { data, error } = await supabase.rpc('event_seating_progress', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Error fetching seating progress:', error);
      return null;
    }

    const row = (Array.isArray(data) ? data[0] : data) as ProgressRow | undefined;
    if (!row) return null;

    return {
      confirmedRecordsTotal: row.confirmed_records_total,
      confirmedRecordsSeated: row.confirmed_records_seated,
      confirmedGuestsTotal: row.confirmed_heads_total,
      confirmedGuestsSeated: row.confirmed_heads_seated,
      pendingGuestsUnseated: row.pending_heads_unseated,
    };
  } catch (error) {
    console.error('Error fetching seating progress:', error);
    return null;
  }
};

/**
 * Tables are canonically ordered by ascending Table number on every list
 * surface (ADR-0008). Canvas coordinates never reorder them.
 */
export const getEventTables = async (eventId: string): Promise<TableApp[]> => {
  try {
    const { supabase } = await getEffectiveClient();
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('event_id', eventId)
      .order('table_number', { ascending: true });

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
        // One malformed row should not blank the whole Seating Plan.
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
 * Truthful per-Table occupancy, including assignments the caller may not
 * identify.
 *
 * Row Level Security hides out-of-scope Guest Records from any ordinary read,
 * so a scoped Seating Manager cannot derive real remaining capacity from what
 * they can select. ADR-0008 requires they see it anyway - as anonymized head
 * counts - so this goes through a privileged aggregate instead.
 */
const getOccupancyByTable = async (
  eventId: string,
): Promise<Map<string, TableOccupancy>> => {
  const byTable = new Map<string, TableOccupancy>();

  try {
    const { supabase } = await getEffectiveClient();
    const { data, error } = await supabase.rpc('event_table_occupancy', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Error fetching table occupancy:', error);
      return byTable;
    }

    for (const row of (data ?? []) as OccupancyRow[]) {
      byTable.set(row.table_id, {
        confirmedHeads: row.confirmed_heads,
        pendingHeads: row.pending_heads,
        records: row.record_count,
        visibleRecords: row.visible_record_count,
        visibleHeads: row.visible_heads,
      });
    }
  } catch (error) {
    console.error('Error fetching table occupancy:', error);
  }

  return byTable;
};

const emptyOccupancy = (): TableOccupancy => ({
  confirmedHeads: 0,
  pendingHeads: 0,
  records: 0,
  visibleRecords: 0,
  visibleHeads: 0,
});

/**
 * A Table reduced to what a picker needs, with the confirmed/provisional split
 * the Guest Directory shows before it lets anyone choose a destination.
 */
export const getEventTableOptions = async (
  eventId: string,
): Promise<TableOption[]> => {
  try {
    const { supabase } = await getEffectiveClient();

    const [{ data, error }, occupancy] = await Promise.all([
      supabase
        .from('tables')
        .select('id, table_number, label, capacity')
        .eq('event_id', eventId)
        .order('table_number', { ascending: true }),
      getOccupancyByTable(eventId),
    ]);

    if (error || !data) {
      if (error) console.error('Error fetching table options:', error);
      return [];
    }

    return data.map((row) => {
      const seated = occupancy.get(row.id) ?? emptyOccupancy();
      return {
        id: row.id,
        tableNumber: row.table_number,
        label: row.label,
        capacity: row.capacity,
        confirmedHeads: seated.confirmedHeads,
        pendingHeads: seated.pendingHeads,
      };
    });
  } catch (error) {
    console.error('Error fetching table options:', error);
    return [];
  }
};

export const getSeatingPageData = async (
  eventId: string,
): Promise<SeatingPageData & { isScopedCollaborator: boolean }> => {
  const [tables, guests, occupancy, collaborator, globalProgress] =
    await Promise.all([
      getEventTables(eventId),
      getEventGuestsWithGroups(eventId),
      getOccupancyByTable(eventId),
      getCollaboratorRole(eventId),
      getGlobalProgressCounts(eventId),
    ]);

  const isScopedCollaborator = collaborator?.role === 'seating_manager';

  // Declined records do not participate in the plan and reserve nothing.
  const participating = guests.filter((g) => g.rsvpStatus !== 'declined');

  const seatedByTable = new Map<string, GuestWithGroupApp[]>();
  for (const guest of participating) {
    if (!guest.tableId) continue;
    const bucket = seatedByTable.get(guest.tableId);
    if (bucket) bucket.push(guest);
    else seatedByTable.set(guest.tableId, [guest]);
  }

  const views: TableView[] = tables.map((table) => {
    const visible = seatedByTable.get(table.id) ?? [];

    // Fall back to what we can see only when the aggregate is unavailable;
    // a missing row means an empty Table, not an unknown one.
    const seated =
      occupancy.get(table.id) ??
      (() => {
        const { confirmedHeads, pendingHeads } = splitHeads(visible);
        return {
          confirmedHeads,
          pendingHeads,
          records: visible.length,
          visibleRecords: visible.length,
          visibleHeads: confirmedHeads + pendingHeads,
        };
      })();

    const heads = seated.confirmedHeads + seated.pendingHeads;
    const outOfScopeRecords = Math.max(seated.records - seated.visibleRecords, 0);

    return {
      table,
      guests: visible,
      occupancy: seated,
      seatedHeads: heads,
      freeSeats: Math.max(table.capacity - heads, 0),
      outOfScopeRecords,
      outOfScopeHeads: Math.max(heads - seated.visibleHeads, 0),
      // Deleting a Table with out-of-scope assignments would mutate Guest
      // Records the Seating Manager is not authorized to manage (ADR-0008).
      canDelete: !isScopedCollaborator || outOfScopeRecords === 0,
    };
  });

  const unassignedGuests = participating.filter((g) => !g.tableId);

  // The privileged aggregate is Event-wide; the visible set is the fallback when
  // it is unavailable. Table-derived figures (seated heads, capacity) are always
  // truthful because per-Table occupancy already includes out-of-scope heads.
  const progressCounts =
    globalProgress ?? guestProgressCounts(participating);

  return {
    tables: views,
    guests,
    unassignedGuests,
    progress: composeProgress(views, progressCounts),
    isScopedCollaborator,
  };
};
