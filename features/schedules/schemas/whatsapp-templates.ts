import { z } from 'zod';
import { TemplateParametersConfigSchema, type PlaceholderConfig } from './template-parameters';
import { extractPlaceholders } from '../utils/parameter-resolvers';

// Database schema (snake_case)
// Note: parameters is z.any() to accept both old (array) and new (record) formats
export const WhatsAppTemplateDbSchema = z.object({
  id: z.string().uuid(),
  template_name: z.string(),
  display_name: z.string(),
  body_text: z.string(),
  language_code: z.string(),
  header_type: z.string().nullable(),
  header_text: z.string().nullable(),
  header_parameters: z.any().nullable(),
  footer_text: z.string().nullable(),
  buttons: z.any().nullable(),
  parameters: z.any().nullable(), // Accept both old and new formats
  description: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

// Application schema (camelCase)
export const WhatsAppTemplateAppSchema = z.object({
  id: z.string().uuid(),
  templateName: z.string(),
  displayName: z.string(),
  bodyText: z.string(),
  languageCode: z.string(),
  headerType: z.string().nullable(),
  headerText: z.string().nullable(),
  headerParameters: z.any().nullable(),
  footerText: z.string().nullable(),
  buttons: z.any().nullable(),
  parameters: TemplateParametersConfigSchema.nullable(),
  description: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

/**
 * Migrate old array-based placeholder config to new record-based format
 *
 * Old format: { placeholders: [{ name, source, transformer, fallback }] }
 * New format: { placeholders: { "placeholder.name": { source, transformer, fallback } } }
 */
function migrateParametersToRecordFormat(
  parameters: any,
  bodyText: string,
): z.infer<typeof TemplateParametersConfigSchema> | null {
  if (!parameters) return null;

  // Check if placeholders is an array (old format)
  if (Array.isArray(parameters.placeholders)) {
    // Extract placeholder names from template body
    const placeholderNames = extractPlaceholders(bodyText);

    // Convert array to record by mapping positions to placeholder names
    const placeholdersRecord: Record<string, PlaceholderConfig> = {};

    parameters.placeholders.forEach((config: any, index: number) => {
      const placeholderName = placeholderNames[index];
      if (placeholderName) {
        // Remove the 'name' field and keep other properties
        const { name, ...configWithoutName } = config;
        placeholdersRecord[placeholderName] = configWithoutName;
      }
    });

    return {
      headerPlaceholders: parameters.headerPlaceholders ?? [],
      placeholders: placeholdersRecord,
    };
  }

  // Already in new format or invalid
  return parameters;
}

// Transformation schemas
export const WhatsAppTemplateDbToAppSchema = WhatsAppTemplateDbSchema.transform((data) => {
  // Migrate parameters from old format to new format
  const migratedParameters = migrateParametersToRecordFormat(
    data.parameters,
    data.body_text,
  );

  return {
    id: data.id,
    templateName: data.template_name,
    displayName: data.display_name,
    bodyText: data.body_text,
    languageCode: data.language_code,
    headerType: data.header_type,
    headerText: data.header_text,
    headerParameters: data.header_parameters,
    footerText: data.footer_text,
    buttons: data.buttons,
    parameters: migratedParameters,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
});

export type WhatsAppTemplateDb = z.infer<typeof WhatsAppTemplateDbSchema>;
export type WhatsAppTemplateApp = z.infer<typeof WhatsAppTemplateAppSchema>;
