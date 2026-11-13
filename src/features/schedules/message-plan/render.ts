/**
 * Renders one Guest's message on the current Message Plan: the WhatsApp
 * `SendPayload`, the SMS `SendPayload` derived from the same text, and the
 * plain text the preview and Hand Delivery show.
 *
 * Two steps, so the preview can use the first without a phone number:
 *
 *  - `composeMessage` decides the shape from the Schedule's choices and the
 *    Event's actual state, and fills the text, the parameters and the buttons.
 *  - `renderMessagePlanPayloads` turns that into the two payloads for a phone.
 *
 * Stored choices are read as wishes, never trusted: a gift button with no
 * Gifting set up is left off, an image or video that is not there leaves no
 * header, a Follow-up never carries the video, and a Personal Message that is
 * blank for this Guest sends the Kululu Wording. What cannot be rendered at all
 * is a typed refusal naming why, never an empty parameter, because Meta
 * rejects an empty parameter for the whole audience.
 *
 * Only `import type` from the send path: this module is pure and also runs in
 * the browser for the preview.
 */

import { E164_PATTERN } from '@/lib/phone';
// Deep import rather than the feature barrel: the barrel carries the RSVP
// page's client component, and this module runs in the send path and its tests.
import {
  rsvpNoPayload,
  rsvpYesPayload,
} from '@/features/confirmation/utils/conversation-ids';
import {
  isGiftingEnabled,
  shouldSendTableNumbers,
} from '../utils/event-config';
import { reminderDayFor } from '../utils/message-plan-dates';
import type { MissingDetail } from '../utils/missing-details';
import type {
  SmsSendPayload,
  WhatsAppSendPayload,
} from '../utils/send-payload';
import {
  VALUE_DETAIL,
  fillValue,
  stageOffersTable,
  type FillContext,
} from './fields';
import {
  MESSAGE_PLAN_LANGUAGE,
  SMS_LINK_LABEL,
  bodyVariables,
  fillBody,
  type MessageButton,
} from './message-parts';
import {
  PERSONAL_TEXT_MAX_PARAGRAPHS,
  cleanText,
  fillPersonalText,
  parsePersonalText,
} from './personal-text';
import {
  FOLLOW_UP_ATTACHMENTS,
  INVITATION_ATTACHMENTS,
  shapeHeader,
  stageOfScheduleType,
  templateNameFor,
  type Attachment,
  type FollowUpAttachment,
  type InvitationAttachment,
  type MessageShape,
  type ParagraphCount,
  type Stage,
} from './shape';
import { bodyFor, buttonsFor } from './stages';
import type {
  MessageLinks,
  MessagePlanEvent,
  MessagePlanGuest,
  MessagePlanSchedule,
} from './types';

export type RenderRefusal =
  /** The Schedule Type is not one of the current plan's four. */
  | { reason: 'not_a_message_plan_stage'; scheduleTypeKey: string }
  /** Event details the message names and the Event does not have. */
  | { reason: 'missing_details'; details: MissingDetail[] }
  /** The Event has no short code for the URL buttons. */
  | { reason: 'no_short_code' }
  /** A link the message's buttons become on SMS was not given. */
  | { reason: 'missing_link'; link: keyof MessageLinks }
  /** An Ask's quick replies need the Delivery's confirmation token. */
  | { reason: 'no_confirmation_token' }
  /** The Kululu Reminder's wording follows its day, and it has none. */
  | { reason: 'no_due_time' }
  /** A Reminder due after the Event day has no wording. */
  | { reason: 'reminder_after_event' }
  | { reason: 'no_phone' };

export type RenderedButton = {
  button: MessageButton;
  /** Where it goes: the quick replies have none. */
  link: string | null;
  /** What the send fills in: a quick reply's payload, or a URL button's suffix. */
  parameter: string;
};

export type ComposedMessage = {
  stage: Stage;
  shape: MessageShape;
  templateName: string;
  header: { type: 'image' | 'video'; link: string } | null;
  /** One per template variable, in order. */
  bodyParameters: string[];
  /** The WhatsApp body as the Guest reads it, Wrapper included. */
  body: string;
  buttons: RenderedButton[];
  /** The SMS: the same words, then one link line per button. */
  smsBody: string;
  /** The body and the button labels, for the preview and Hand Delivery. */
  plainText: string;
};

export type ComposeResult =
  | { ok: true; message: ComposedMessage }
  | { ok: false; refusal: RenderRefusal };

