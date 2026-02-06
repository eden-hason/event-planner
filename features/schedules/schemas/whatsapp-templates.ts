import { z } from 'zod';

// Database schema (snake_case)
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
  parameters: z.any().nullable(),
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
  parameters: z.any().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

// Transformation schemas
export const WhatsAppTemplateDbToAppSchema = WhatsAppTemplateDbSchema.transform((data) => ({
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
  parameters: data.parameters,
  description: data.description,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
}));

export type WhatsAppTemplateDb = z.infer<typeof WhatsAppTemplateDbSchema>;
export type WhatsAppTemplateApp = z.infer<typeof WhatsAppTemplateAppSchema>;
