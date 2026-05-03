import { randomBytes } from 'crypto';
import type { GuestApp } from '@/features/guests/schemas';
import type { DeliveryMethod } from '../schemas';
import type { WhatsAppTemplateApp } from '../schemas/whatsapp-templates';
import { sendWhatsAppTemplateMessage } from '../actions/whatsapp';
import { sendSmsMessage, buildSmsFallbackBody } from '../actions/sms';
import {
  buildDynamicTemplateParameters,
  buildDynamicButtonParameters,
  buildDynamicHeaderParameters,
  type ParameterResolutionContext,
} from './parameter-resolvers';

// Inline to avoid circular dependency (formatPhoneE164 lives in index.ts
// which re-exports this file).
function formatPhoneE164(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('972')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+972' + cleaned.substring(1);
  return '+972' + cleaned;
}

// ─── Error categorisation ─────────────────────────────────────────────────────
// Edit the sets below to change fallback behavior per Meta error code.

export type WhatsAppErrorCategory = 'rate_limit' | 'transient' | 'permanent';

// Throughput / quality rate-limit codes — no SMS fallback; message should be
// retried or recorded as failed so the organiser can act.
const RATE_LIMIT_CODES = new Set([130429, 131048, 131056]);

// Temporary service issues (e.g. account upgrading tier) — no SMS fallback.
const TRANSIENT_CODES = new Set([131057]);

// Everything else (invalid number 131021, per-user marketing cap 131049,
// unknown codes) → try SMS fallback.
export function categoriseWhatsAppError(
  errorCode: number | undefined,
): WhatsAppErrorCategory {
  if (errorCode !== undefined && RATE_LIMIT_CODES.has(errorCode))
    return 'rate_limit';
  if (errorCode !== undefined && TRANSIENT_CODES.has(errorCode))
    return 'transient';
  return 'permanent';
}

// ─── Per-guest result type ────────────────────────────────────────────────────

export type GuestSendResult = {
  guest: GuestApp;
  success: boolean;
  messageId?: string;
  message: string;
  channel: DeliveryMethod;
  errorCode?: number;
  confirmationToken: string;
};

// ─── Single-guest send ────────────────────────────────────────────────────────

export async function sendToGuest(params: {
  guest: GuestApp;
  context: ParameterResolutionContext;
  template: WhatsAppTemplateApp;
  confirmationToken: string;
}): Promise<GuestSendResult> {
  const { guest, context, template, confirmationToken } = params;
  const phoneE164 = formatPhoneE164(guest.phone!);

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

  if (waResult.success) {
    return {
      guest,
      success: true,
      messageId: waResult.messageId,
      message: waResult.message,
      channel: 'whatsapp',
      confirmationToken,
    };
  }

  const category = categoriseWhatsAppError(waResult.errorCode);

  if (category === 'permanent') {
    const smsBody = buildSmsFallbackBody(context, confirmationToken);
    const smsResult = await sendSmsMessage({ to: phoneE164, body: smsBody });
    if (smsResult.success) {
      return {
        guest,
        success: true,
        messageId: smsResult.messageId,
        message: smsResult.message,
        channel: 'sms',
        confirmationToken,
      };
    }
  }

  return {
    guest,
    success: false,
    message: waResult.message,
    channel: 'whatsapp',
    errorCode: waResult.errorCode,
    confirmationToken,
  };
}

// ─── Chunked batch sender ─────────────────────────────────────────────────────
// Sends in chunks of CHUNK_SIZE to stay within Meta's 80 MPS throughput limit.

const CHUNK_SIZE = 50;
const CHUNK_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendInChunks(
  guests: GuestApp[],
  buildParams: (
    guest: GuestApp,
  ) => Omit<Parameters<typeof sendToGuest>[0], 'guest'>,
): Promise<PromiseSettledResult<GuestSendResult>[]> {
  const allResults: PromiseSettledResult<GuestSendResult>[] = [];

  for (let i = 0; i < guests.length; i += CHUNK_SIZE) {
    const chunk = guests.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.allSettled(
      chunk.map((guest) => sendToGuest({ guest, ...buildParams(guest) })),
    );

    allResults.push(...chunkResults);

    if (i + CHUNK_SIZE < guests.length) {
      await sleep(CHUNK_DELAY_MS);
    }
  }

  return allResults;
}

// ─── Delivery record builder ──────────────────────────────────────────────────

export function buildDeliveryRecord(
  scheduleId: string,
  result: GuestSendResult,
): Record<string, unknown> {
  return {
    schedule_id: scheduleId,
    guest_id: result.guest.id,
    delivery_method: result.channel,
    status: result.success ? 'sent' : 'failed',
    sent_at: result.success ? new Date().toISOString() : null,
    external_message_id: result.messageId ?? null,
    error_message: result.success ? null : result.message,
    error_code: result.errorCode ?? null,
    confirmation_token: result.confirmationToken,
  };
}

// ─── Token generator ──────────────────────────────────────────────────────────

export function generateConfirmationToken(): string {
  return randomBytes(32).toString('hex');
}
