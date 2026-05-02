'use server';

import Anthropic from '@anthropic-ai/sdk';

export type AnalyzeCsvMapping = Record<string, string>; // header_name -> field_name

export type AnalyzeCsvResult = {
  mapping: AnalyzeCsvMapping; // e.g. { "שם": "full_name", "טלפון": "phone" }
  preview: Array<{ header: string; field: string; sample: string }>;
  detectedCount: number;
};

export type AnalyzeCsvState = {
  success: boolean;
  result?: AnalyzeCsvResult;
  message?: string;
};

export async function analyzeCsv(csvSample: string): Promise<AnalyzeCsvState> {
  try {
    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a CSV column mapping assistant. Your job is to analyze CSV data and map columns to predefined fields.

The available fields are:
- full_name: The guest's full name (may be in Hebrew or English)
- phone: Phone number (Israeli format or international)
- amount: Monetary amount or gift value (optional)

Return ONLY a valid JSON object with this exact structure:
{
  "mapping": { "<csv_header>": "<field_name>" },
  "preview": [{ "header": "<csv_header>", "field": "<field_name>", "sample": "<first_value>" }],
  "detectedCount": <number>
}

Rules:
- Only map headers you are confident about
- Skip headers that don't match any field
- The "mapping" object maps CSV header names to field names
- "preview" should include all mapped columns with a sample value
- "detectedCount" is the number of successfully mapped fields
- Do not include unmapped headers in the mapping or preview`,
      messages: [
        {
          role: 'user',
          content: `Analyze this CSV and map the columns to the appropriate fields:\n\n${csvSample}`,
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

    return { success: true, result: parsed };
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
