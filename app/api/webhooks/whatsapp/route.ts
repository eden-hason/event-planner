import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// Status progression order — higher index = more advanced
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: -1,
};

// ---------------------------------------------------------------------------
// GET – Meta webhook verification
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST – Incoming status updates from Meta WhatsApp Cloud API
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const body = await request.text();

  // Validate HMAC signature
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature || !(await verifySignature(body, signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Always return 200 to Meta immediately — process in the same request but
  // never let processing errors bubble up as non-200 responses.
  try {
    await processStatusUpdates(payload);
  } catch (error) {
    console.error('[whatsapp-webhook] Processing error:', error);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 signature verification
// ---------------------------------------------------------------------------
async function verifySignature(
  body: string,
  signatureHeader: string,
): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[whatsapp-webhook] WHATSAPP_APP_SECRET is not configured');
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body),
  );

  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const expected = `sha256=${computedHex}`;

  // Constant-time comparison
  if (expected.length !== signatureHeader.length) return false;
  const a = encoder.encode(expected);
  const b = encoder.encode(signatureHeader);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Process status update entries from the webhook payload
// ---------------------------------------------------------------------------
interface WhatsAppStatus {
  id: string; // external message ID
  status: string; // "sent" | "delivered" | "read" | "failed"
  timestamp: string; // Unix timestamp (seconds)
  errors?: Array<{ code: number; title: string }>;
}

async function processStatusUpdates(payload: {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: WhatsAppStatus[];
      };
    }>;
  }>;
}) {
  const statuses: WhatsAppStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        statuses.push(status);
      }
    }
  }

  if (statuses.length === 0) return;

  const supabase = createServiceClient();

  for (const status of statuses) {
    try {
      await processOneStatus(supabase, status);
    } catch (error) {
      console.error(
        `[whatsapp-webhook] Failed to process status for ${status.id}:`,
        error,
      );
    }
  }
}

async function processOneStatus(
  supabase: ReturnType<typeof createServiceClient>,
  status: WhatsAppStatus,
) {
  const { id: externalMessageId, status: statusName, timestamp, errors } = status;
  const eventTimestamp = new Date(Number(timestamp) * 1000).toISOString();

  // Look up the delivery record
  const { data: delivery, error: lookupError } = await supabase
    .from('message_deliveries')
    .select('id, status, delivered_at, read_at')
    .eq('external_message_id', externalMessageId)
    .single();

  if (lookupError || !delivery) {
    // Message not found — could be from a different system or already deleted
    return;
  }

  const currentRank = STATUS_RANK[delivery.status] ?? 0;

  if (statusName === 'failed') {
    const errorMessage =
      errors?.map((e) => `${e.code}: ${e.title}`).join('; ') ?? 'Unknown error';

    await supabase
      .from('message_deliveries')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', delivery.id);
    return;
  }

  if (statusName === 'delivered' && currentRank < STATUS_RANK.delivered) {
    await supabase
      .from('message_deliveries')
      .update({
        status: 'delivered',
        delivered_at: delivery.delivered_at ?? eventTimestamp,
      })
      .eq('id', delivery.id);
    return;
  }

  if (statusName === 'read' && currentRank < STATUS_RANK.read) {
    await supabase
      .from('message_deliveries')
      .update({
        status: 'read',
        delivered_at: delivery.delivered_at ?? eventTimestamp,
        read_at: delivery.read_at ?? eventTimestamp,
      })
      .eq('id', delivery.id);
    return;
  }
}
