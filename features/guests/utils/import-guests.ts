import { ImportGuestSchema, normalizeSide } from '../schemas';
import { type ColumnMapping } from '../components/groups/import-guests-dialog/map-step';

export type ImportField = 'name' | 'phone' | 'amount' | 'side' | 'group';

export type FieldErrors = Partial<Record<ImportField, string>>;

// Data shape for display (may be invalid)
export interface ValidatedRowData {
  name: string;
  phone?: string;
  amount: number;
  side?: 'bride' | 'groom' | null;
  group?: string;
}

export interface ValidatedRow {
  rowIndex: number;
  originalRow: string[];
  data: ValidatedRowData;
  isValid: boolean;
  errors: string[];
  fieldErrors: FieldErrors;
}

// Raw data before validation (may have missing/invalid fields)
type RawImportGuestData = {
  name: string;
  phone: string;
  amount: string | number;
  side?: string;
  group?: string;
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
    side: data.side,
    group: data.group,
  };
}

/**
 * Normalizes a phone number for comparison (removes formatting)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '');
}

/**
 * Attempts to auto-fix common phone formatting issues:
 * - Converts Hebrew/Arabic-Indic digits to ASCII
 * - Strips spaces, dashes, parens, dots
 * - Replaces leading +972 / 972 with 0
 * Returns null if the result is still not a valid IL mobile.
 */
export function autoFixPhone(raw: string): string | null {
  if (!raw) return null;

  // Convert Hebrew/Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩ and ۰-۹) to ASCII
  let fixed = raw.replace(/[٠-٩۰-۹]/g, (d) =>
    String(d.charCodeAt(0) & 0xf),
  );

  // Strip formatting characters
  fixed = fixed.replace(/[\s\-().+]/g, '');

  // Replace leading country codes: 972 → 0
  if (fixed.startsWith('972')) {
    fixed = '0' + fixed.slice(3);
  }

  // Validate with libphonenumber (reuse schema logic via ImportGuestSchema)
  const result = ImportGuestSchema.safeParse({ name: 'Test', phone: fixed, amount: 1 });
  if (result.success) return fixed;

  // Try adding leading 0 if starts with 5 (Israeli mobile shorthand)
  if (/^5\d{8}$/.test(fixed)) {
    const withZero = '0' + fixed;
    const result2 = ImportGuestSchema.safeParse({ name: 'Test', phone: withZero, amount: 1 });
    if (result2.success) return withZero;
  }

  return null;
}

/**
 * Validates guest data and returns per-field errors.
 * Used for inline editing re-validation.
 */
const IMPORT_FIELDS = new Set<ImportField>([
  'name',
  'phone',
  'amount',
  'side',
  'group',
]);

export function validateGuestData(
  data: {
    name: string;
    phone?: string;
    amount: number;
    side?: string | null;
    group?: string;
  },
  existingPhones?: Map<string, string> | Set<string>,
  otherCsvPhones?: Set<string>,
): { isValid: boolean; fieldErrors: FieldErrors; errors: string[] } {
  const fieldErrors: FieldErrors = {};
  const errors: string[] = [];

  const result = ImportGuestSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as ImportField | undefined;
      if (field && IMPORT_FIELDS.has(field)) {
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      } else {
        errors.push(issue.message);
      }
    }
  }

  // Duplicate phone checks (only if phone passes schema)
  if (data.phone && !fieldErrors.phone) {
    const normalized = normalizePhone(data.phone);
    if (existingPhones?.has(normalized)) {
      fieldErrors.phone = 'import.validate.errors.phoneExists';
    } else if (otherCsvPhones?.has(normalized)) {
      fieldErrors.phone = 'import.validate.errors.phoneDuplicateCsv';
    }
  }

  const isValid = Object.keys(fieldErrors).length === 0 && errors.length === 0;
  return { isValid, fieldErrors, errors };
}

/**
 * Validates a single CSV row and returns validation result
 */
export function validateCsvRow(
  row: string[],
  rowIndex: number,
  columnMapping: ColumnMapping,
  existingPhones?: Map<string, string> | Set<string>,
  csvPhonesSoFar?: Set<string>,
): ValidatedRow {
  const data = transformCsvRow(row, columnMapping);
  const fieldErrors: FieldErrors = {};
  const errors: string[] = [];

  // First, run schema validation
  const result = ImportGuestSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as ImportField | undefined;
      if (field && IMPORT_FIELDS.has(field)) {
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      } else {
        errors.push(issue.message);
      }
    }
  }

  // Check for duplicate phone in database (only if phone is valid)
  if (data.phone && !fieldErrors.phone) {
    const normalizedPhone = normalizePhone(data.phone);

    if (existingPhones?.has(normalizedPhone)) {
      fieldErrors.phone = 'import.validate.errors.phoneExists';
    }

    // Check for duplicate within the CSV file itself
    if (csvPhonesSoFar?.has(normalizedPhone)) {
      fieldErrors.phone = 'import.validate.errors.phoneDuplicateCsv';
    }
  }

  const allErrors = [
    ...Object.values(fieldErrors).filter(Boolean),
    ...errors,
  ] as string[];

  return {
    rowIndex,
    originalRow: row,
    data: result.success
      ? {
          name: result.data.name,
          phone: result.data.phone,
          amount: result.data.amount,
          side: result.data.side ?? null,
          group: result.data.group,
        }
      : {
          name: data.name,
          phone: data.phone || undefined,
          amount: Number(data.amount) || 1,
          side: normalizeSide(data.side),
          group: data.group,
        },
    isValid: allErrors.length === 0,
    errors: allErrors,
    fieldErrors,
  };
}

/**
 * Validates all CSV rows and returns validation results
 * @param existingPhones - Set of normalized phone numbers already in the database
 */
export function validateCsvRows(
  rows: string[][],
  columnMapping: ColumnMapping,
  existingPhones?: Map<string, string> | Set<string>,
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
