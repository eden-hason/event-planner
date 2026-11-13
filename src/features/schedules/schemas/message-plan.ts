import { z } from 'zod';

/** `schedules.personal_text`'s own check (migration 20261113000000_message_plan.sql). */
export const PERSONAL_TEXT_COLUMN_MAX = 4000;

/**
 * What the Owner's screens send to save a Schedule on the current Message
 * Plan: only the fields that changed. Checked by `checkMessagePlanSave`.
 */
export const MessagePlanSaveInputSchema = z
  .object({
    wording: z.enum(['kululu', 'personal']),
    /** `serialisePersonalText` output; null or blank for none. */
    personalText: z.string().max(PERSONAL_TEXT_COLUMN_MAX).nullable(),
    attachment: z.enum(['image', 'video', 'none']),
    giftButton: z.boolean(),
    /** The Due Time, an ISO instant. Checked by the action with `dueTimeIssue`. */
    scheduledDate: z.string(),
  })
  .partial()
  .strict();

export type MessagePlanSaveInput = z.infer<typeof MessagePlanSaveInputSchema>;
