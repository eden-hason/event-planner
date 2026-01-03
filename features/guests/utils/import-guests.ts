import { ImportGuestSchema } from '../schemas';
import { type ColumnMapping } from '../components/groups/import-guests-dialog/map-step';

// Data shape for display (may be invalid)
export interface ValidatedRowData {
  name: string;
  phone: string;
  amount: number;
}

export interface ValidatedRow {
  rowIndex: number;
  originalRow: string[];
  data: ValidatedRowData;
  isValid: boolean;
  errors: string[];
}

// Raw data before validation (may have missing/invalid fields)
type RawImportGuestData = {
  name: string;
  phone: string;
  amount: string | number;
};

/**
 * Transforms a CSV row into guest data based on column mapping
 */
export function transformCsvRow(
  row: string[],
  columnMapping: ColumnMapping,
): RawImportGuestData {
  const data: Record<string, string | undefined> = {};

  // Find which CSV column maps to each Kululu field
  Object.entries(columnMapping).forEach(([indexStr, field]) => {
    if (field) {
      const columnIndex = Number(indexStr);
      data[field] = row[columnIndex]?.trim() || undefined;
    }
  });

  return {
    name: data.name || '',
    phone: data.phone || '',
    amount: data.amount || 1,
  };
}

/**
 * Normalizes a phone number for comparison (removes formatting)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '');
}

/**
 * Validates a single CSV row and returns validation result
 */
export function validateCsvRow(
  row: string[],
  rowIndex: number,
  columnMapping: ColumnMapping,
  existingPhones?: Set<string>,
  csvPhonesSoFar?: Set<string>,
): ValidatedRow {
  const data = transformCsvRow(row, columnMapping);
  const errors: string[] = [];

  // First, run schema validation
  const result = ImportGuestSchema.safeParse(data);
  if (!result.success) {
    errors.push(...result.error.issues.map((e) => e.message));
  }

  // Check for duplicate phone in database (only if phone is valid)
  if (data.phone && errors.length === 0) {
    const normalizedPhone = normalizePhone(data.phone);

    if (existingPhones?.has(normalizedPhone)) {
      errors.push('Phone number already exists in your guest list');
    }

    // Check for duplicate within the CSV file itself
    if (csvPhonesSoFar?.has(normalizedPhone)) {
      errors.push('Duplicate phone number in CSV file');
    }
  }

  return {
    rowIndex,
    originalRow: row,
    data: result.success
      ? result.data
      : { ...data, amount: Number(data.amount) || 1 },
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates all CSV rows and returns validation results
 * @param existingPhones - Set of normalized phone numbers already in the database
 */
export function validateCsvRows(
  rows: string[][],
  columnMapping: ColumnMapping,
  existingPhones?: Set<string>,
): ValidatedRow[] {
  const csvPhonesSoFar = new Set<string>();
  const results: ValidatedRow[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const validatedRow = validateCsvRow(
      row,
      index,
      columnMapping,
      existingPhones,
      csvPhonesSoFar,
    );

    // Add this row's phone to the set for duplicate detection within CSV
    const data = transformCsvRow(row, columnMapping);
    if (data.phone) {
      csvPhonesSoFar.add(normalizePhone(data.phone));
    }

    results.push(validatedRow);
  }

  return results;
}
