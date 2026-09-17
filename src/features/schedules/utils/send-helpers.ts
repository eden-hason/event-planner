import { randomBytes } from 'crypto';
import { toE164 } from '@/lib/phone';
import type { GuestApp } from '@/features/guests/schemas';
import type { DeliveryMethod } from '../schemas';
import type { SmsPayload, WhatsAppTemplateApp } from '../schemas/message-templates';
import { sendWhatsAppTemplateMessage } from '../actions/whatsapp';
import { sendSmsMessage } from '../actions/sms';
import {
  buildDynamicTemplateParameters,
  buildDynamicButtonParameters,
  buildDynamicHeaderParameters,
  type ParameterResolutionContext,
} from './parameter-resolvers';

// There is no inline SMS fallback here any more. Most WhatsApp failures arrive
// through the webhook after the send call has already succeeded, so reacting
// only to a synchronous error missed the cases that matter. A failed attempt is
// recorded as failed, and an Operator launches the SMS Fallback for the
// schedule from the Back Office (services/send-sms-fallback.ts, ADR 0012).

// ─── Per-guest result type ────────────────────────────────────────────────────

export type GuestSendResult = {
  guest: GuestApp;
  success: boolean;
  messageId?: string;
  message: string;
  channel: DeliveryMethod;
  errorCode?: number;
  confirmationToken: string;
  /**
   * The template this guest was sent, recorded per delivery because one send
   * can use two of them - a guest with no seating assignment gets the variant
   * without a table number while everyone else gets the one with it.
   */
  templateId: string;
};

// ─── Single-guest send ────────────────────────────────────────────────────────

export async function sendToGuest(params: {
  guest: GuestApp;
  context: ParameterResolutionContext;
  template: WhatsAppTemplateApp;
  templateId: string;
  confirmationToken: string;
}): Promise<GuestSendResult> {
  const { guest, context, template, templateId, confirmationToken } = params;

  // Callers filter the audience on isValidPhone first, so a null here is a
  // guest whose stored number does not parse at all. Fail the send rather than
  // dialling a number we had to guess at.
  const phoneE164 = toE164(guest.phone);
  if (!phoneE164) {
    return {
      guest,
      success: false,
      message: 'No usable phone number',
      channel: 'whatsapp',
      confirmationToken,
      templateId,
    };
  }

  const parameters = buildDynamicTemplateParameters(
    template.parameters!.placeholders,
    context,
  );

  const headerParameters = template.parameters?.headerPlaceholders?.length
    ? buildDynamicHeaderParameters(template.parameters.headerPlaceholders, context)
    : undefined;

  const buttonParameters = template.parameters?.buttonPlaceholders?.length
    ? buildDynamicButtonParameters(template.parameters.buttonPlaceholders, context)
    : undefined;

  const waResult = await sendWhatsAppTemplateMessage({
    to: phoneE164,
    templateName: template.templateName,
    languageCode: template.languageCode,
    parameters,
    headerParameters,
    buttonParameters,
  });

  if (waResult.outcome === 'accepted') {
    return {
      guest,
      success: true,
      messageId: waResult.messageId ?? undefined,
      message: 'Message sent successfully',
      channel: 'whatsapp',
      confirmationToken,
      templateId,
    };
  }

  // This path has no Delivery and no retry - it is a one-off test message an
  // Owner sent themselves - so a rejection and an unknown outcome are reported
  // the same way. The pipeline, where the difference decides whether a guest
  // can be written to twice, handles them separately in the Worker.
  return {
    guest,
    success: false,
    message: waResult.message,
    channel: 'whatsapp',
    errorCode: waResult.outcome === 'rejected' ? (waResult.errorCode ?? undefined) : undefined,
    confirmationToken,
    templateId,
  };
}

// ─── SMS primary send ─────────────────────────────────────────────────────────

/**
 * Interpolates an SMS template payload body: each placeholder config resolves
 * positionally into {{1}}, {{2}}, ... (insertion order defines position).
 */
export function buildSmsBody(
  payload: SmsPayload,
  context: ParameterResolutionContext,
): string {
  const params = buildDynamicTemplateParameters(
    payload.parameters.placeholders,
    context,
  );
  let body = payload.bodyText;
  params.forEach((param, i) => {
    body = body.replace(`{{${i + 1}}}`, param.text);
  });
  return body;
}

