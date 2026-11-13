/**
 * What saving a Schedule on the current Message Plan may write, checked with
 * the same shared message-plan code the editor and the send use (ADR 0054).
 * Pure, so `updateMessagePlanSchedule` and its tests read one rule; the action
 * only loads the rows and writes the result.
 *
 * Only the fields the Owner changed are sent and checked, so a stored choice
 * the Event no longer backs (a gift switch whose Gifting page was taken down)
 * does not block saving something else. The renderer already falls back from
 * those (render.ts).
 */

import { z } from 'zod';

import {
  FOLLOW_UP_ATTACHMENTS,
  INVITATION_ATTACHMENTS,
  isAskStage,
  isBlankPersonalText,
  parsePersonalText,
  serialisePersonalText,
  stageOfScheduleType,
  validatePersonalText,
  type Attachment,
  type MessagePlanEvent,
  type MessagePlanGuestTable,
  type PersonalTextError,
  type Wording,
} from '../message-plan';
import { attachmentOptions, giftAvailable, sentTables } from './message-plan-editor';

/** The column's own check (migration 20261113000000_message_plan.sql). */
export const PERSONAL_TEXT_COLUMN_MAX = 4000;

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

/** The `schedules` columns a save writes, only the ones it changes. */
export type MessagePlanScheduleUpdate = {
  wording?: Wording;
  personal_text?: string | null;
  attachment?: Attachment;
  gift_button?: boolean;
};

export type MessagePlanSaveError =
  | { code: 'invalid_input' }
  | { code: 'not_a_stage' }
  | { code: 'personal_text'; errors: PersonalTextError[] }
  | { code: 'attachment_not_offered' }
  | { code: 'attachment_unavailable' }
  | { code: 'gift_not_offered' }
  | { code: 'gift_unavailable' };

export type MessagePlanSaveCheck =
  | { ok: true; update: MessagePlanScheduleUpdate }
  | { ok: false; error: MessagePlanSaveError };

/**
 * Checks a save and turns it into the columns to write.
 *
 * The wording and the text travel together: `stored` is what the Schedule
 * holds now, so a save that changes one of them is judged with the other as
 * it will be. A Personal Message is checked only when it is the chosen
 * message. One left blank is no Personal Message, so the Schedule goes back
 * to Kululu's text rather than storing an empty choice. A draft kept beside
 * Kululu's text is stored cleaned but not checked: it is not sent.
 */
export function checkMessagePlanSave(params: {
  scheduleTypeKey: string;
  input: unknown;
  stored: { wording: Wording | null; personalText: string | null };
  event: MessagePlanEvent;
  guests: readonly { name: string; table: MessagePlanGuestTable | null }[];
}): MessagePlanSaveCheck {
  const parsed = MessagePlanSaveInputSchema.safeParse(params.input);
  if (!parsed.success) return { ok: false, error: { code: 'invalid_input' } };
  const input = parsed.data;

  const stage = stageOfScheduleType(params.scheduleTypeKey);
  if (!stage) return { ok: false, error: { code: 'not_a_stage' } };

  const update: MessagePlanScheduleUpdate = {};

  if (input.wording !== undefined || input.personalText !== undefined) {
    const wording = input.wording ?? params.stored.wording ?? 'kululu';
    const raw =
      input.personalText !== undefined ? input.personalText : params.stored.personalText;
    const text = parsePersonalText(raw);
    const blank = isBlankPersonalText(text);

    if (wording === 'personal' && !blank) {
      const checked = validatePersonalText(text, {
        stage,
        event: params.event,
        guests: sentTables(stage, params.guests, params.event),
      });
      if (!checked.ok) {
        return { ok: false, error: { code: 'personal_text', errors: checked.errors } };
      }
      update.wording = 'personal';
      update.personal_text = serialisePersonalText(checked.text);
    } else {
      update.wording = 'kululu';
      if (blank) {
        update.personal_text = null;
      } else {
        // The draft the Owner set aside, kept for when they switch back.
        const draft = serialisePersonalText(text);
        update.personal_text = draft.length <= PERSONAL_TEXT_COLUMN_MAX ? draft : null;
      }
    }
  }

  if (input.attachment !== undefined) {
    if (!isAskStage(stage)) return { ok: false, error: { code: 'attachment_not_offered' } };
    const offered: readonly Attachment[] =
      stage === 'invitation' ? INVITATION_ATTACHMENTS : FOLLOW_UP_ATTACHMENTS;
    if (!offered.includes(input.attachment)) {
      return { ok: false, error: { code: 'attachment_not_offered' } };
    }
    const option = attachmentOptions(stage, params.event).find(
      (candidate) => candidate.value === input.attachment,
    );
    if (!option?.available) return { ok: false, error: { code: 'attachment_unavailable' } };
    update.attachment = input.attachment;
  }

  if (input.giftButton !== undefined) {
    if (isAskStage(stage)) return { ok: false, error: { code: 'gift_not_offered' } };
    // Switching it off is always allowed, even once the Gifting page is gone.
    if (input.giftButton && !giftAvailable(params.event)) {
      return { ok: false, error: { code: 'gift_unavailable' } };
    }
    update.gift_button = input.giftButton;
  }

  return { ok: true, update };
}
