import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

// node:crypto and the service-role client both rule out the edge runtime.
export const runtime = 'nodejs';

const TAG = '[whatsapp-webhook]';

/**
 * Set WHATSAPP_WEBHOOK_DEBUG=true to dump raw payloads. Off by default: a send
 * to 500 guests produces up to 1500 notifications, and the bodies carry guest
 * phone numbers. Turn it on in Vercel while diagnosing, then turn it back off.
 */
function debugEnabled(): boolean {
  return process.env.WHATSAPP_WEBHOOK_DEBUG === 'true';
}

/** Phone numbers are guest personal data - enough to correlate, not to identify. */
function maskPhone(value: string | undefined): string {
  if (!value) return 'unknown';
  return value.length <= 4 ? '****' : `***${value.slice(-4)}`;
}

/**
 * Meta's delivery lifecycle, ordered. A status is only written when it ranks
 * above what the row already holds, which makes the handler idempotent under
 * Meta's at-least-once redelivery and safe when a retry arrives out of order.
 *
 * `failed` sits at the top deliberately. Meta never delivers a message it has
 * already reported as failed, so a lower-ranked status arriving afterwards is a
 * late duplicate of an earlier event, not a recovery - and an organiser looking
 * at a failure list should not see rows flip back out of it.
 */
const STATUS_RANK = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
} as const;

type DeliveryStatus = keyof typeof STATUS_RANK;

/** The statuses a row may hold for `target` to still be an advance on it. */
function statusesBelow(target: DeliveryStatus): DeliveryStatus[] {
  return (Object.keys(STATUS_RANK) as DeliveryStatus[]).filter(
    (status) => STATUS_RANK[status] < STATUS_RANK[target],
  );
}

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

  // Meta disables a webhook that keeps failing, so processing errors are logged
  // and swallowed: a delivery record we could not update is worth far less than
  // the subscription that carries every future one.
  try {
    await processPayload(payload);
  } catch (error) {
    console.error(`${TAG} Processing error:`, error);
  }

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

// ---------------------------------------------------------------------------
// Payload shapes
//
// Only the fields this handler reads are typed. Meta sends a good deal more
// (conversation, pricing, profile, ...) and adds to it over time.
// ---------------------------------------------------------------------------
interface WhatsAppError {
  code?: number;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

interface WhatsAppStatus {
  /** The wamid returned by the send call, stored as external_message_id. */
  id: string;
  status: string;
  /** Unix seconds. */
  timestamp: string;
  recipient_id?: string;
  errors?: WhatsAppError[];
}

interface WhatsAppInboundMessage {
  id: string;
  from: string;
  type: string;
}

interface WhatsAppUserPreference {
  wa_id?: string;
  category?: string;
  /** 'stop' | 'resume' */
  value?: string;
}

interface WhatsAppChangeValue {
  statuses?: WhatsAppStatus[];
  messages?: WhatsAppInboundMessage[];
  user_preferences?: WhatsAppUserPreference[];
  /** message_template_status_update */
  event?: string;
  message_template_name?: string;
  reason?: string;
}

interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{ field?: string; value?: WhatsAppChangeValue }>;
  }>;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
async function processPayload(payload: WhatsAppWebhookPayload) {
  if (payload.object && payload.object !== 'whatsapp_business_account') {
    console.warn(`${TAG} Ignored a payload for object "${payload.object}"`);
    return;
  }

  const statuses: WhatsAppStatus[] = [];
  const fields = new Set<string>();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field) fields.add(change.field);
      const value = change.value;
      if (!value) continue;

      statuses.push(...(value.statuses ?? []));

      // Everything below is subscribed to for visibility, not for state: none
      // of it has a table to land in yet. Logged rather than dropped so the
      // signal exists the day one of them earns persistence.
      for (const message of value.messages ?? []) {
        console.log(
          `${TAG} Inbound ${message.type} message from ${maskPhone(message.from)} (${message.id})`,
        );
      }

      for (const preference of value.user_preferences ?? []) {
        console.warn(
          `${TAG} Marketing preference "${preference.value}" for ${maskPhone(preference.wa_id)} (category: ${preference.category})`,
        );
      }

      if (change.field === 'message_template_status_update') {
        console.warn(
          `${TAG} Template ${value.message_template_name}: ${value.event}${value.reason ? ` (${value.reason})` : ''}`,
        );
      }
    }
  }

  if (statuses.length === 0) {
    // Not an error - a template or account notification legitimately carries no
    // statuses - but worth saying, so a payload that produced no delivery
    // writes is distinguishable from one that was never received.
    console.log(
      `${TAG} No delivery statuses in payload (fields: ${[...fields].join(', ') || 'none'})`,
    );
    return;
  }

  await processStatusUpdates(statuses);
}

