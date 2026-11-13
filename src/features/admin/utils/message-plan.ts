import type { MessagePlan } from '@/features/schedules/utils/message-plan-kind';
import { ADD_FOLLOW_UP_LABEL, scheduleTypeName } from './labels';

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

/** Whether a value from a client is one of the two plans, exactly. */
export function isMessagePlan(value: unknown): value is MessagePlan {
  return typeof value === 'string' && Object.hasOwn(MESSAGE_PLAN_NAMES, value);
}

/**
 * Why `admin_move_event_to_message_plan` refuses, as its DETAIL carries it.
 * `sent` is the function `event_message_schedules_sent`, which the Event page
 * reads too, so the button and the function agree.
 */
const MOVE_REFUSALS = {
  not_found: 'האירוע הזה כבר לא קיים',
  already_current: 'האירוע כבר על תוכנית ההודעות החדשה',
  sent: 'כבר נשלחה הודעה מהאירוע הזה, אז הוא נשאר על התוכנית הקלאסית',
} as const;

export type MoveRefusal = keyof typeof MOVE_REFUSALS;

/**
 * Why the Event page shows the move disabled: a refusal the function would
 * raise, or `unchecked` when the page could not read whether anything was
 * sent. The function still decides; the page only stops offering a move it
 * cannot vouch for.
 */
export type MoveBlock = MoveRefusal | 'unchecked';

const MOVE_BLOCKS: Record<MoveBlock, string> = {
  ...MOVE_REFUSALS,
  unchecked: 'לא הצלחנו לבדוק אם כבר נשלחו הודעות - כדאי לרענן את העמוד',
};

export function moveBlockLabel(block: MoveBlock): string {
  return MOVE_BLOCKS[block];
}

/**
 * Why the Event cannot move now, or null when it can. `messagesSent` is null
 * when it could not be read.
 */
export function moveBlock(event: { messagePlan: MessagePlan; messagesSent: boolean | null }): MoveBlock | null {
  if (event.messagePlan === 'current') return 'already_current';
  if (event.messagesSent === null) return 'unchecked';
  if (event.messagesSent) return 'sent';
  return null;
}

/** The refusal code a failed RPC carries in DETAIL, or null for any other error. */
export function parseMoveRefusal(error: { details?: string | null } | null | undefined): MoveRefusal | null {
  const detail = error?.details?.trim();
  return detail && Object.hasOwn(MOVE_REFUSALS, detail) ? (detail as MoveRefusal) : null;
}

/** Any move failure that is not a refusal. */
export const MOVE_FAILED = 'לא הצלחנו להעביר את האירוע לתוכנית החדשה';

/**
 * The toast after a move. The function seeds nothing for an Event with no date
 * or type yet; the database seeds the current plan once it has both.
 */
export function movedMessage(seeded: number): string {
  return seeded > 0
    ? 'האירוע עבר לתוכנית ההודעות החדשה'
    : 'האירוע עבר לתוכנית ההודעות החדשה - התזמונים ייווצרו כשיהיו לו סוג ותאריך';
}

/** What the move puts in place of the unsent Schedules, for the dialog. */
export const MOVE_SEEDS = `הזמנה, שתי הודעות ${scheduleTypeName('follow_up')}, תזכורת והודעת תודה`;

/** What a move gives up, listed in the dialog (ADR 0053, Consequences). */
export const MOVE_LOSSES: readonly string[] = [
  'מועדי השליחה של כל התזמונים',
  'הנוסחים שנבחרו (וריאנטים) וההערות',
  'הטקסט של ההודעה האישית, אם נכתב',
  `תזמון נוסף, אם ניתן - התשלום נשאר רשום, ומוסיפים אותו מחדש עם "${ADD_FOLLOW_UP_LABEL}"`,
];

/**
 * The words around the "new Events start on" setting, per plan: `offer` is the
 * button that switches TO that plan, `saved` the toast once it holds.
 */
export const NEW_EVENT_PLAN_COPY: Record<MessagePlan, { offer: string; saved: string }> = {
  current: {
    offer: 'הפעלת התוכנית החדשה לאירועים חדשים',
    saved: 'מעכשיו אירועים חדשים מתחילים על תוכנית ההודעות החדשה',
  },
  classic: {
    offer: 'חזרה לתוכנית הקלאסית לאירועים חדשים',
    saved: 'מעכשיו אירועים חדשים מתחילים על התוכנית הקלאסית',
  },
};

/** Any failure to save the setting. */
export const SETTING_SAVE_FAILED = 'לא הצלחנו לשמור את ההגדרה';

/**
 * Why an Advance Reminder cannot be added on this plan, or null. The current
 * plan has none: its Reminder may be dated before the Event day instead.
 */
export function advanceReminderPlanRejection(plan: MessagePlan): string | null {
  return plan === 'current'
    ? 'באירוע על תוכנית ההודעות החדשה אין תזכורת מוקדמת - את התזכורת אפשר לתזמן לפני יום האירוע'
    : null;
}
