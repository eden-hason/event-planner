import { createHmac, timingSafeEqual } from 'crypto';
import { after, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  processWebhookEvent,
  storeWebhookEvent,
  sweepUnprocessedWebhookEvents,
} from '@/lib/webhooks/inbox';
import {
  TAG,
  collectFields,
  debugEnabled,
  processWhatsAppWebhookEvent,
  type WhatsAppWebhookPayload,
} from '@/features/schedules/services/process-whatsapp-webhook';

// node:crypto and the service-role client both rule out the edge runtime.
export const runtime = 'nodejs';

/** A stored row still unprocessed after this long is picked up by the next sweep. */
const SWEEP_AFTER_MS = 2 * 60 * 1000;
/** Bounded so one notification never turns into a long catch-up job. */
const SWEEP_LIMIT = 25;

// ---------------------------------------------------------------------------
// GET - Meta webhook verification handshake
//
// Every rejection path logs its own reason. The handshake is configured by
// hand in the Meta console against an environment set somewhere else entirely,
// so "it says verification failed" needs to be answerable from the logs alone.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error(
      `${TAG} Handshake rejected: WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set in this environment. A Vercel env var only reaches a deployment built after it was added - redeploy after setting it.`,
    );
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (mode !== 'subscribe') {
    console.warn(
      `${TAG} Handshake rejected: hub.mode was ${mode ?? 'absent'}, expected "subscribe"`,
    );
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (token !== verifyToken) {
    // Lengths, never the values. A mismatch here is nearly always a stale token
    // in one of the two places, or whitespace picked up in a copy-paste, and
    // the two lengths separate those cases without printing the secret.
    console.warn(
      `${TAG} Handshake rejected: verify token mismatch (Meta sent ${token?.length ?? 0} chars, this environment holds ${verifyToken.length}). Check for a stale value or trailing whitespace on either side.`,
    );
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!challenge) {
    console.warn(`${TAG} Handshake rejected: hub.challenge was absent`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  console.log(`${TAG} Handshake verified, echoing challenge`);

  // Meta expects the challenge echoed back as a bare string.
  return new Response(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ---------------------------------------------------------------------------
// POST - notifications from the Meta WhatsApp Cloud API
//
// Store first, process second (see src/lib/webhooks/inbox.ts). The raw body is
// in webhook_events before Meta hears 200, so a processing failure is a row to
// retry, not an event lost behind a response we already sent.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const body = await request.text();

  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    console.warn(
      `${TAG} Rejected: no X-Hub-Signature-256 header. Meta always signs; an unsigned request is something else calling this URL.`,
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    // Signed by Meta but unparseable - retrying will not help, so take it off
    // their queue rather than letting a 500 count against the subscription.
    console.error(`${TAG} Received a body that is not valid JSON`);
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }

  if (debugEnabled()) {
    console.log(`${TAG} [debug] Raw payload: ${body}`);
  }

  const supabase = createServiceClient();
  const stored = await storeWebhookEvent(supabase, {
    provider: 'whatsapp',
    rawBody: body,
    payload,
    fields: collectFields(payload),
  });

  if (stored.status === 'error') {
    // The one failure Meta is told about. Processing errors are swallowed
    // because the stored row gets retried; a notification we could not even
    // store exists nowhere else, and Meta's own retry is its only way back.
    console.error(`${TAG} Could not store notification:`, stored.error);
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 500 });
  }

  after(async () => {
    if (stored.status === 'stored') {
      const ok = await processWebhookEvent(
        supabase,
        stored.event,
        processWhatsAppWebhookEvent,
      );
      if (!ok) {
        console.warn(`${TAG} Stored event ${stored.event.id} left for retry`);
      }
    }

    // Retry whatever earlier notifications left behind. During a send window
    // Meta calls every few seconds, so this is a retry within minutes without
    // a frequent cron (the daily cron covers quiet periods).
    try {
      const swept = await sweepUnprocessedWebhookEvents(supabase, {
        provider: 'whatsapp',
        processor: processWhatsAppWebhookEvent,
        olderThanMs: SWEEP_AFTER_MS,
        limit: SWEEP_LIMIT,
      });
      if (swept.picked > 0) {
        console.log(
          `${TAG} Retried ${swept.picked} stored event(s), ${swept.processed} now processed`,
        );
      }
    } catch (error) {
      console.error(`${TAG} Retry sweep failed:`, error);
    }
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 signature verification
// ---------------------------------------------------------------------------
function verifySignature(body: string, signatureHeader: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error(
      `${TAG} Rejected: WHATSAPP_APP_SECRET is not set in this environment, so no notification can ever be verified.`,
    );
    return false;
  }

  const expected = `sha256=${createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')}`;

  const received = Buffer.from(signatureHeader);
  const computed = Buffer.from(expected);

  // timingSafeEqual throws on a length mismatch, which is itself public
  // information here (the digest length is fixed and known).
  if (
    received.length !== computed.length ||
    !timingSafeEqual(received, computed)
  ) {
    console.warn(
      `${TAG} Rejected: signature mismatch over ${body.length} bytes. The usual cause is WHATSAPP_APP_SECRET belonging to a different Meta app than the one holding this subscription.`,
    );
    return false;
  }

  return true;
}