// ---------------------------------------------------------------------------
// Delivery status updates
// ---------------------------------------------------------------------------
async function processStatusUpdates(statuses: WhatsAppStatus[]) {
  // One payload routinely carries several statuses for the same message, and
  // only the most advanced one changes anything. Collapsing first turns a
  // sent+delivered+read batch into a single row read and a single write.
  const byMessageId = new Map<string, WhatsAppStatus>();
  let unknownStatusCount = 0;

  for (const status of statuses) {
    if (!status.id) continue;
    if (!isKnownStatus(status.status)) {
      unknownStatusCount++;
      continue;
    }
    const existing = byMessageId.get(status.id);
    if (
      !existing ||
      STATUS_RANK[status.status as DeliveryStatus] >
        STATUS_RANK[existing.status as DeliveryStatus]
    ) {
      byMessageId.set(status.id, status);
    }
  }

  if (unknownStatusCount > 0) {
    // A status Meta has added since this code was written. Worth knowing about.
    console.warn(
      `${TAG} Ignored ${unknownStatusCount} status(es) of a kind this handler does not recognise`,
    );
  }

  if (byMessageId.size === 0) return;

  const supabase = createServiceClient();

  const { data: deliveries, error } = await supabase
    .from('message_deliveries')
    .select('id, status, delivered_at, read_at, external_message_id')
    .in('external_message_id', [...byMessageId.keys()]);

  if (error) {
    console.error(`${TAG} Delivery lookup failed:`, error);
    return;
  }

  const matched = deliveries ?? [];

  // A wamid with no row is the signal that sending and tracking have come
  // apart: the delivery upsert failed, the row was deleted, or the
  // notification belongs to a message sent from another environment sharing
  // this phone number. Silence here is how that goes unnoticed for weeks.
  if (matched.length < byMessageId.size) {
    const found = new Set(matched.map((d) => d.external_message_id));
    const missing = [...byMessageId.keys()].filter((id) => !found.has(id));
    console.warn(
      `${TAG} ${missing.length} of ${byMessageId.size} message id(s) matched no delivery row. First few: ${missing.slice(0, 5).join(', ')}`,
    );
  }

  let applied = 0;
  let skipped = 0;
  let failedWrites = 0;

  await Promise.all(
    matched.map(async (delivery) => {
      const status = byMessageId.get(delivery.external_message_id!);
      if (!status) return;
      try {
        const outcome = await applyStatus(supabase, delivery, status);
        if (outcome === 'applied') applied++;
        else if (outcome === 'skipped') skipped++;
        else failedWrites++;
      } catch (err) {
        failedWrites++;
        console.error(
          `${TAG} Failed to apply ${status.status} to ${status.id}:`,
          err,
        );
      }
    }),
  );

  // The one line that says the endpoint is doing its job. Per-row logging would
  // be 1500 lines for a single 500-guest blast; this is one.
  console.log(
    `${TAG} ${statuses.length} status(es) -> ${byMessageId.size} message(s), ${matched.length} matched, ${applied} applied, ${skipped} already current, ${failedWrites} write error(s)`,
  );
}

function isKnownStatus(status: string): status is DeliveryStatus {
  return status in STATUS_RANK;
}

type DeliveryRow = {
  id: string;
  status: DeliveryStatus | null;
  delivered_at: string | null;
  read_at: string | null;
  external_message_id: string | null;
};

type ApplyOutcome = 'applied' | 'skipped' | 'error';

async function applyStatus(
  supabase: SupabaseClient,
  delivery: DeliveryRow,
  status: WhatsAppStatus,
): Promise<ApplyOutcome> {
  const target = status.status as DeliveryStatus;
  const current = delivery.status ?? 'pending';

  if (STATUS_RANK[target] <= STATUS_RANK[current]) {
    if (debugEnabled()) {
      console.log(
        `${TAG} [debug] Delivery ${delivery.id} already ${current}, ignoring ${target}`,
      );
    }
    return 'skipped';
  }

  // Meta's own clock, not ours: a webhook can be minutes late or a retry of an
  // event from hours ago, and "when WhatsApp delivered it" is the fact worth
  // storing. Existing values win so a redelivery never rewrites history.
  const eventTimestamp = toIsoTimestamp(status.timestamp);

  const patch: Record<string, unknown> = { status: target };

  if (target === 'delivered' || target === 'read') {
    patch.delivered_at = delivery.delivered_at ?? eventTimestamp;
  }
  if (target === 'read') {
    patch.read_at = delivery.read_at ?? eventTimestamp;
  }
  if (target === 'failed') {
    // The numeric code is what the send path already categorises on
    // (categoriseWhatsAppError) and the only part of a Meta error that is
    // stable enough to branch on - 131049 marketing cap, 131050 opt-out,
    // 131026 undeliverable. Keep it alongside the human-readable text.
    patch.error_code = status.errors?.[0]?.code ?? null;
    patch.error_message = formatErrors(status.errors);

    // Always logged, never sampled. A failure is the actionable event here: it
    // means a guest did not get their invitation, and the code says whether
    // that is fixable (a bad number) or a policy wall (an opt-out).
    console.warn(
      `${TAG} Delivery ${delivery.id} to ${maskPhone(status.recipient_id)} FAILED - ${patch.error_message}`,
    );
  }

  // Guarding the write on the statuses this one outranks makes the update
  // atomic: two webhook deliveries racing on the same row cannot reorder it.
  const { error } = await supabase
    .from('message_deliveries')
    .update(patch)
    .eq('id', delivery.id)
    .in('status', statusesBelow(target));

  if (error) {
    console.error(`${TAG} Update failed for delivery ${delivery.id}:`, error);
    return 'error';
  }

  if (debugEnabled()) {
    console.log(
      `${TAG} [debug] Delivery ${delivery.id}: ${current} -> ${target}`,
    );
  }

  return 'applied';
}

/** Unix seconds to ISO, falling back to now for a missing or junk value. */
function toIsoTimestamp(timestamp: string | undefined): string {
  const seconds = Number(timestamp);
  if (!timestamp || !Number.isFinite(seconds) || seconds <= 0) {
    console.warn(
      `${TAG} Status carried an unusable timestamp (${timestamp}), using now`,
    );
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
}

function formatErrors(errors: WhatsAppError[] | undefined): string {
  if (!errors || errors.length === 0) return 'Unknown error';

  return errors
    .map((error) => {
      // error_data.details is the specific one ("this message was not delivered
      // to maintain healthy ecosystem engagement"); title is the generic bucket.
      const text = error.error_data?.details ?? error.message ?? error.title;
      return [error.code, text].filter(Boolean).join(': ');
    })
    .filter(Boolean)
    .join('; ');
}
