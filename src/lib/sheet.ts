/**
 * Client-side spreadsheet download, shared by every export that hands the Owner
 * an .xlsx: the budget's Gifts and Expenses tabs and the Guests page's reports.
 * Callers build plain rows (pure, testable); only `downloadSheet` touches
 * `xlsx` and the DOM.
 */

export type SheetCell = string | number;
export type SheetRow = SheetCell[];

/** Strips characters that are not allowed in file names on Windows or macOS. */
export function toFileName(...parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => part?.replace(/[\\/:*?"<>|]/g, '').trim())
    .filter(Boolean)
    .join(' - ');
}

interface DownloadSheetOptions {
  fileName: string;
  sheetName: string;
  rtl?: boolean;
  /** A line above the table, merged across its columns and left out of the column widths. */
  heading?: string;
}

export async function downloadSheet(
  rows: SheetRow[],
  { fileName, sheetName, rtl = false, heading }: DownloadSheetOptions,
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const ws = utils.aoa_to_sheet(heading ? [[heading], [], ...rows] : rows);
  // Size each column to its longest value so nothing opens truncated
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 10, String(cell).length + 2);
    });
  }
  ws['!cols'] = widths.map((wch) => ({ wch: Math.min(wch, 60) }));
  if (heading) {
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(widths.length - 1, 0) } }];
  }

  const wb = utils.book_new();
  // Excel sheet names are capped at 31 characters
  utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  if (rtl) wb.Workbook = { Views: [{ RTL: true }] };

  writeFile(wb, `${fileName}.xlsx`);
}
