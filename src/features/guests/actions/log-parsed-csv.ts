'use server';

// TEMPORARY: audit-only logging of the full parsed CSV for a customer support
// case. Logs guest PII to the server console - remove this file (and the call
// in import-guests-dialog.tsx) once the audit is done, and purge the captured
// logs. Replace with something more robust if this needs to stick around.

import { type ParsedCSV } from '@/features/guests/utils/parse-csv';

export async function logParsedCsv(parsed: ParsedCSV): Promise<void> {
  console.log(
    `[logParsedCsv] ${parsed.rows.length} rows, ${parsed.headers.length} columns`,
  );
  console.log('[logParsedCsv] data:', JSON.stringify(parsed, null, 2));
}
