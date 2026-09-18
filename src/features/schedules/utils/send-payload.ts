import { toE164 } from '@/lib/phone';
import type { MessageTemplateApp } from '../schemas/message-templates';
import { toWhatsAppTemplate } from '../schemas/message-templates';
import { buildSmsBody } from './send-helpers';
import {
  getValueByPath,
  buildDynamicTemplateParameters,
  buildDynamicButtonParameters,
  buildDynamicHeaderParameters,
  type ButtonComponent,
  type MediaParameter,
  type ParameterResolutionContext,
} from './parameter-resolvers';

/**
 * The Dispatcher/Worker seam (ADR 0013).
 *
 * The seam is a rendered payload, not a set of ids. The Dispatcher builds each
 * message in full - parameters resolved, table variant chosen, RSVP link
 * embedded - and stores it on the Delivery; the Worker reads it, posts it, and
 * records the outcome, knowing nothing about Guests, Events or Templates.
 *
 * Two things follow, and both are the point:
 *
 *   - every way a message can be wrong fails on the Dispatcher's side, where
 *     it is one logged row per Schedule rather than hundreds of per-Guest
 *     attempt errors
 *   - a retry resends byte-identical bytes, because nothing is re-derived from
 *     a world that has moved on since the first attempt
 *
 * The cost is that a payload is frozen at dispatch: a table assignment made in
 * the intervening seconds is not picked up. That is no worse than the old
 * engine, which also resolved once per send.
 */

export type WhatsAppSendPayload = {
  channel: 'whatsapp';
  to: string;
  templateName: string;
  languageCode: string;
  components: (
    | { type: 'header' | 'body'; parameters: MediaParameter[] }
    | ButtonComponent
  )[];
};

export type SmsSendPayload = {
  channel: 'sms';
  to: string;
  body: string;
};

/**
 * Discriminated on channel because a Schedule whose own channel is SMS
 * dispatches through the same queue and the same Worker.
 */
export type SendPayload = WhatsAppSendPayload | SmsSendPayload;

/** Meta's template components, in the order the Graph API expects them. */
export function buildWhatsAppComponents(params: {
  parameters?: MediaParameter[];
  headerParameters?: MediaParameter[];
  buttonParameters?: ButtonComponent[];
}): WhatsAppSendPayload['components'] {
  const components: WhatsAppSendPayload['components'] = [];
  if (params.headerParameters?.length) {
    components.push({ type: 'header', parameters: params.headerParameters });
  }
  if (params.parameters?.length) {
    components.push({ type: 'body', parameters: params.parameters });
  }
  // Each button is its own component, already shaped by the resolver.
  if (params.buttonParameters?.length) {
    components.push(...params.buttonParameters);
  }
  return components;
}

export type RenderFailure = { ok: false; reason: string };
export type RenderSuccess = { ok: true; payload: SendPayload };
export type RenderResult = RenderSuccess | RenderFailure;

/**
 * Renders one Guest's message in full.
 *
 * Returns a reason rather than throwing, because the Dispatcher turns any
 * failure here into a single `failed` dispatch attempt for the whole Schedule:
 * a template whose parameters cannot be resolved is broken for everyone, and
 * reporting it once with a reason is more use to an Operator than 274 identical
 * per-Guest errors.
 */
export function renderSendPayload(params: {
  template: MessageTemplateApp;
  context: ParameterResolutionContext;
  phone: string | null | undefined;
}): RenderResult {
  const { template, context } = params;

  const to = toE164(params.phone);
  if (!to) {
    return { ok: false, reason: 'No usable phone number' };
  }

  const missing = missingOccasionPhrase(template, context);
  if (missing) return { ok: false, reason: missing };

  try {
    if (template.channel === 'sms') {
      return {
        ok: true,
        payload: { channel: 'sms', to, body: buildSmsBody(template.payload, context) },
      };
    }

    const whatsApp = toWhatsAppTemplate(template);
    if (!whatsApp) {
      return { ok: false, reason: `Template ${template.key} is not a WhatsApp template` };
    }

    const placeholders = whatsApp.parameters?.placeholders;
    if (!placeholders) {
      return { ok: false, reason: `Template ${whatsApp.templateName} has no parameter definition` };
    }

    return {
      ok: true,
      payload: {
        channel: 'whatsapp',
        to,
        templateName: whatsApp.templateName,
        languageCode: whatsApp.languageCode,
        components: buildWhatsAppComponents({
          parameters: buildDynamicTemplateParameters(placeholders, context),
          headerParameters: whatsApp.parameters?.headerPlaceholders?.length
            ? buildDynamicHeaderParameters(whatsApp.parameters.headerPlaceholders, context)
            : undefined,
          buttonParameters: whatsApp.parameters?.buttonPlaceholders?.length
            ? buildDynamicButtonParameters(whatsApp.parameters.buttonPlaceholders, context)
            : undefined,
        }),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Could not render the message',
    };
  }
}

/**
 * A template that names the Event by its Occasion Phrase ("הוזמנתם ל{{1}}")
 * cannot go out without one: the sentence would end at "ל", and Meta rejects an
 * empty parameter anyway. The phrase is null for an unknown event type or an
 * Event with no host names, and this says so once, for the whole Schedule,
 * instead of a failed attempt per Guest.
 */
export function missingOccasionPhrase(
  template: MessageTemplateApp,
  context: ParameterResolutionContext,
): string | null {
  // The follow-up's opening line is built from the same hosts, so it is
  // missing in exactly the same cases.
  const missing = template.payload.parameters.placeholders.some((placeholder) => {
    const source = placeholder.source ?? placeholder.name;
    return (
      (source === 'event.occasionPhrase' || source === 'event.approachingLine') &&
      !getValueByPath(context as unknown as Record<string, unknown>, source)
    );
  });
  if (!missing) return null;
  return 'The event has no host names (or no event type) to name it by in this message';
}

/**
 * Narrows a payload read back out of the database.
 *
 * The Worker trusts `send_payload` to be shaped correctly - the Dispatcher
 * wrote it - but the column is jsonb and a row could predate a change to the
 * shape, so the claim is checked rather than cast.
 */
export function parseSendPayload(value: unknown): SendPayload | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;

  if (payload.channel === 'sms') {
    return typeof payload.to === 'string' && typeof payload.body === 'string'
      ? { channel: 'sms', to: payload.to, body: payload.body }
      : null;
  }

  if (payload.channel === 'whatsapp') {
    return typeof payload.to === 'string' &&
      typeof payload.templateName === 'string' &&
      typeof payload.languageCode === 'string' &&
      Array.isArray(payload.components)
      ? (payload as unknown as WhatsAppSendPayload)
      : null;
  }

  return null;
}
