import type { WhatsAppSendPayload } from '../utils/send-payload';

/**
 * The transport: the one place anything in Kululu posts to Meta.
 *
 * Deliberately NOT a Server Action. Every export of a `'use server'` module
 * becomes a callable endpoint, so having the raw transport there published an
 * unauthenticated "send this template to this number" route to the internet.
 * It is a service - the Worker and the manual send are its only callers, and
 * both already run behind their own authorisation.
 */

/**
 * What came back from Meta, as three genuinely different things.
 *
 * ADR 0014 depends entirely on this distinction. The old code flattened a
 * thrown `fetch` into the same `{ success: false }` shape as an HTTP rejection,
 * which erased the only line that matters: whether Meta answered at all.
 *
 *  - `accepted`  - Meta took the message. It may still fail later, by webhook.
 *  - `rejected`  - Meta answered, refusing it. The message provably did not go
 *                  out, so a transient rejection may safely be retried.
 *  - `unknown`   - no answer came back. The request may well have reached Meta
 *                  and sent the message. There is no idempotency key to ask
 *                  with, so this is never retried.
 */
export type WhatsAppSendResult =
  | { outcome: 'accepted'; messageId: string | null }
  | { outcome: 'rejected'; httpStatus: number; errorCode: number | null; message: string }
  | { outcome: 'unknown'; message: string };

const GRAPH_API_VERSION = 'v22.0';

/**
 * Posts an already-rendered payload to Meta's Graph API.
 *
 * This is the whole of the Worker's contact with WhatsApp: it is handed bytes
 * and returns what happened to them. Nothing here knows about Guests, Events or
 * Templates - see docs/adr/0013.
 */
export async function postWhatsAppTemplate(
  payload: WhatsAppSendPayload,
): Promise<WhatsAppSendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    // Configuration, not a send. Nothing left the process, so this is a
    // rejection rather than an unknown - there is nothing to duplicate.
    return {
      outcome: 'rejected',
      httpStatus: 0,
      errorCode: null,
      message: 'WhatsApp is not configured',
    };
  }

  const body = {
    messaging_product: 'whatsapp',
    to: payload.to,
    type: 'template',
    template: {
      name: payload.templateName,
      language: { code: payload.languageCode },
      ...(payload.components.length > 0 && { components: payload.components }),
    },
  };

  let response: Response;
  try {
    response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
  } catch (error) {
    // A thrown fetch may have reached Meta - a connection reset after the
    // request was written looks exactly like one that was never sent. Treated
    // as unknown and never retried; the reaper turns it into a System-level
    // failure in front of an Operator.
    console.error('[whatsapp] No answer from Meta:', error);
    return {
      outcome: 'unknown',
      message: error instanceof Error ? error.message : 'No answer from WhatsApp',
    };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const metaErrorCode =
      typeof errorData?.error?.code === 'number' ? errorData.error.code : null;

    console.error(
      '[whatsapp] Rejected:',
      JSON.stringify({
        status: response.status,
        error: errorData?.error ?? null,
        template: payload.templateName,
      }),
    );

    return {
      outcome: 'rejected',
      httpStatus: response.status,
      errorCode: metaErrorCode,
      message:
        errorData?.error?.message || `WhatsApp API error: ${response.statusText}`,
    };
  }

  // A 2xx whose body cannot be read still means Meta accepted the message, so
  // it must not become an unknown: that would lose the fact that it went out.
  const data = await response.json().catch(() => null);
  return { outcome: 'accepted', messageId: data?.messages?.[0]?.id ?? null };
}
