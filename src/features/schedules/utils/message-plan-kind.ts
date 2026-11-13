/**
 * Which Message Plan an Event is on, and the Schedule Type facts both plans
 * share (ADR 0053, 0055). Pure, so the send path, the pages and the Back
 * Office all read the same rule.
 *
 * `event_reminder` and `post_event` belong to both plans, so a reader that
 * needs to know how one of those behaves (its Due Time rule, its gift button)
 * asks the Event's plan, never the key alone.
 */

export const MESSAGE_PLANS = ['classic', 'current'] as const;
export type MessagePlan = (typeof MESSAGE_PLANS)[number];

/**
 * `events.message_plan` as read off a row. Anything but 'current' is Classic,
 * so a query that did not select the column behaves exactly as before.
 */
export function parseMessagePlan(value: unknown): MessagePlan {
  return value === 'current' ? 'current' : 'classic';
}

/** The current plan's own Schedule Types; it shares event_reminder and post_event. */
export const CURRENT_PLAN_ASK_TYPE_KEYS = ['invitation', 'follow_up'] as const;

/**
 * Whether a Schedule Type is an **Ask**: a message a Guest answers from, with
 * the RSVP quick replies. The Classic Confirmation, and the current plan's
 * Invitation and Follow-up. The Classic Initial Invitation does not ask, and
 * the Advance Reminder's RSVP row is a family axis, not an Ask.
 */
export const ASK_SCHEDULE_TYPE_KEYS = ['confirmation', 'invitation', 'follow_up'] as const;

export function isAsk(scheduleTypeKey: string | null | undefined): boolean {
  return (ASK_SCHEDULE_TYPE_KEYS as readonly (string | null | undefined)[]).includes(scheduleTypeKey);
}

/** Whether a Schedule Type exists only on the current Message Plan. */
export function isCurrentPlanOnlyType(scheduleTypeKey: string | null | undefined): boolean {
  return scheduleTypeKey === 'invitation' || scheduleTypeKey === 'follow_up';
}

/**
 * The channel a message Schedule sends on. Classic reads it off its catalog
 * row; the current plan has none (ADR 0055) and always sends WhatsApp first,
 * with the SMS Fallback behind it.
 */
export function scheduleChannel(
  templateChannel: string | null | undefined,
  messagePlan: MessagePlan,
): string | null {
  if (messagePlan === 'current') return 'whatsapp';
  return templateChannel ?? null;
}