export async function sendSmsToGuest(params: {
  guest: GuestApp;
  context: ParameterResolutionContext;
  smsPayload: SmsPayload;
  templateId: string;
  confirmationToken: string;
}): Promise<GuestSendResult> {
  const { guest, context, smsPayload, templateId, confirmationToken } = params;

  const phoneE164 = toE164(guest.phone);
  if (!phoneE164) {
    return {
      guest,
      success: false,
      message: 'No usable phone number',
      channel: 'sms',
      confirmationToken,
      templateId,
    };
  }

  const body = buildSmsBody(smsPayload, context);
  const result = await sendSmsMessage({ to: phoneE164, body });

  return {
    guest,
    success: result.success,
    messageId: result.messageId,
    message: result.message,
    channel: 'sms',
    confirmationToken,
    templateId,
  };
}

// ─── Chunked batch sender ─────────────────────────────────────────────────────
// Sends in chunks of CHUNK_SIZE to stay within Meta's 80 MPS throughput limit.

const CHUNK_SIZE = 25;
const CHUNK_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendInChunks(
  guests: GuestApp[],
  buildParams: (
    guest: GuestApp,
  ) => Omit<Parameters<typeof sendToGuest>[0], 'guest'>,
  onChunkComplete?: (
    results: PromiseSettledResult<GuestSendResult>[],
    chunkIndex: number,
    totalChunks: number,
  ) => Promise<void>,
): Promise<PromiseSettledResult<GuestSendResult>[]> {
  const allResults: PromiseSettledResult<GuestSendResult>[] = [];
  const totalChunks = Math.ceil(guests.length / CHUNK_SIZE);

  for (let i = 0; i < guests.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    const chunk = guests.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.allSettled(
      chunk.map((guest) => sendToGuest({ guest, ...buildParams(guest) })),
    );

    allResults.push(...chunkResults);

    if (onChunkComplete) {
      await onChunkComplete(chunkResults, chunkIndex, totalChunks);
    }

    if (i + CHUNK_SIZE < guests.length) {
      await sleep(CHUNK_DELAY_MS);
    }
  }

  return allResults;
}

// ─── Attempt record builder ───────────────────────────────────────────────────

export type AttemptTrigger = 'scheduled' | 'manual' | 'fallback';

/**
 * One message_delivery_attempts row. The parent message_deliveries row is
 * never written from a send result - its status is rolled up from its attempts
 * in the database (ADR 0011).
 */
export function buildAttemptRecord(
  deliveryId: string,
  result: GuestSendResult,
  triggeredBy: AttemptTrigger = 'scheduled',
): Record<string, unknown> {
  return {
    delivery_id: deliveryId,
    channel: result.channel,
    template_id: result.templateId,
    status: result.success ? 'sent' : 'failed',
    sent_at: result.success ? new Date().toISOString() : null,
    external_message_id: result.messageId ?? null,
    error_message: result.success ? null : result.message,
    error_code: result.errorCode ?? null,
    triggered_by: triggeredBy,
  };
}

// ─── Token generator ──────────────────────────────────────────────────────────

const BASE62_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const TOKEN_LENGTH = 12;

// Largest multiple of 62 that fits in a byte. Bytes at or above it are
// discarded rather than folded, since 256 is not a multiple of 62 and plain
// modulo would over-represent the first 8 characters of the alphabet.
const BASE62_REJECTION_THRESHOLD = 248;

export function generateConfirmationToken(): string {
  // 12 base62 characters is ~71 bits - unreachable by online guessing even
  // with millions of live tokens - while keeping the SMS-embedded link short.
  // Alphanumeric only (no - or _), which SMS clients autolink most reliably.
  // Tokens already sent out were 32 hex characters, and originally 64; both
  // still resolve, since lookup is an exact match on the stored value.
  let token = '';

  while (token.length < TOKEN_LENGTH) {
    for (const byte of randomBytes(TOKEN_LENGTH)) {
      if (byte >= BASE62_REJECTION_THRESHOLD) continue;
      token += BASE62_ALPHABET[byte % 62];
      if (token.length === TOKEN_LENGTH) break;
    }
  }

  return token;
}
