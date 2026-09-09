import type { z } from 'zod';
import type { EventBillingStatusSchema } from './schemas';

export type EventBillingStatus = z.infer<typeof EventBillingStatusSchema>;

/**
 * The three visual treatments the header pill has, independent of the five
 * statuses: `premium` (gold, crown) for anything that can send, `plain`
 * (outline) for planning or a lapsed event, `pending` for payment in flight.
 */
export type BillingPillTone = 'premium' | 'plain' | 'pending';

/** What the header needs to render the pill - the label/copy come from i18n. */
export type BillingHeaderStatus = {
  status: EventBillingStatus;
  tone: BillingPillTone;
  sendingEnabled: boolean;
};

export type SetEventBillingStatusResult = { success: boolean; message: string };
