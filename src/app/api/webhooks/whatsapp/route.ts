import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

// node:crypto and the service-role client both rule out the edge runtime.
export const runtime = 'nodejs';

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
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error(
      '[whatsapp-webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured',
    );
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (mode !== 'subscribe' || token !== verifyToken || !challenge) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
  if (!signature || !verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    // Signed by Meta but unparseable - retrying will not help, so take it off
    // their queue rather than letting a 500 count against the subscription.
    console.error('[whatsapp-webhook] Received a body that is not valid JSON');
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }

  // Meta disables a webhook that keeps failing, so processing errors are logged
  // and swallowed: a delivery record we could not update is worth far less than
  // the subscription that carries every future one.
  try {
    await processPayload(payload);
  } catch (error) {
    console.error('[whatsapp-webhook] Processing error:', error);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 signature verification
// ---------------------------------------------------------------------------
function verifySignature(body: string, signatureHeader: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[whatsapp-webhook] WHATSAPP_APP_SECRET is not configured');
    return false;
  }

  const expected = `sha256=${createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')}`;

  const received = Buffer.from(signatureHeader);
  const computed = Buffer.from(expected);

  // timingSafeEqual throws on a length mismatch, which is itself public
  // information here (the digest length is fixed and known).
  if (received.length !== computed.length) return false;
  return timingSafeEqual(received, computed);
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
    return;
  }

  const statuses: WhatsAppStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      statuses.push(...(value.statuses ?? []));

      // Everything below is subscribed to for visibility, not for state: none
      // of it has a table to land in yet. Logged rather than dropped so the
      // signal exists the day one of them earns persistence.
      for (const message of value.messages ?? []) {
        console.log(
          `[whatsapp-webhook] Inbound ${message.type} message from ${message.from} (${message.id})`,
        );
      }

      for (const preference of value.user_preferences ?? []) {
        console.warn(
          `[whatsapp-webhook] Marketing preference ${preference.value} for ${preference.wa_id} (category: ${preference.category})`,
        );
      }

      if (change.field === 'message_template_status_update') {
        console.warn(
          `[whatsapp-webhook] Template ${value.message_template_name}: ${value.event}${value.reason ? ` (${value.reason})` : ''}`,
        );
      }
    }
  }

  if (statuses.length === 0) return;

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
  for (const status of statuses) {
    if (!status.id || !isKnownStatus(status.status)) continue;
    const existing = byMessageId.get(status.id);
    if (
      !existing ||
      STATUS_RANK[status.status as DeliveryStatus] >
        STATUS_RANK[existing.status as DeliveryStatus]
    ) {
      byMessageId.set(status.id, status);
    }
  }

  if (byMessageId.size === 0) return;

  const supabase = createServiceClient();

  const { data: deliveries, error } = await supabase
    .from('message_deliveries')
    .select('id, status, delivered_at, read_at, external_message_id')
    .in('external_message_id', [...byMessageId.keys()]);

  if (error) {
    console.error('[whatsapp-webhook] Delivery lookup failed:', error);
    return;
  }

  await Promise.all(
    (deliveries ?? []).map(async (delivery) => {
      const status = byMessageId.get(delivery.external_message_id!);
      if (!status) return;
      try {
        await applyStatus(supabase, delivery, status);
      } catch (err) {
        console.error(
          `[whatsapp-webhook] Failed to apply ${status.status} to ${status.id}:`,
          err,
        );
      }
    }),
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

async function applyStatus(
  supabase: SupabaseClient,
  delivery: DeliveryRow,
  status: WhatsAppStatus,
) {
  const target = status.status as DeliveryStatus;
  const current = delivery.status ?? 'pending';

  if (STATUS_RANK[target] <= STATUS_RANK[current]) return;

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
  }

  // Guarding the write on the statuses this one outranks makes the update
  // atomic: two webhook deliveries racing on the same row cannot reorder it.
  const { error } = await supabase
    .from('message_deliveries')
    .update(patch)
    .eq('id', delivery.id)
    .in('status', statusesBelow(target));

  if (error) {
    console.error(
      `[whatsapp-webhook] Update failed for delivery ${delivery.id}:`,
      error,
    );
  }
}

/** Unix seconds to ISO, falling back to now for a missing or junk value. */
function toIsoTimestamp(timestamp: string | undefined): string {
  const seconds = Number(timestamp);
  if (!timestamp || !Number.isFinite(seconds) || seconds <= 0) {
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
