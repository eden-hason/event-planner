import { z } from 'zod';

/**
 * Supported transformer types for formatting placeholder values
 */
export const TransformerTypeSchema = z.enum([
  'none', // No transformation
  'formatDate', // Format date with locale and style
  'rsvpLabel', // Convert RSVP status to readable label
  'currency', // Format as currency
  'phoneNumber', // Format phone number
]);

export type TransformerType = z.infer<typeof TransformerTypeSchema>;

/**
 * Options for date formatting transformer
 */
export const DateFormatOptionsSchema = z.object({
  locale: z.string().default('en-US'),
  format: z.enum(['short', 'medium', 'long', 'full']).default('long'),
});

export type DateFormatOptions = z.infer<typeof DateFormatOptionsSchema>;

/**
 * Options for currency formatting transformer
 */
export const CurrencyOptionsSchema = z.object({
  currency: z.string().default('USD'),
  locale: z.string().default('en-US'),
});

export type CurrencyOptions = z.infer<typeof CurrencyOptionsSchema>;

/**
 * Transformer options - union of all possible transformer configurations
 */
export const TransformerOptionsSchema = z.union([
  DateFormatOptionsSchema,
  CurrencyOptionsSchema,
  z.object({}), // Empty object for transformers without options
]);

export type TransformerOptions = z.infer<typeof TransformerOptionsSchema>;

/**
 * Configuration for a single placeholder in a template
 *
 * The placeholder name in the template (e.g., "guest.name" from "{{guest.name}}")
 * is used as the key in the placeholders record. If source is omitted, the placeholder
 * name itself is used as the source path.
 */
export const PlaceholderConfigSchema = z.object({
  source: z.string().optional().describe('Dot-notation path to value (e.g., "guest.name", "event.eventDate"). Defaults to placeholder name if omitted.'),
  transformer: TransformerTypeSchema.default('none'),
  transformerOptions: TransformerOptionsSchema.optional(),
  fallback: z.string().optional().describe('Fallback value if source is null/undefined. Defaults to empty string.'),
});

export type PlaceholderConfig = z.infer<typeof PlaceholderConfigSchema>;

/**
 * Header parameter type enum
 */
export const HeaderParameterTypeSchema = z.enum(['image', 'video', 'document']);

export type HeaderParameterType = z.infer<typeof HeaderParameterTypeSchema>;

/**
 * Header parameter configuration
 */
export const HeaderPlaceholderConfigSchema = z.object({
  type: HeaderParameterTypeSchema.describe('Media type for the header'),
  source: z.string().describe('Dot-notation path to media URL (e.g., "event.invitations.frontImageUrl")'),
  fallback: z.string().nullable().default(null).describe('Fallback URL if source is null/undefined (null = skip header)'),
  filename: z.string().optional().describe('Filename for document type'),
});

export type HeaderPlaceholderConfig = z.infer<typeof HeaderPlaceholderConfigSchema>;

/**
 * Complete parameter configuration for a template
 *
 * Uses named placeholders where the key is the placeholder name from the template
 * (e.g., "guest.name" for "{{guest.name}}"). This eliminates positional matching errors
 * and makes templates self-documenting.
 */
export const TemplateParametersConfigSchema = z.object({
  headerPlaceholders: z.array(HeaderPlaceholderConfigSchema)
    .max(1)
    .default([])
    .describe('Header media parameters (WhatsApp supports max 1)'),
  placeholders: z.record(z.string(), PlaceholderConfigSchema).describe('Body text placeholder configurations mapped by placeholder name'),
});

export type TemplateParametersConfig = z.infer<typeof TemplateParametersConfigSchema>;
