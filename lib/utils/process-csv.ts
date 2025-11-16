/**
 * Processes CSV files from Supabase storage to create guest records
 * Reads CSV file from storage, parses it, and transforms rows into guest data
 */

import { createClient } from '@/utils/supabase/server';
import { type GuestUpsert } from '@/lib/schemas/guest.schema';

export interface ProcessCSVResult {
  success: boolean;
  message: string;
  guests?: GuestUpsert[];
  errors?: Array<{ row: number; message: string }>;
}

/**
 * Simple CSV parser that handles quoted fields
 * @param line - CSV line to parse
 * @param separator - Field separator (comma or semicolon)
 * @returns Array of field values
 */
function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      // Field separator found
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  // Add the last field
  result.push(current.trim());

  return result;
}

/**
 * Normalizes header names to handle variations
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().replace(/\s+/g, '_');
  if (
    normalized === 'phone_number' ||
    normalized === 'phonenumber' ||
    normalized === 'phone'
  ) {
    return 'phone_number';
  }
  if (
    normalized === 'rsvpstatus' ||
    normalized === 'rsvp_status' ||
    normalized === 'status'
  ) {
    return 'status';
  }
  return normalized;
}

/**
 * Maps CSV status values to guest rsvpStatus values
 */
function mapStatusToRSVPStatus(
  status: string,
): 'confirmed' | 'pending' | 'declined' {
  const normalized = status.toLowerCase().trim();
  if (
    normalized === 'approved' ||
    normalized === 'confirmed' ||
    normalized === 'accept'
  ) {
    return 'confirmed';
  }
  if (
    normalized === 'declined' ||
    normalized === 'reject' ||
    normalized === 'rejected'
  ) {
    return 'declined';
  }
  return 'pending';
}

/**
 * Processes CSV file from Supabase storage and converts rows to guest data
 * @param filePath - Path to the CSV file in Supabase storage
 * @returns Process result with guest data or errors
 */
export async function processCSVFromStorage(
  filePath: string,
): Promise<ProcessCSVResult> {
  try {
    const supabase = await createClient();

    // Download the CSV file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('guests')
      .download(filePath);

    if (downloadError) {
      return {
        success: false,
        message: `Failed to download CSV file: ${downloadError.message}`,
      };
    }

    if (!fileData) {
      return {
        success: false,
        message: 'CSV file not found in storage',
      };
    }

    // Read file content as text
    const text = await fileData.text();

    // Check if file is empty
    if (!text.trim()) {
      return {
        success: false,
        message: 'CSV file is empty',
      };
    }

    // Split into lines and filter out empty lines
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Check if file has at least a header row
    if (lines.length < 1) {
      return {
        success: false,
        message: 'CSV file must have at least a header row',
      };
    }

    // Parse header row
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';

    const headers = parseCSVLine(headerLine, separator)
      .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase())
      .filter((h) => h.length > 0);

    const normalizedHeaders = headers.map(normalizeHeader);

    // Check for required columns
    const requiredHeaders = ['name', 'phone_number', 'amount'];
    const missingHeaders = requiredHeaders.filter(
      (h) => !normalizedHeaders.includes(h.toLowerCase()),
    );

    if (missingHeaders.length > 0) {
      return {
        success: false,
        message: `Missing required columns: ${missingHeaders.join(', ')}`,
      };
    }

    // Check if there's at least one data row
    if (lines.length < 2) {
      return {
        success: false,
        message: 'CSV file must have at least one data row',
      };
    }

    // Find column indices
    const findColumnIndex = (columnName: string): number => {
      const normalized = normalizeHeader(columnName);
      return normalizedHeaders.indexOf(normalized);
    };

    const nameIndex = findColumnIndex('name');
    const phoneIndex = findColumnIndex('phone_number');
    const amountIndex = findColumnIndex('amount');
    const guestGroupIndex = findColumnIndex('guest_group');
    const statusIndex = findColumnIndex('rsvp_status');

    // Process data rows
    const guests: GuestUpsert[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    const dataRows = lines.slice(1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because we start from line 2 (after header) and 1-indexed
      const values = parseCSVLine(row, separator).map((v) =>
        v.replace(/^"|"$/g, '').trim(),
      );

      // Check if row has minimum required columns
      if (values.length < headers.length) {
        errors.push({
          row: rowNumber,
          message: `Insufficient columns. Expected ${headers.length}, found ${values.length}`,
        });
        continue;
      }

      // Extract values
      const name = nameIndex >= 0 ? values[nameIndex] : '';
      const phone = phoneIndex >= 0 ? values[phoneIndex] : '';
      const amountStr = amountIndex >= 0 ? values[amountIndex] : '';
      const guestGroupRaw = guestGroupIndex >= 0 ? values[guestGroupIndex] : '';
      const guestGroup = guestGroupRaw && guestGroupRaw.trim() !== '' ? guestGroupRaw.trim() : undefined;
      const statusStr = statusIndex >= 0 ? values[statusIndex] : '';

      // Validate name
      if (!name || name.length === 0) {
        errors.push({
          row: rowNumber,
          message: 'Name is required and cannot be empty',
        });
        continue;
      }

      if (name.length > 100) {
        errors.push({
          row: rowNumber,
          message: 'Name must be less than 100 characters',
        });
        continue;
      }

      // Validate phone
      if (!phone || phone.length === 0) {
        errors.push({
          row: rowNumber,
          message: 'Phone number is required and cannot be empty',
        });
        continue;
      }

      // Validate amount
      if (!amountStr || amountStr.length === 0) {
        errors.push({
          row: rowNumber,
          message: 'Amount is required and cannot be empty',
        });
        continue;
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        errors.push({
          row: rowNumber,
          message: `Amount must be a valid number, got: "${amountStr}"`,
        });
        continue;
      }

      if (amount < 1) {
        errors.push({
          row: rowNumber,
          message: `Amount must be at least 1, got: ${amount}`,
        });
        continue;
      }

      // Map status to rsvpStatus
      const rsvpStatus = statusStr
        ? mapStatusToRSVPStatus(statusStr)
        : 'pending';

      // Create guest data object
      // Note: group is required by GuestData schema, so we'll use a default or extract from CSV if available
      const guestData: GuestUpsert = {
        name,
        phone,
        guestGroup,
        rsvpStatus,
        amount: Math.floor(amount),
        notes: undefined,
      };

      guests.push(guestData);
    }

    if (errors.length > 0 && guests.length === 0) {
      return {
        success: false,
        message: 'No valid guests found in CSV file',
        errors,
      };
    }

    const successMessage =
      errors.length > 0
        ? `Processed ${guests.length} guests with ${errors.length} error(s)`
        : `Successfully processed ${guests.length} guests`;

    return {
      success: true,
      message: successMessage,
      guests,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('CSV processing error:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to process CSV file. Please check the file format.',
    };
  }
}
