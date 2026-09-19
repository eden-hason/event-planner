import { z } from 'zod';

/**
 * Which messages carry the gift button, keyed by schedule type key. Partial:
 * the page sends only the type that was toggled, and the action merges it
 * over what is stored.
 */
export const GiftButtonsSchema = z.record(z.string(), z.boolean());

/**
 * Wire format for `updateGiftingSettings`. Each block is optional so the
 * PayBox card, the Bit card and the message toggles can save independently;
 * the action merges whatever it receives into the existing `event_settings`
 * jsonb.
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
  giftButtons: GiftButtonsSchema.optional(),
});

export type GiftingSettingsUpdate = z.infer<typeof GiftingSettingsUpdateSchema>;
