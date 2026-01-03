/**
 * Client-side CSV parsing utility using PapaParse
 */

import Papa from 'papaparse';

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/**
 * Gets sample data for a specific column from parsed CSV rows.
 * Returns the first non-empty value found in the first few rows.
 *
 * @param rows - The parsed CSV rows
 * @param columnIndex - The column index to get sample data for
 * @param maxRowsToCheck - Maximum number of rows to check (default: 5)
 * @returns The first non-empty value found, or empty string if none found
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

/**
 * Parses a CSV file and returns headers and rows using PapaParse.
 * Handles quoted fields, different delimiters, and edge cases automatically.
 */
export async function parseCSVFile(file: File): Promise<ParsedCSV> {
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

        // Trim all values
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
