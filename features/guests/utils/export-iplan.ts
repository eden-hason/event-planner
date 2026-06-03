/**
 * Client-side utility to export guests to the iPlan seating-planning format.
 *
 * iPlan template requirements:
 * - File format: legacy .xls
 * - Row 1: reserved header (blank)
 * - Row 2: column titles
 * - Row 3+: guest data
 * - Column order: name → guests amount → side → group → phone
 */

import type { GuestWithGroupApp } from '@/features/guests/schemas';

const SIDE_HE: Record<string, string> = {
  bride: 'כלה',
  groom: 'חתן',
};

export const IPLAN_COLUMN_HEADERS = ['שם', 'כמות אורחים', 'צד', 'קבוצה', 'טלפון'];

export type IplanScope = 'confirmed' | 'confirmedPending' | 'all';

interface ExportIplanOptions {
  scope: IplanScope;
  /** Download filename (defaults to 'iplan-guests.xls'). */
  fileName?: string;
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

  // Column order: name, guests amount, side, group, phone
  const dataRows = filtered.map((g) => [
    g.name,
    g.amount ?? 1,
    g.side ? (SIDE_HE[g.side] ?? '') : 'חתן,כלה',
    g.group?.name ?? '',
    g.phone ?? '',
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
