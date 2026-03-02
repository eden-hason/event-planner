import { z } from 'zod';
import { TemplateParametersConfigSchema } from './template-parameters';

// Application schema (camelCase) — no DB-level metadata
export const WhatsAppTemplateAppSchema = z.object({
  templateKey: z.string(),
  templateName: z.string(),
  bodyText: z.string(),
  languageCode: z.string(),
  headerType: z.string().nullable(),
  headerText: z.string().nullable(),
  footerText: z.string().nullable(),
  parameters: TemplateParametersConfigSchema.nullable(),
  description: z.string().nullable(),
});

export const SmsTemplateConfigSchema = z.object({
  bodyText: z.string(),
  parameters: TemplateParametersConfigSchema.optional(),
});

export const TemplateConfigSchema = z.object({
  whatsapp: WhatsAppTemplateAppSchema,
  sms: SmsTemplateConfigSchema.optional(),
});

export type WhatsAppTemplateApp = z.infer<typeof WhatsAppTemplateAppSchema>;
export type SmsTemplateConfig = z.infer<typeof SmsTemplateConfigSchema>;
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;