export type ComposeInput = {
  schedule: MessagePlanSchedule;
  event: MessagePlanEvent;
  guest: Pick<MessagePlanGuest, 'name' | 'table'>;
  links: MessageLinks;
  /** The Delivery's confirmation token, for the quick replies. Null in a preview. */
  confirmationToken: string | null;
};

// ─── Shape ───────────────────────────────────────────────────────────────────

function validUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/** The Event's link for a header medium, or null when it has none that parses. */
function attachmentLink(
  event: MessagePlanEvent,
  medium: 'image' | 'video',
): string | null {
  return validUrl(
    medium === 'image' ? event.invitations?.imageUrl : event.invitationVideoUrl,
  );
}

/**
 * The header an Ask actually carries: what the Schedule chose, when the stage
 * offers it (a Follow-up never carries the video) and the Event has it.
 * Anything missing falls back to no header, never to the other medium.
 */
export function effectiveAttachment(
  stage: 'invitation',
  requested: MessagePlanSchedule['attachment'],
  event: MessagePlanEvent,
): InvitationAttachment;
export function effectiveAttachment(
  stage: 'follow_up',
  requested: MessagePlanSchedule['attachment'],
  event: MessagePlanEvent,
): FollowUpAttachment;
export function effectiveAttachment(
  stage: 'invitation' | 'follow_up',
  requested: MessagePlanSchedule['attachment'],
  event: MessagePlanEvent,
): Attachment {
  const offered: readonly Attachment[] =
    stage === 'invitation' ? INVITATION_ATTACHMENTS : FOLLOW_UP_ATTACHMENTS;
  if (!requested || requested === 'none' || !offered.includes(requested))
    return 'none';
  return attachmentLink(event, requested) ? requested : 'none';
}

/** The gift button is on only when switched on and the Gifting page is set up. */
export function effectiveGift(
  requested: boolean | null,
  event: MessagePlanEvent,
): boolean {
  return requested === true && isGiftingEnabled(event.eventSettings);
}

/** The table a Guest is sent: none when the Event's "send table numbers" switch is off. */
export function effectiveTable(
  guest: Pick<MessagePlanGuest, 'table'>,
  event: MessagePlanEvent,
): MessagePlanGuest['table'] {
  return shouldSendTableNumbers(event.guestExperience ?? undefined)
    ? guest.table
    : null;
}

function pickShape(params: {
  stage: Stage;
  schedule: MessagePlanSchedule;
  event: MessagePlanEvent;
  hasTable: boolean;
  paragraphs: number;
}): { ok: true; shape: MessageShape } | { ok: false; refusal: RenderRefusal } {
  const { stage, schedule, event, hasTable } = params;
  const personal = params.paragraphs > 0;
  const paragraphs = Math.min(
    params.paragraphs,
    PERSONAL_TEXT_MAX_PARAGRAPHS,
  ) as ParagraphCount;
  const gift = effectiveGift(schedule.giftButton, event);

  switch (stage) {
    case 'invitation': {
      const attachment = effectiveAttachment(stage, schedule.attachment, event);
      return {
        ok: true,
        shape: personal
          ? { stage, wording: 'personal', attachment, paragraphs }
          : { stage, wording: 'kululu', attachment },
      };
    }
    case 'follow_up': {
      const attachment = effectiveAttachment(stage, schedule.attachment, event);
      return {
        ok: true,
        shape: personal
          ? { stage, wording: 'personal', attachment, paragraphs }
          : { stage, wording: 'kululu', attachment },
      };
    }
    case 'event_reminder': {
      // Either wording: a Reminder is due on the Event day or before it (ADR 0053).
      const day =
        schedule.scheduledFor && event.eventDate
          ? reminderDayFor(schedule.scheduledFor, event.eventDate)
          : undefined;
      if (day === null)
        return { ok: false, refusal: { reason: 'reminder_after_event' } };
      // The Owner's text reads the same on any day, so it needs no day to pick a wording by.
      if (personal)
        return {
          ok: true,
          shape: { stage, wording: 'personal', gift, paragraphs },
        };
      if (!event.eventDate)
        return {
          ok: false,
          refusal: { reason: 'missing_details', details: ['eventDate'] },
        };
      if (!day) return { ok: false, refusal: { reason: 'no_due_time' } };
      return {
        ok: true,
        shape: { stage, wording: 'kululu', day, table: hasTable, gift },
      };
    }
    case 'thank_you':
      return {
        ok: true,
        shape: personal
          ? { stage, wording: 'personal', gift, paragraphs }
          : { stage, wording: 'kululu', gift },
      };
  }
}

