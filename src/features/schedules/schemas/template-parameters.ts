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
  'wazeNavQuery', // URL-encode venue name and append &navigate=yes for Waze deep link
  'navShortUrl', // Build short nav redirect URL from event.shortCode
  'rsvpUrl', // Build RSVP confirmation URL from the confirmation token
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
 * If source is omitted, the placeholder name itself is used as the source path.
 */
export const PlaceholderConfigSchema = z.object({
  source: z.string().optional().describe('Dot-notation path to value (e.g., "guest.name", "event.eventDate"). Defaults to placeholder name if omitted.'),
  transformer: TransformerTypeSchema.default('none'),
  transformerOptions: TransformerOptionsSchema.optional(),
});

export type PlaceholderConfig = z.infer<typeof PlaceholderConfigSchema>;

/**
 * A body placeholder with its semantic name. Body placeholders live in an
 * ordered array: position N resolves the template's {{N+1}}. Never store them
 * as an object - jsonb does not preserve key order.
 */
export const NamedPlaceholderConfigSchema = PlaceholderConfigSchema.extend({
  name: z.string().describe('Semantic name of the placeholder (e.g., "host.bride.name")'),
});

export type NamedPlaceholderConfig = z.infer<typeof NamedPlaceholderConfigSchema>;

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
  source: z.string().describe('Dot-notation path to media URL (e.g., "event.invitations.imageUrl")'),
  filename: z.string().optional().describe('Filename for document type'),
});

export type HeaderPlaceholderConfig = z.infer<typeof HeaderPlaceholderConfigSchema>;

/**
 * Button parameter configuration for dynamic URL or quick-reply buttons
 */
export const ButtonPlaceholderConfigSchema = z.object({
  index: z.number().int().min(0).describe('Zero-based button position in the template'),
  subType: z.enum(['url', 'quick_reply']).describe('Meta API button sub_type'),
  text: z.string().optional().describe('Display label shown in the message preview'),
  placeholders: z.array(PlaceholderConfigSchema).min(1).describe('Placeholder configs for this button'),
});

export type ButtonPlaceholderConfig = z.infer<typeof ButtonPlaceholderConfigSchema>;

/**
 * Complete parameter configuration for a template
 *
 * Body placeholders are an ordered array: the entry at index N resolves the
 * body's positional {{N+1}}. Each entry carries a semantic name so templates
 * stay self-documenting.
 */
export const TemplateParametersConfigSchema = z.object({
  headerPlaceholders: z.array(HeaderPlaceholderConfigSchema)
    .max(1)
    .default([])
    .describe('Header media parameters (WhatsApp supports max 1)'),
  placeholders: z.array(NamedPlaceholderConfigSchema).describe('Ordered body placeholder configurations; index N fills {{N+1}}'),
  buttonPlaceholders: z.array(ButtonPlaceholderConfigSchema).default([]).describe('Button parameter configurations for dynamic URL or quick-reply buttons'),
});

export type TemplateParametersConfig = z.infer<typeof TemplateParametersConfigSchema>;
