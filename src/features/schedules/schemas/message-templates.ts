import { z } from 'zod';
import { TemplateParametersConfigSchema } from './template-parameters';

// Channels a message template can be authored for (mirrors delivery_method enum)
export const MESSAGE_CHANNELS = ['whatsapp', 'sms'] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

// --- Channel-specific payload schemas (message_templates.payload jsonb) ---

export const WhatsAppPayloadSchema = z.object({
  bodyText: z.string(),
  headerType: z.string().nullable(),
  headerText: z.string().nullable(),
  footerText: z.string().nullable(),
  parameters: TemplateParametersConfigSchema,
});

export type WhatsAppPayload = z.infer<typeof WhatsAppPayloadSchema>;

export const SmsPayloadSchema = z.object({
  bodyText: z.string(),
  parameters: TemplateParametersConfigSchema,
});

export type SmsPayload = z.infer<typeof SmsPayloadSchema>;

// --- DB-level schema (snake_case) ---

export const MessageTemplateDbSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  channel: z.enum(MESSAGE_CHANNELS),
  schedule_type_id: z.uuid(),
  variant: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  language_code: z.string(),
  whatsapp_template_name: z.string().nullable(),
  payload: z.unknown(),
});

export type MessageTemplateDb = z.infer<typeof MessageTemplateDbSchema>;

// --- App-level model (camelCase), payload validated per channel ---

type MessageTemplateBase = {
  id: string;
  key: string;
  scheduleTypeId: string;
  variant: string;
  name: string;
  description: string | null;
  languageCode: string;
};

export type MessageTemplateApp =
  | (MessageTemplateBase & {
      channel: 'whatsapp';
      whatsappTemplateName: string;
      payload: WhatsAppPayload;
    })
  | (MessageTemplateBase & {
      channel: 'sms';
      payload: SmsPayload;
    });

// --- DB to App transformer ---
// Validates the jsonb payload against the channel-specific schema, so a
// malformed catalog row fails loudly at read time instead of at send time.
export const MessageTemplateDbToAppSchema = MessageTemplateDbSchema.transform(
  (db, ctx): MessageTemplateApp => {
    const base = {
      id: db.id,
      key: db.key,
      scheduleTypeId: db.schedule_type_id,
      variant: db.variant,
      name: db.name,
      description: db.description,
      languageCode: db.language_code,
    };

    if (db.channel === 'whatsapp') {
      const payload = WhatsAppPayloadSchema.safeParse(db.payload);
      if (!payload.success || !db.whatsapp_template_name) {
        ctx.addIssue({
          code: 'custom',
          message: `Invalid whatsapp payload for template ${db.key}`,
        });
        return z.NEVER;
      }
      return {
        ...base,
        channel: 'whatsapp',
        whatsappTemplateName: db.whatsapp_template_name,
        payload: payload.data,
      };
    }

    const payload = SmsPayloadSchema.safeParse(db.payload);
    if (!payload.success) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid sms payload for template ${db.key}`,
      });
      return z.NEVER;
    }
    return { ...base, channel: 'sms', payload: payload.data };
  },
);

// --- Legacy send/preview shape ---
// The send pipeline and preview components consume this flattened WhatsApp
// shape; keep producing it from the catalog row.
export type WhatsAppTemplateApp = {
  templateKey: string;
  templateName: string;
  bodyText: string;
  languageCode: string;
  headerType: string | null;
  headerText: string | null;
  footerText: string | null;
  parameters: z.infer<typeof TemplateParametersConfigSchema>;
  description: string | null;
};

export function toWhatsAppTemplate(
  template: MessageTemplateApp,
): WhatsAppTemplateApp | null {
  if (template.channel !== 'whatsapp') return null;
  return {
    templateKey: template.key,
    templateName: template.whatsappTemplateName,
    bodyText: template.payload.bodyText,
    languageCode: template.languageCode,
    headerType: template.payload.headerType,
    headerText: template.payload.headerText,
    footerText: template.payload.footerText,
    parameters: template.payload.parameters,
    description: template.description,
  };
}