// ─── Compose ─────────────────────────────────────────────────────────────────

/** The link a button becomes on SMS, which has no quick replies: they go to the RSVP page. */
function smsLinkTarget(button: MessageButton): keyof MessageLinks {
  return button.kind === 'quick_reply' ? 'rsvp' : button.target;
}

/** One line per link the buttons become on SMS. The Asks' two quick replies share the RSVP link. */
function smsLinkLines(
  buttons: readonly MessageButton[],
  links: MessageLinks,
): string[] {
  const targets = new Set(buttons.map(smsLinkTarget));
  return [...targets].map((target) => `${SMS_LINK_LABEL[target]}: ${links[target]}`);
}

/**
 * Decides the shape and fills the message for one Guest. Needs no phone
 * number, so the preview and the Test Message use it as the send does.
 */
export function composeMessage(input: ComposeInput): ComposeResult {
  const { schedule, event, links } = input;
  const stage = stageOfScheduleType(schedule.scheduleTypeKey);
  if (!stage) {
    return {
      ok: false,
      refusal: {
        reason: 'not_a_message_plan_stage',
        scheduleTypeKey: schedule.scheduleTypeKey,
      },
    };
  }

  const table = stageOffersTable(stage)
    ? effectiveTable(input.guest, event)
    : null;
  const context: FillContext = {
    event,
    guest: { name: input.guest.name, table },
  };

  // A Reminder always navigates, so it needs a venue and a short code whatever its wording (ADR 0053).
  if (stage === 'event_reminder' && fillValue('venueName', context) === null) {
    return {
      ok: false,
      refusal: { reason: 'missing_details', details: ['venue'] },
    };
  }

  const paragraphs =
    schedule.wording === 'personal'
      ? fillPersonalText(parsePersonalText(schedule.personalText), context)
      : [];

  const picked = pickShape({
    stage,
    schedule,
    event,
    hasTable: table !== null,
    paragraphs: paragraphs.length,
  });
  if (!picked.ok) return picked;
  const { shape } = picked;

  const parts = bodyFor(shape);
  const bodyParameters: string[] = [];
  const missing: MissingDetail[] = [];
  for (const variable of bodyVariables(parts)) {
    if (variable.kind === 'paragraph') {
      bodyParameters.push(paragraphs[variable.index] ?? '');
      continue;
    }
    const value = fillValue(variable.key, context);
    if (value === null) {
      const detail = VALUE_DETAIL[variable.key];
      if (detail && !missing.includes(detail)) missing.push(detail);
    }
    bodyParameters.push(cleanText(value ?? '').trim());
  }
  if (missing.length)
    return {
      ok: false,
      refusal: { reason: 'missing_details', details: missing },
    };

  const buttonDefinitions = buttonsFor(shape);
  const shortCode = event.shortCode?.trim() || null;
  const buttons: RenderedButton[] = [];
  for (const button of buttonDefinitions) {
    if (button.kind === 'quick_reply') {
      // The SMS sends the RSVP link in place of the quick replies.
      if (!links.rsvp)
        return { ok: false, refusal: { reason: 'missing_link', link: 'rsvp' } };
      const token = input.confirmationToken;
      buttons.push({
        button,
        link: null,
        parameter: token
          ? button.answer === 'yes'
            ? rsvpYesPayload(token)
            : rsvpNoPayload(token)
          : '',
      });
      continue;
    }
    if (!shortCode) return { ok: false, refusal: { reason: 'no_short_code' } };
    const link = links[button.target];
    if (!link)
      return {
        ok: false,
        refusal: { reason: 'missing_link', link: button.target },
      };
    buttons.push({ button, link, parameter: shortCode });
  }

  const headerType = shapeHeader(shape);
  const headerLink = headerType ? attachmentLink(event, headerType) : null;

  const body = fillBody(parts, bodyParameters);
  const smsBody = [body, ...smsLinkLines(buttonDefinitions, links)].join('\n');
  const plainText = buttonDefinitions.length
    ? `${body}\n\n${buttonDefinitions.map((b) => `[${b.text}]`).join(' ')}`
    : body;

  return {
    ok: true,
    message: {
      stage,
      shape,
      templateName: templateNameFor(shape),
      header:
        headerType && headerLink
          ? { type: headerType, link: headerLink }
          : null,
      bodyParameters,
      body,
      buttons,
      smsBody,
      plainText,
    },
  };
}

