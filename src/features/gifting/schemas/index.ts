import { z } from 'zod';

/**
 * Wire format for `updateGiftingSettings`. Each provider block is optional so
 * the PayBox and Bit cards can save independently; the action merges whatever
 * it receives into the existing `event_settings` jsonb.
 */
export const GiftProviderConfigSchema = z.object({
  enabled: z.boolean(),
  // Trimmed here so a stored link never carries stray whitespace. Empty is
  // allowed - that is how a provider is cleared ("disconnect").
  link: z.string().trim().max(2048).default(''),
});

export type GiftProviderConfigInput = z.infer<typeof GiftProviderConfigSchema>;

export const GiftingSettingsUpdateSchema = z.object({
  eventId: z.uuid(),
  payboxConfig: GiftProviderConfigSchema.optional(),
  bitConfig: GiftProviderConfigSchema.optional(),
});

export type GiftingSettingsUpdate = z.infer<typeof GiftingSettingsUpdateSchema>;
