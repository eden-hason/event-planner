import { E164_PATTERN } from '@/lib/phone';
import type { WhatsAppSendPayload } from '@/features/schedules/utils/send-payload';
import type { OwnerMessageFacts, OwnerMessageKind } from '../types';

/**
 * The Meta templates behind the two Owner Messages. They are not catalog
 * Templates (no Variant, no SMS Rendition, nothing the Owner picks), so they
 * are named here rather than in message_templates. Their approved text and
 * buttons are in docs/design/owner-message-templates.md.
 *
 * Both URL buttons are dynamic with the whole path as the suffix, so the
 * domain is fixed once in Meta and the code only ever says where in the app.
 */
export const OWNER_MESSAGE_TEMPLATES = {
  welcome: 'owner_welcome_1',
  post_event: 'owner_post_event_1',
} as const satisfies Record<OwnerMessageKind, string>;

const LANGUAGE_CODE = 'he';

/** The Plan as the welcome names it. */
const PLAN_LABEL: Record<NonNullable<OwnerMessageFacts['channel']>, string> = {
  whatsapp: 'WhatsApp',
  whatsapp_calls: 'WhatsApp + שיחות',
  sms: 'SMS',
};

export type OwnerMessagePayloadResult =
  | { ok: true; payload: WhatsAppSendPayload }
  | { ok: false; message: string };

export function firstName(fullName: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

function urlButton(index: number, suffix: string) {
  return {
    type: 'button' as const,
    sub_type: 'url',
    index,
    parameters: [{ type: 'text' as const, text: suffix }],
  };
}

function text(value: string) {
  return { type: 'text' as const, text: value };
}

/**
 * Renders an Owner Message for Meta, or says why it cannot be sent. Every
 * reason here is final for this send: a missing phone or name will not appear
 * by retrying in five minutes.
 */
export function buildOwnerMessagePayload(
  kind: OwnerMessageKind,
  facts: OwnerMessageFacts,
): OwnerMessagePayloadResult {
  // profiles.phone_number is stored in E.164 and checked by a constraint, so
  // anything else is a missing number, not one to reformat.
  const to = facts.ownerPhone?.trim() ?? '';
  if (!E164_PATTERN.test(to)) return { ok: false, message: 'אין מספר טלפון לבעל/ת האירוע' };

  const name = firstName(facts.ownerFullName);
  if (!name) return { ok: false, message: 'אין שם לבעל/ת האירוע' };

  if (kind === 'post_event') {
    return {
      ok: true,
      payload: {
        channel: 'whatsapp',
        to,
        templateName: OWNER_MESSAGE_TEMPLATES.post_event,
        languageCode: LANGUAGE_CODE,
        components: [
          { type: 'body', parameters: [text(name)] },
          urlButton(0, `app/${facts.eventId}/gifting`),
        ],
      },
    };
  }

  if (!facts.channel || facts.packageSize === null) {
    return { ok: false, message: 'לא נרשם תשלום לאירוע' };
  }

  return {
    ok: true,
    payload: {
      channel: 'whatsapp',
      to,
      templateName: OWNER_MESSAGE_TEMPLATES.welcome,
      languageCode: LANGUAGE_CODE,
      components: [
        {
          type: 'body',
          parameters: [
            text(name),
            text(PLAN_LABEL[facts.channel]),
            text(facts.packageSize.toLocaleString('he-IL')),
          ],
        },
        urlButton(0, `app/${facts.eventId}/home`),
      ],
    },
  };
}
