import { REVIEW_PATH } from '@/lib/config/contact';
import type { OwnerMessageKind } from '../types';

/**
 * The quick-reply buttons on the Owner Message templates, and the link each
 * one answers with (ADR 0049). A link in a template, in its body or on a
 * button, opens in WhatsApp's own browser, where the Owner is signed in to
 * neither Kululu nor Google. A link in a plain session message opens in the
 * phone's browser. So the template offers a button and the answer carries the
 * link.
 *
 * The buttons are static in Meta: no payload is sent with the template, so a
 * tap arrives with the button's label as its payload, and the label is what is
 * matched here. Change a label in Meta and here together.
 */
export type OwnerMessageQuickReplyAction = 'app' | 'review';

type QuickReply = {
  /** The button's text in the Meta template, exactly. */
  label: string;
  action: OwnerMessageQuickReplyAction;
  reply: (siteUrl: string) => string;
};

export const OWNER_MESSAGE_QUICK_REPLIES = {
  welcome: [
    {
      label: 'ניהול האירוע',
      action: 'app',
      reply: (siteUrl) => `הנה הקישור לניהול האירוע 👇\n${siteUrl}/app`,
    },
  ],
  post_event: [
    {
      label: 'להמלצה בגוגל',
      action: 'review',
      reply: (siteUrl) => `לכתיבת המלצה לחצו על הקישור\n${siteUrl}${REVIEW_PATH}`,
    },
  ],
} as const satisfies Record<OwnerMessageKind, readonly QuickReply[]>;

const ALL_LABELS = new Set<string>(
  Object.values(OWNER_MESSAGE_QUICK_REPLIES).flatMap((replies) => replies.map((r) => r.label)),
);

/**
 * Whether a tap or a typed text could be one of these buttons, before anything
 * is looked up. Most inbound messages are a Guest's RSVP, and this keeps them
 * from costing a query.
 */
export function isOwnerMessageQuickReplyLabel(label: string): boolean {
  return ALL_LABELS.has(label.trim());
}

/** The answer to a tap on `kind`'s button `label`, or null when it has no such button. */
export function ownerMessageQuickReply(
  kind: OwnerMessageKind,
  label: string,
  siteUrl: string,
): { action: OwnerMessageQuickReplyAction; body: string } | null {
  const match = OWNER_MESSAGE_QUICK_REPLIES[kind].find((r) => r.label === label.trim());
  return match ? { action: match.action, body: match.reply(siteUrl) } : null;
}
