/**
 * Client-side utility to export guests to the iPlan seating-planning format.
 *
 * iPlan template requirements:
 * - File format: legacy .xls
 * - Row 1: reserved header (blank)
 * - Row 2: column titles
 * - Row 3+: guest data
 * - Column order: name → guests amount → side → group → phone → table number
 *
 * The table number is appended after the template's own columns so the leading
 * five stay exactly where iPlan expects them. It carries whatever seating
 * assignment the guest already has; unseated guests export a blank cell.
 */

import type { GuestWithGroupApp } from '@/features/guests/schemas';
import type { TableOption } from '@/features/seating';

const SIDE_HE: Record<string, string> = {
  bride: 'כלה',
  groom: 'חתן',
};

export const IPLAN_COLUMN_HEADERS = [
  'שם',
  'כמות אורחים',
  'צד',
  'קבוצה',
  'טלפון',
  'מספר שולחן',
];

export type IplanScope = 'confirmed' | 'confirmedPending' | 'all';

interface ExportIplanOptions {
  scope: IplanScope;
  /** Download filename (defaults to 'iplan-guests.xls'). */
  fileName?: string;
  /** Seating tables, used to resolve each guest's `tableId` to its number. */
  tables?: Pick<TableOption, 'id' | 'tableNumber'>[];
}

export async function exportGuestsToIplan(
  guests: GuestWithGroupApp[],
  opts: ExportIplanOptions,
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const filtered = guests.filter((g) => {
    if (opts.scope === 'all') return true;
    if (opts.scope === 'confirmed') return g.rsvpStatus === 'confirmed';
    return g.rsvpStatus === 'confirmed' || g.rsvpStatus === 'pending';
  });

  const tableNumberById = new Map(
    (opts.tables ?? []).map((table) => [table.id, table.tableNumber]),
  );

  // Column order: name, guests amount, side, group, phone, table number
  const dataRows = filtered.map((g) => [
    g.name,
    g.amount ?? 1,
    g.side ? (SIDE_HE[g.side] ?? '') : 'חתן,כלה',
    g.group?.name ?? '',
    g.phone ?? '',
    (g.tableId ? tableNumberById.get(g.tableId) : undefined) ?? '',
  ]);

  // Row 1: reserved/blank, Row 2: column titles, Row 3+: data
  const aoa = [
    [],
    IPLAN_COLUMN_HEADERS,
    ...dataRows,
  ];

  const ws = utils.aoa_to_sheet(aoa);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Guests');
  writeFile(wb, opts.fileName ?? 'iplan-guests.xls', { bookType: 'xls' });
}
