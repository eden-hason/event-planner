import type { MessagePlan } from '@/features/schedules/utils/message-plan-kind';

/**
 * The Back Office side of the two Message Plans (ADR 0053): what each is
 * called, whether an Event may move to the current one and why not, and how
 * the move and the "new Events start on" setting answer. Pure, so the Event
 * page (which disables the button) and the Server Action (which refuses the
 * move) word every refusal the same way.
 */

/** The plan's name, as the Event page and the settings card read it. */
export const MESSAGE_PLAN_NAMES: Record<MessagePlan, string> = {
  classic: 'תוכנית ההודעות הקלאסית',
  current: 'תוכנית ההודעות החדשה',
};

/**
 * Why `admin_move_event_to_message_plan` refuses, as its DETAIL carries it.
 * `sent` is the function `event_message_schedules_sent`, which the Event page
 * reads too, so the button and the function agree.
 */
export type MoveRefusal = 'not_found' | 'already_current' | 'sent';

const MOVE_REFUSALS: Record<MoveRefusal, string> = {
  not_found: 'האירוע הזה כבר לא קיים',
  already_current: 'האירוע כבר על תוכנית ההודעות החדשה',
  sent: 'כבר נשלחה הודעה מהאירוע הזה, אז הוא נשאר על התוכנית הקלאסית',
};

export function moveRefusalLabel(refusal: MoveRefusal): string {
  return MOVE_REFUSALS[refusal];
}

/** Why the Event cannot move now, or null when it can. */
export function moveRefusal(event: { messagePlan: MessagePlan; messagesSent: boolean }): MoveRefusal | null {
  if (event.messagePlan === 'current') return 'already_current';
  if (event.messagesSent) return 'sent';
  return null;
}

/** The refusal code a failed RPC carries in DETAIL, or null for any other error. */
export function parseMoveRefusal(error: { details?: string | null } | null | undefined): MoveRefusal | null {
  const detail = error?.details?.trim();
  return detail === 'not_found' || detail === 'already_current' || detail === 'sent' ? detail : null;
}

/**
 * The toast after a move. The function seeds nothing for an Event with no date
 * or type yet; the database seeds the current plan once it has both.
 */
export function movedMessage(seeded: number): string {
  return seeded > 0
    ? 'האירוע עבר לתוכנית ההודעות החדשה'
    : 'האירוע עבר לתוכנית ההודעות החדשה - התזמונים ייווצרו כשיהיו לו סוג ותאריך';
}

/** What a move gives up, listed in the dialog (ADR 0053, Consequences). */
export const MOVE_LOSSES: readonly string[] = [
  'מועדי השליחה של כל התזמונים',
  'הנוסחים שנבחרו (וריאנטים) וההערות',
  'הטקסט של ההודעה האישית, אם נכתב',
  'תזמון נוסף, אם ניתן - התשלום נשאר רשום, ומוסיפים אותו מחדש עם "הוספת הודעת עדיין מחכים לתשובה"',
];

/** The setting's value from the database, Classic for anything unexpected. */
export function parseNewEventMessagePlan(value: unknown): MessagePlan {
  return value === 'current' ? 'current' : 'classic';
}

/** The toast after the setting changes. */
export function newEventPlanSavedMessage(plan: MessagePlan): string {
  return plan === 'current'
    ? 'מעכשיו אירועים חדשים מתחילים על תוכנית ההודעות החדשה'
    : 'מעכשיו אירועים חדשים מתחילים על התוכנית הקלאסית';
}
