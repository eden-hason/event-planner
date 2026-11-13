/**
 * The seam between the send path's own shapes (a parsed Schedule row, a Guest
 * Record, its table) and the current Message Plan's renderer
 * (`../message-plan`). Pure: the services load the rows and pass them here, so
 * every caller - the Dispatcher, the SMS Fallback, Hand Delivery and the Test
 * Message - renders a Guest's message the same way.
 */

import {
  buildMessageLinks,
  composeMessage,
  renderMessagePlanPayloads,
  type ComposeResult,
  type MessagePlanEvent,
  type MessagePlanGuest,
  type MessagePlanSchedule,
  type RenderPayloadsResult,
} from '../message-plan';

/** The columns of a parsed Schedule the renderer reads. */
export type MessagePlanScheduleSource = {
  scheduleTypeKey: string;
  wording?: 'kululu' | 'personal' | null;
  personalText?: string | null;
  attachment?: 'image' | 'video' | 'none' | null;
  giftButton?: boolean | null;
  /** The Due Time, null for an Undated Schedule. */
  scheduledDate: string | null;
};

export function toMessagePlanSchedule(schedule: MessagePlanScheduleSource): MessagePlanSchedule {
  return {
    scheduleTypeKey: schedule.scheduleTypeKey,
    wording: schedule.wording ?? null,
    personalText: schedule.personalText ?? null,
    attachment: schedule.attachment ?? null,
    giftButton: schedule.giftButton ?? null,
    scheduledFor: schedule.scheduledDate,
  };
}

export type MessagePlanTable = { tableNumber: number; label: string | null } | null;

export function toMessagePlanGuest(
  guest: { name: string; phone?: string | null },
  table: MessagePlanTable,
): MessagePlanGuest {
  return {
    name: guest.name,
    phone: guest.phone ?? null,
    table: table ? { tableNumber: table.tableNumber, label: table.label } : null,
  };
}

export type MessagePlanRenderInput = {
  schedule: MessagePlanScheduleSource;
  event: MessagePlanEvent;
  guest: { name: string; phone?: string | null };
  table: MessagePlanTable;
  /** The Delivery's token, or the Event's preview token for a Test Message. */
  confirmationToken: string;
  /** The public site base, `publicSiteUrl()` in the app. */
  siteUrl: string;
};

/** One Guest's WhatsApp and SMS payloads, saying the same words. */
export function renderMessagePlanForGuest(input: MessagePlanRenderInput): RenderPayloadsResult {
  return renderMessagePlanPayloads({
    schedule: toMessagePlanSchedule(input.schedule),
    event: input.event,
    guest: toMessagePlanGuest(input.guest, input.table),
    links: buildMessageLinks({
      siteUrl: input.siteUrl,
      shortCode: input.event.shortCode,
      confirmationToken: input.confirmationToken,
    }),
    confirmationToken: input.confirmationToken,
    phone: input.guest.phone,
  });
}

/**
 * One Guest's message without a phone: what Hand Delivery types into WhatsApp
 * (`message.smsBody`, real links) and what a preview shows.
 */
export function composeMessagePlanForGuest(
  input: Omit<MessagePlanRenderInput, 'guest'> & { guest: { name: string } },
): ComposeResult {
  return composeMessage({
    schedule: toMessagePlanSchedule(input.schedule),
    event: input.event,
    guest: toMessagePlanGuest(input.guest, input.table),
    links: buildMessageLinks({
      siteUrl: input.siteUrl,
      shortCode: input.event.shortCode,
      confirmationToken: input.confirmationToken,
    }),
    confirmationToken: input.confirmationToken,
  });
}
