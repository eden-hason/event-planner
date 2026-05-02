/**
 * Client-side CSV/Excel parsing utility
 */

import Papa from 'papaparse';

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
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

  return { headers, rows };
}

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  if (isExcelFile(file)) {
    return parseExcelFile(file);
  }

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
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

        resolve({
          headers: trimmedHeaders,
          rows: trimmedRows,
        });
      },
      error: (error: Error) => {
        reject(new Error(error.message));
      },
    });
  });
}
