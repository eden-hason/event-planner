import {
  validateCsvRows,
  validateGuestData,
  normalizePhone,
  type ValidatedRowData,
  type FieldErrors,
  type ColumnMapping,
} from '@/features/guests/utils/import-guests';
import type { GroupApp } from '@/features/guests/schemas';

export type RowEdit = Partial<{
  name: string;
  phone: string;
  amount: number;
  side: 'bride' | 'groom' | null;
  group: string;
}>;

export type RowEditsMap = Map<number, RowEdit>;

export interface MergedRow {
  rowIndex: number;
  data: ValidatedRowData;
  isValid: boolean;
  fieldErrors: FieldErrors;
  errors: string[];
}

/**
 * Merges parsed rows with in-progress edits and re-validates every row
 * against a phone set built from the *merged* data, not the original file -
 * so an edit on row B that now collides with untouched row A (or vice versa)
 * is caught in both directions, matching the desktop dialog's memo.
 */
export function computeMergedRows(
  rows: string[][],
  columnMapping: ColumnMapping,
  existingPhones: Map<string, string> | undefined,
  rowEdits: RowEditsMap,
  excludedRows: Set<number>,
): MergedRow[] {
  const baseRows = validateCsvRows(rows, columnMapping, existingPhones);

  const mergedData = new Map<number, ValidatedRowData>();
  const allPhones = new Set<string>();
  for (const row of baseRows) {
    const edits = rowEdits.get(row.rowIndex);
    const merged: ValidatedRowData = edits ? { ...row.data, ...edits } : row.data;
    mergedData.set(row.rowIndex, merged);
    if (merged.phone && !excludedRows.has(row.rowIndex)) {
      allPhones.add(normalizePhone(merged.phone));
    }
  }

  return baseRows.map((row) => {
    const merged = mergedData.get(row.rowIndex)!;
    const otherPhones = new Set(allPhones);
    if (merged.phone) otherPhones.delete(normalizePhone(merged.phone));

    const { isValid, fieldErrors, errors } = validateGuestData(
      {
        name: merged.name,
        phone: merged.phone,
        amount: merged.amount,
        side: merged.side ?? undefined,
        group: merged.group,
      },
      existingPhones,
      otherPhones,
    );

    return { rowIndex: row.rowIndex, data: merged, isValid, fieldErrors, errors };
  });
}

/** True when no existing group matches this name+side - import would create one. */
export function isNewGroup(
  groups: GroupApp[],
  name: string | undefined,
  side: 'bride' | 'groom' | null | undefined,
): boolean {
  if (!name) return false;
  const key = name.trim().toLowerCase();
  const normalizedSide = side ?? null;
  return !groups.some(
    (g) => g.name.trim().toLowerCase() === key && (g.side ?? null) === normalizedSide,
  );
}
