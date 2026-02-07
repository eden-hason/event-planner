import { z } from 'zod';

/**
 * Supported transformer types for formatting placeholder values
 */
export const TransformerTypeSchema = z.enum([
  'none', // No transformation
  'formatDate', // Format date with locale and style
  'uppercase', // Convert to uppercase
  'lowercase', // Convert to lowercase
  'capitalize', // Capitalize first letter
  'rsvpLabel', // Convert RSVP status to readable label
  'currency', // Format as currency
  'phoneNumber', // Format phone number
  'optional', // Only show value if it exists
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
 */
export const PlaceholderConfigSchema = z.object({
  name: z.string().describe('Placeholder name (without braces, e.g., "guest_name")'),
  source: z.string().describe('Dot-notation path to value (e.g., "guest.name", "event.eventDate")'),
  transformer: TransformerTypeSchema.default('none'),
  transformerOptions: TransformerOptionsSchema.optional(),
  fallback: z.string().default('').describe('Fallback value if source is null/undefined'),
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
 */
export const TemplateParametersConfigSchema = z.object({
  headerPlaceholders: z.array(HeaderPlaceholderConfigSchema)
    .max(1)
    .default([])
    .describe('Header media parameters (WhatsApp supports max 1)'),
  placeholders: z.array(PlaceholderConfigSchema).describe('Body text placeholder configurations'),
});

export type TemplateParametersConfig = z.infer<typeof TemplateParametersConfigSchema>;