// ─── Payloads ────────────────────────────────────────────────────────────────

/** Meta's components for a composed message, in the order the Graph API expects. */
export function whatsAppComponents(
  message: ComposedMessage,
): WhatsAppSendPayload['components'] {
  const components: WhatsAppSendPayload['components'] = [];
  if (message.header) {
    components.push({
      type: 'header',
      parameters: [
        message.header.type === 'image'
          ? { type: 'image', image: { link: message.header.link } }
          : { type: 'video', video: { link: message.header.link } },
      ],
    });
  }
  if (message.bodyParameters.length) {
    components.push({
      type: 'body',
      parameters: message.bodyParameters.map((text) => ({
        type: 'text' as const,
        text,
      })),
    });
  }
  message.buttons.forEach((rendered, index) => {
    components.push(
      rendered.button.kind === 'quick_reply'
        ? {
            type: 'button',
            sub_type: 'quick_reply',
            index,
            parameters: [{ type: 'payload', payload: rendered.parameter }],
          }
        : {
            type: 'button',
            sub_type: 'url',
            index,
            parameters: [{ type: 'text', text: rendered.parameter }],
          },
    );
  });
  return components;
}

export type RenderedPayloads = {
  message: ComposedMessage;
  whatsapp: WhatsAppSendPayload;
  sms: SmsSendPayload;
};

export type RenderPayloadsResult =
  | ({ ok: true } & RenderedPayloads)
  | { ok: false; refusal: RenderRefusal };

/**
 * The two payloads for one Guest's phone: WhatsApp first, and the SMS an SMS
 * Fallback sends, saying the same words.
 */
export function renderMessagePlanPayloads(
  input: ComposeInput & {
    /** The Guest's phone in E.164, as `guests.phone_number` stores it. */
    phone: string | null | undefined;
  },
): RenderPayloadsResult {
  // Guest phones are stored in E.164 (src/lib/phone.ts), so this checks rather than re-parses.
  const to = input.phone?.trim() ?? '';
  if (!E164_PATTERN.test(to))
    return { ok: false, refusal: { reason: 'no_phone' } };

  const composed = composeMessage(input);
  if (!composed.ok) return composed;
  const { message } = composed;
  if (
    message.buttons.some((b) => b.button.kind === 'quick_reply' && !b.parameter)
  ) {
    return { ok: false, refusal: { reason: 'no_confirmation_token' } };
  }

  return {
    ok: true,
    message,
    whatsapp: {
      channel: 'whatsapp',
      to,
      templateName: message.templateName,
      languageCode: MESSAGE_PLAN_LANGUAGE,
      components: whatsAppComponents(message),
    },
    sms: { channel: 'sms', to, body: message.smsBody },
  };
}

// ─── Links ───────────────────────────────────────────────────────────────────

/**
 * The links for one Guest, from the site's base URL (configuration, so the
 * caller passes it in). The same paths the WhatsApp buttons were registered
 * with, so the SMS goes where the button does.
 */
export function buildMessageLinks(params: {
  siteUrl: string;
  shortCode: string | null | undefined;
  confirmationToken: string | null | undefined;
}): MessageLinks {
  const site = params.siteUrl.replace(/\/+$/, '');
  const code = params.shortCode?.trim();
  const token = params.confirmationToken?.trim();
  return {
    rsvp: token ? `${site}/c/${token}` : null,
    navigation: code ? `${site}/nav/${code}` : null,
    gift: code ? `${site}/r/${code}` : null,
  };
}

/** A refusal as one line for a dispatch attempt's error, in the send path's language. */
export function describeRefusal(refusal: RenderRefusal): string {
  switch (refusal.reason) {
    case 'not_a_message_plan_stage':
      return `Schedule type ${refusal.scheduleTypeKey} is not on the current Message Plan`;
    case 'missing_details':
      return `The Event is missing details this message names: ${refusal.details.join(', ')}`;
    case 'no_short_code':
      return 'The Event has no short code for the message buttons';
    case 'missing_link':
      return `No ${refusal.link} link was given for this message`;
    case 'no_confirmation_token':
      return 'No confirmation token for the RSVP buttons';
    case 'no_due_time':
      return 'The Event Reminder has no Due Time to choose its wording by';
    case 'reminder_after_event':
      return 'The Event Reminder is due after the Event day';
    case 'no_phone':
      return 'No usable phone number';
  }
}
