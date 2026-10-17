import { E164_PATTERN } from '@/lib/phone';
import { RECORD_PACKAGE_CHANNEL_LABELS } from '@/features/billing/utils/labels';
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

/** Where each message's first button opens, under /app/<eventId>/. */
const BUTTON_PAGE = {
  welcome: 'home',
  post_event: 'gifting',
} as const satisfies Record<OwnerMessageKind, string>;

const LANGUAGE_CODE = 'he';

export type OwnerMessagePayloadResult =
  | { ok: true; payload: WhatsAppSendPayload }
  | { ok: false; message: string };

export function firstName(fullName: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

function text(value: string) {
  return { type: 'text' as const, text: value };
}

/** The body parameters, in template order, or why the message cannot be filled. */
function bodyParameters(
  kind: OwnerMessageKind,
  name: string,
  facts: OwnerMessageFacts,
): string[] | { message: string } {
  if (kind === 'post_event') return [name];
  if (!facts.channel || facts.packageSize === null) return { message: 'לא נרשם תשלום לאירוע' };
  return [
    name,
    RECORD_PACKAGE_CHANNEL_LABELS[facts.channel],
    facts.packageSize.toLocaleString('he-IL'),
  ];
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
  const to = facts.ownerPhone ?? '';
  if (!E164_PATTERN.test(to)) return { ok: false, message: 'אין מספר טלפון לבעל/ת האירוע' };

  const name = firstName(facts.ownerFullName);
  if (!name) return { ok: false, message: 'אין שם לבעל/ת האירוע' };

  const params = bodyParameters(kind, name, facts);
  if (!Array.isArray(params)) return { ok: false, message: params.message };

  return {
    ok: true,
    payload: {
      channel: 'whatsapp',
      to,
      templateName: OWNER_MESSAGE_TEMPLATES[kind],
      languageCode: LANGUAGE_CODE,
      components: [
        { type: 'body', parameters: params.map(text) },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [text(`app/${facts.eventId}/${BUTTON_PAGE[kind]}`)],
        },
      ],
    },
  };
}
