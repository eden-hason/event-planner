/**
 * Client-side CSV/Excel parsing utility
 */

import Papa from 'papaparse';

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

const SUMMARY_ROW_PATTERN = /^\s*(total|sum|סה[״"]כ|סך הכל|grand total|subtotal|count)\s*$/i;

function isSummaryRow(row: string[]): boolean {
  const nonEmpty = row.map((c) => c.trim()).filter((c) => c !== '');
  if (nonEmpty.length === 0) return false;
  // Require at least one explicit summary label, plus every other non-empty
  // cell being a label or a plain number. This avoids dropping a real guest
  // row that happens to have a missing name (phone + amount would otherwise
  // look like a summary).
  const hasLabel = nonEmpty.some((cell) => SUMMARY_ROW_PATTERN.test(cell));
  if (!hasLabel) return false;
  return nonEmpty.every(
    (cell) => SUMMARY_ROW_PATTERN.test(cell) || /^\d+$/.test(cell),
  );
}

/**
 * Gets sample data for a specific column from parsed CSV rows.
 * Returns the first non-empty value found in the first few rows.
 */
export function getSampleData(
  rows: string[][],
  columnIndex: number,
  maxRowsToCheck: number = 5,
): string {
  for (const row of rows.slice(0, maxRowsToCheck)) {
    const value = row[columnIndex]?.trim();
    if (value) {
      return value;
    }
  }
  return '';
}

export function isExcelFile(file: File): boolean {
  return (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls')
  );
}

async function parseExcelFile(file: File): Promise<ParsedCSV> {
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

  const nonEmptyRows = data.filter((row) => row.some((cell) => String(cell).trim() !== ''));

  if (nonEmptyRows.length === 0) {
    throw new Error('Excel file is empty');
  }

  const [headerRow, ...dataRows] = nonEmptyRows;

  if (!headerRow || headerRow.length === 0) {
    throw new Error('Excel file must have at least a header row');
  }

  const headers = headerRow.map((h) => String(h).trim());
  const rows = dataRows.map((row) => row.map((cell) => String(cell).trim()));
  const filteredRows = rows.filter((row, i) => i < rows.length - 1 || !isSummaryRow(row));

  return { headers, rows: filteredRows };
}

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  if (isExcelFile(file)) {
    return parseExcelFile(file);
  }

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (results: Papa.ParseResult<string[]>) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
          return;
        }

        const data = results.data;

        if (!data || data.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        const [headers, ...rows] = data;

        if (!headers || headers.length === 0) {
          reject(new Error('CSV file must have at least a header row'));
          return;
        }

        const trimmedHeaders = headers.map((h: string) => h.trim());
        const trimmedRows = rows.map((row: string[]) =>
          row.map((cell: string) => cell.trim()),
        );
        const filteredRows = trimmedRows.filter(
          (row, i) => i < trimmedRows.length - 1 || !isSummaryRow(row),
        );

        resolve({
          headers: trimmedHeaders,
          rows: filteredRows,
        });
      },
      error: (error: Error) => {
        reject(new Error(error.message));
      },
    });
  });
}
