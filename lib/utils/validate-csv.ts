/**
 * Validates CSV file content for guest imports
 * Checks for required columns and validates basic structure
 *
 * Expected CSV format:
 * - name: string (required)
 * - phone_number: string (required)
 * - amount: string (required, must be a valid number >= 1)
 * - status: string (optional, must be 'approved' | 'declined' | 'pending' if provided)
 */

export interface CSVValidationResult {
  isValid: boolean;
  error?: string;
  headers?: string[];
  rowCount?: number;
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
 * Validates CSV file content
 * @param file - The CSV file to validate
 * @returns Validation result with error message if invalid
 */
export async function validateCSVFile(
  file: File,
): Promise<CSVValidationResult> {
  try {
    // Read file content
    const text = await file.text();

    // Check if file is empty
    if (!text.trim()) {
      return {
        isValid: false,
        error: 'CSV file is empty',
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
        isValid: false,
        error: 'CSV file must have at least a header row',
      };
    }

    // Parse header row
    // Handle both comma and semicolon separators
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';

    const headers = parseCSVLine(headerLine, separator)
      .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase())
      .filter((h) => h.length > 0);

    // Check for required columns
    // Normalize headers to handle variations like "phone_number", "phone number", "phoneNumber"
    const normalizeHeader = (header: string): string => {
      const normalized = header.toLowerCase().replace(/\s+/g, '_');
      if (
        normalized === 'phone_number' ||
        normalized === 'phonenumber' ||
        normalized === 'phone'
      ) {
        return 'phone_number';
      }
      return normalized;
    };

    const normalizedHeaders = headers.map(normalizeHeader);
    const requiredHeaders = ['name', 'phone_number', 'amount'];
    const missingHeaders = requiredHeaders.filter(
      (h) => !normalizedHeaders.includes(h.toLowerCase()),
    );

    if (missingHeaders.length > 0) {
      return {
        isValid: false,
        error: `Missing required columns: ${missingHeaders.join(', ')}`,
        headers,
      };
    }

    // Check if there's at least one data row
    if (lines.length < 2) {
      return {
        isValid: false,
        error: 'CSV file must have at least one data row',
        headers,
      };
    }

    // Validate that data rows have correct number of columns and data
    const dataRows = lines.slice(1);
    const rowErrors: Array<{ row: number; message: string }> = [];

    // Find indices for required and optional columns using normalized headers
    const findColumnIndex = (columnName: string): number => {
      const normalized = normalizeHeader(columnName);
      return normalizedHeaders.indexOf(normalized);
    };

    const nameIndex = findColumnIndex('name');
    const phoneIndex = findColumnIndex('phone_number');
    const amountIndex = findColumnIndex('amount');
    const statusIndex = findColumnIndex('status');

    // Valid status values
    const validStatuses = ['approved', 'declined', 'pending'];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because we start from line 2 (after header) and 1-indexed
      const values = parseCSVLine(row, separator).map((v) =>
        v.replace(/^"|"$/g, '').trim(),
      );

      // Check if row has minimum required columns
      if (values.length < headers.length) {
        rowErrors.push({
          row: rowNumber,
          message: `Insufficient columns. Expected ${headers.length}, found ${values.length}`,
        });
        continue;
      }

      // Validate name (required, non-empty, reasonable length)
      if (nameIndex < 0 || !values[nameIndex]) {
        rowErrors.push({
          row: rowNumber,
          message: 'Name is required and cannot be empty',
        });
      } else {
        const name = values[nameIndex];
        if (name.length > 100) {
          rowErrors.push({
            row: rowNumber,
            message: 'Name must be less than 100 characters',
          });
        }
      }

      // Validate phone_number (required, non-empty)
      if (phoneIndex < 0 || !values[phoneIndex]) {
        rowErrors.push({
          row: rowNumber,
          message: 'Phone number is required and cannot be empty',
        });
      } else {
        const phone = values[phoneIndex];
        // Basic phone validation: should contain at least digits
        const phoneRegex = /[\d\s\-\+\(\)]+/;
        if (
          !phoneRegex.test(phone) ||
          phone.replace(/[\s\-\+\(\)]/g, '').length < 5
        ) {
          rowErrors.push({
            row: rowNumber,
            message: 'Phone number appears to be invalid',
          });
        }
      }

      // Validate amount (required, must be a valid number >= 1)
      if (amountIndex < 0 || !values[amountIndex]) {
        rowErrors.push({
          row: rowNumber,
          message: 'Amount is required and cannot be empty',
        });
      } else {
        const amountStr = values[amountIndex];
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          rowErrors.push({
            row: rowNumber,
            message: `Amount must be a valid number, got: "${amountStr}"`,
          });
        } else if (amount < 1) {
          rowErrors.push({
            row: rowNumber,
            message: `Amount must be at least 1, got: ${amount}`,
          });
        }
        // Note: Decimals are allowed for amount values
      }

      // Validate status (optional, but if provided must be valid)
      if (statusIndex >= 0 && values[statusIndex]) {
        const status = values[statusIndex].toLowerCase();
        if (!validStatuses.includes(status)) {
          rowErrors.push({
            row: rowNumber,
            message: `Status must be one of: ${validStatuses.join(
              ', ',
            )}, got: "${values[statusIndex]}"`,
          });
        }
      }
    }

    if (rowErrors.length > 0) {
      // Create a summary error message
      const errorMessages = rowErrors
        .slice(0, 10) // Show first 10 errors
        .map((err) => `Row ${err.row}: ${err.message}`)
        .join('; ');

      const moreErrors =
        rowErrors.length > 10
          ? ` (and ${rowErrors.length - 10} more error${
              rowErrors.length - 10 > 1 ? 's' : ''
            })`
          : '';

      return {
        isValid: false,
        error: `Validation errors found: ${errorMessages}${moreErrors}`,
        headers,
        rowCount: dataRows.length,
        errors: rowErrors,
      };
    }

    return {
      isValid: true,
      headers,
      rowCount: dataRows.length,
    };
  } catch (error) {
    console.error('CSV validation error:', error);
    return {
      isValid: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate CSV file. Please check the file format.',
    };
  }
}
