'use server';

import Anthropic from '@anthropic-ai/sdk';

// column index -> field name (e.g. { "0": "full_name", "1": "phone" })
export type AnalyzeCsvMapping = Record<number, string>;

export type AnalyzeCsvConfidence = 'high' | 'low';

const REQUIRED_AI_FIELDS = ['full_name'] as const;

export type AnalyzeCsvResult = {
  mapping: AnalyzeCsvMapping;
  preview: Array<{
    columnIndex: number;
    field: string;
    sample: string;
    confidence: AnalyzeCsvConfidence;
  }>;
  detectedCount: number;
  /**
   * True when a required field wasn't mapped at all, or the model flagged any
   * mapped field as low confidence - the mobile mapping-review screen only
   * interrupts the flow in that case, so this is the one thing it checks.
   * Without a required-field trigger, an unmapped name column used to leave
   * the wizard's Next button permanently disabled with no manual remap to
   * fall back to (`map-step.tsx` exists but nothing renders it).
   */
  needsReview: boolean;
};

export type AnalyzeCsvState = {
  success: boolean;
  result?: AnalyzeCsvResult;
  message?: string;
};

export type AnalyzeCsvInput = {
  headers: string[];
  sampleRows: string[][];
};

const MAX_SAMPLE_ROWS = 20;
const MAX_CELL_CHARS = 80;

const clip = (value: string) =>
  value.length > MAX_CELL_CHARS ? value.slice(0, MAX_CELL_CHARS) : value;

/**
 * Builds a prompt payload that anchors every column to its numeric index so the
 * model refers to columns by position, not by echoing header strings back. This
 * avoids the exact-string round-trip that used to silently drop columns when the
 * model returned a header that wasn't byte-for-byte identical (Unicode
 * normalization, casing, quotes, whitespace).
 */
function buildColumnsPayload({ headers, sampleRows }: AnalyzeCsvInput): string {
  const columnsList = headers
    .map((header, index) => `[${index}] ${clip(header)}`)
    .join('\n');

  const sampleText = sampleRows
    .slice(0, MAX_SAMPLE_ROWS)
    .map(
      (row, rowIndex) =>
        `Row ${rowIndex + 1}: ` +
        headers
          .map((_, colIndex) => `[${colIndex}]=${clip(row[colIndex] ?? '')}`)
          .join(' | '),
    )
    .join('\n');

  return `Columns (0-indexed):\n${columnsList}\n\nSample rows:\n${sampleText}`;
}

export async function analyzeCsv(
  input: AnalyzeCsvInput,
): Promise<AnalyzeCsvState> {
  try {
    if (!input.headers || input.headers.length === 0) {
      return { success: false, message: 'No columns to analyze.' };
    }

    const client = new Anthropic();
    const columnCount = input.headers.length;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a CSV column mapping assistant. Your job is to analyze CSV columns and map each column to a predefined field, referring to columns ONLY by their 0-indexed position.

The available fields are:
- full_name: The guest's full name (may be in Hebrew or English)
- phone: Phone number (Israeli format or international)
- amount: Number of guests in the party / how many people will attend / headcount (optional, not monetary)
- side: Which side of the wedding the guest belongs to. Values like bride/groom (English) or כלה/חתן (Hebrew)
- group: The guest's group, category, or table name (e.g. family, work, college friends, חברים, משפחה)

You will receive a list of columns, each labeled with its 0-indexed position in square brackets, followed by sample rows.

Return ONLY a valid JSON object with this exact structure:
{
  "mapping": { "<column_index>": "<field_name>" },
  "preview": [{ "columnIndex": <column_index>, "field": "<field_name>", "sample": "<first_value>", "confidence": "high" | "low" }],
  "detectedCount": <number>
}

Rules:
- Refer to columns by their integer index (0-based), never by header text
- Column indices must be between 0 and ${columnCount - 1}
- Map every column you have a plausible guess for, even a weak one - do not
  skip a column just because you are unsure
- Mark "confidence" as "low" whenever the header is ambiguous, absent, or the
  sample values are inconsistent with the field; use "high" only when you are
  confident the mapping is correct
- Skip columns that don't match any field at all, and do not include them in
  "mapping" or "preview"
- Map each field to at most one column, and each column to at most one field
- "preview" should include all mapped columns with a sample value and a confidence
- "detectedCount" is the number of successfully mapped fields`,
      messages: [
        {
          role: 'user',
          content: `Analyze these CSV columns and map them to the appropriate fields:\n\n${buildColumnsPayload(
            input,
          )}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, message: 'No response from AI analysis.' };
    }

    let parsed: AnalyzeCsvResult;
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, message: 'AI returned an unexpected response format.' };
      }
      parsed = JSON.parse(jsonMatch[0]) as AnalyzeCsvResult;
    } catch {
      return { success: false, message: 'Failed to parse AI response.' };
    }

    if (!parsed.mapping || !parsed.preview || typeof parsed.detectedCount !== 'number') {
      return { success: false, message: 'AI response is missing required fields.' };
    }

    // Keep only indices that actually exist in the uploaded file so a stray
    // out-of-range index from the model can never poison the mapping.
    const sanitizedMapping: AnalyzeCsvMapping = {};
    for (const [indexStr, field] of Object.entries(parsed.mapping)) {
      const colIndex = Number(indexStr);
      if (
        Number.isInteger(colIndex) &&
        colIndex >= 0 &&
        colIndex < columnCount &&
        typeof field === 'string'
      ) {
        sanitizedMapping[colIndex] = field;
      }
    }

    const sanitizedPreview = parsed.preview
      .filter(
        (item) =>
          Number.isInteger(item.columnIndex) &&
          item.columnIndex >= 0 &&
          item.columnIndex < columnCount,
      )
      // A missing or malformed confidence defaults to "low" rather than
      // "high" - an unrecognized value from the model should route the user
      // to the review screen, not silently pass through as trustworthy.
      .map((item) => ({
        ...item,
        confidence:
          item.confidence === 'high'
            ? ('high' as const)
            : ('low' as const),
      }));

    const mappedFields = new Set(sanitizedPreview.map((item) => item.field));
    const missingRequiredField = REQUIRED_AI_FIELDS.some(
      (field) => !mappedFields.has(field),
    );
    const hasLowConfidence = sanitizedPreview.some(
      (item) => item.confidence === 'low',
    );

    return {
      success: true,
      result: {
        mapping: sanitizedMapping,
        preview: sanitizedPreview,
        detectedCount: sanitizedPreview.length,
        needsReview: missingRequiredField || hasLowConfidence,
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { success: false, message: `API error: ${error.message}` };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during analysis.',
    };
  }
}
