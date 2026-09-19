import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoredWebhookEvent } from '@/lib/webhooks/inbox';
import {
  handleInboundWhatsAppMessage,
  InboundClaimError,
  type InboundWhatsAppMessage,
} from '@/features/confirmation/services/confirmation-conversation';
import { parseCallbackTag } from '../utils/whatsapp-callback-tag';

/**
 * Processes one stored Meta WhatsApp notification (a webhook_events row).
 *
 * Two things change state. Delivery statuses land on
 * message_delivery_attempts - the Delivery above them is rolled up by the
 * database (ADR 0011). Inbound messages from Guests drive the Confirmation
 * Conversation (ADR 0017). Everything else (template status, quality,
 * opt-outs) is stored in the inbox and logged, nothing more, for now.
 *
 * Throwing means "keep this row and try again later". It is safe to run twice:
 * a status is only written when it outranks what the attempt already holds,
 * and an inbound message is claimed by its id before it is acted on.
 */

export const TAG = '[whatsapp-webhook]';

/**
 * Set WHATSAPP_WEBHOOK_DEBUG=true to dump raw payloads. Off by default: a send
 * to 500 guests produces up to 1500 notifications, and the bodies carry guest
 * phone numbers. Turn it on in Vercel while diagnosing, then turn it back off.
 */
export function debugEnabled(): boolean {
  return process.env.WHATSAPP_WEBHOOK_DEBUG === 'true';
}

/** Phone numbers are guest personal data - enough to correlate, not to identify. */
function maskPhone(value: string | undefined): string {
  if (!value) return 'unknown';
  return value.length <= 4 ? '****' : `***${value.slice(-4)}`;
}

/**
 * Meta's delivery lifecycle for one message, ordered. A status is only written
 * when it ranks above what the attempt already holds, which makes processing
 * idempotent under Meta's at-least-once redelivery and safe when a retry
 * arrives out of order.
 *
 * `failed` sits at the top deliberately. Meta never delivers a message it has
 * already reported as failed, so a lower-ranked status arriving afterwards is a
 * late duplicate of an earlier event, not a recovery.
 *
 * This is the ranking *within* one attempt. Across a delivery's attempts the
 * database ranks failed lowest instead - a different question (ADR 0011).
 */
const STATUS_RANK = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
} as const;

type AttemptStatus = keyof typeof STATUS_RANK;

/** The statuses an attempt may hold for `target` to still be an advance on it. */
function statusesBelow(target: AttemptStatus): AttemptStatus[] {
  return (Object.keys(STATUS_RANK) as AttemptStatus[]).filter(
    (status) => STATUS_RANK[status] < STATUS_RANK[target],
  );
}

/**
 * How long an untagged status that matched no attempt is retried before it is
 * given up on. A tagged status never needs it. Untagged, a status can only be
 * matched by wamid, which the sender writes after the send call returns, so
 * Meta's `sent` can legitimately beat it by a few seconds. Past this window the
 * id belongs to something else (another environment sharing the number).
 *
 * Only messages sent before tags existed are untagged, so this goes when
 * resolveUntagged does.
 */
const UNMATCHED_RETRY_WINDOW_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Payload shapes
//
// Only the fields read here are typed. Meta sends a good deal more
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
  /** The tag set on the send (utils/whatsapp-callback-tag.ts), absent if none was. */
  biz_opaque_callback_data?: string;
  errors?: WhatsAppError[];
}

type WhatsAppInboundMessage = InboundWhatsAppMessage;

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

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{ field?: string; value?: WhatsAppChangeValue }>;
  }>;
}

/** The change fields a payload carries, stored alongside it for lookup. */
export function collectFields(payload: WhatsAppWebhookPayload): string[] {
  const fields = new Set<string>();
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field) fields.add(change.field);
    }
  }
  return [...fields];
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
export async function processWhatsAppWebhookEvent(
  supabase: SupabaseClient,
  event: StoredWebhookEvent,
): Promise<void> {
  const payload = event.payload as WhatsAppWebhookPayload;

  if (payload.object && payload.object !== 'whatsapp_business_account') {
    console.warn(`${TAG} Ignored a payload for object "${payload.object}"`);
    return;
  }

  const statuses: WhatsAppStatus[] = [];
  const inbound: WhatsAppInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      statuses.push(...(value.statuses ?? []));

      // Logged as well as acted on, so the Vercel logs still tell the whole
      // story on their own.
      for (const message of value.messages ?? []) {
        console.log(
          `${TAG} Inbound ${message.type} message from ${maskPhone(message.from)} (${message.id})`,
        );
        inbound.push(message);
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

  // One message failing must not stop the others, nor the statuses in the
  // same payload. Each is claimed before it is acted on, so a failure after the
  // claim is that Guest's one lost reply, not a reason to retry. A claim that
  // could not be written means nothing happened, so that one asks for a retry
  // - once the statuses have been applied, which are safe to apply twice.
  let claimFailed: unknown = null;
  for (const message of inbound) {
    try {
      await handleInboundWhatsAppMessage(supabase, message);
    } catch (error) {
      if (error instanceof InboundClaimError) claimFailed = error;
      console.error(`${TAG} Could not handle inbound message ${message.id}:`, error);
    }
  }

  if (statuses.length > 0) {
    await processStatusUpdates(supabase, statuses, event);
  }

  if (claimFailed) throw claimFailed;
}

// ---------------------------------------------------------------------------
// Delivery status updates
// ---------------------------------------------------------------------------
async function processStatusUpdates(
  supabase: SupabaseClient,
  statuses: WhatsAppStatus[],
  event: StoredWebhookEvent,
) {
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
      STATUS_RANK[status.status as AttemptStatus] >
        STATUS_RANK[existing.status as AttemptStatus]
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

  // Sort by the tag each message was sent with (utils/whatsapp-callback-tag.ts).
  // Conversation replies and Test Messages have nothing to apply to, and are
  // known to be ours, so they cost this one pass and nothing else.
  const byAttemptId = new Map<string, WhatsAppStatus>();
  const untagged = new Map<string, WhatsAppStatus>();
  let untracked = 0;

  for (const [messageId, status] of byMessageId) {
    const tag = parseCallbackTag(status.biz_opaque_callback_data);
    if (!tag) untagged.set(messageId, status);
    else if (tag.kind === 'attempt') byAttemptId.set(tag.attemptId, status);
    else untracked++;
  }

  const counts = { matched: 0, applied: 0, skipped: 0, failedWrites: 0 };

  // Tagged: matched by the attempt's own id, which exists before the send, so
  // there is no race with the Worker recording the wamid and nothing to retry.
  let orphanedTags: string[] = [];
  if (byAttemptId.size > 0) {
    const { data, error } = await supabase
      .from('message_delivery_attempts')
      .select('id, status, delivered_at, read_at, external_message_id')
      .eq('channel', 'whatsapp')
      .in('id', [...byAttemptId.keys()]);
    if (error) throw new Error(`Attempt lookup failed: ${error.message}`);

    const attempts = (data ?? []) as AttemptRow[];
    await applyAll(supabase, attempts, (attempt) => byAttemptId.get(attempt.id), counts);
    const found = new Set(attempts.map((a) => a.id));
    orphanedTags = [...byAttemptId.keys()].filter((id) => !found.has(id));
  }

  // Untagged: sent before tags existed, or not sent by this Kululu at all.
  // Matched the old way, by wamid - see resolveUntagged.
  const untaggedMissing = untagged.size > 0
    ? await resolveUntagged(supabase, untagged, counts)
    : [];

  // The one line that says the endpoint is doing its job. Per-row logging would
  // be 1500 lines for a single 500-guest blast; this is one.
  console.log(
    `${TAG} ${statuses.length} status(es) -> ${byMessageId.size} message(s), ` +
      `${counts.matched} matched, ${counts.applied} applied, ${counts.skipped} already current, ` +
      `${untracked} untracked by design, ${untagged.size} untagged, ${counts.failedWrites} write error(s)`,
  );

  if (counts.failedWrites > 0) {
    throw new Error(`${counts.failedWrites} attempt write(s) failed`);
  }

  if (orphanedTags.length > 0) {
    // Tagged with an attempt id this database does not have: another
    // environment sharing the phone number, or a deleted attempt. Retrying
    // cannot help - the attempt row is written before the message is sent.
    console.warn(
      `${TAG} ${orphanedTags.length} status(es) tagged for an attempt this database does not have. First few: ${orphanedTags.slice(0, 5).join(', ')}`,
    );
  }

  if (untaggedMissing.length > 0) {
    const age = Date.now() - new Date(event.received_at).getTime();

    // Young: possibly a message sent just before tags shipped whose wamid the
    // sender has not written yet - keep the row and let a later sweep apply
    // it. Old: a message Kululu did not tag - another environment or tool
    // sharing the number, or a send path that bypassed the transport.
    if (age < UNMATCHED_RETRY_WINDOW_MS) {
      throw new Error(
        `${untaggedMissing.length} untagged message id(s) not yet matched to an attempt`,
      );
    }
    console.warn(
      `${TAG} ${untaggedMissing.length} of ${byMessageId.size} untagged message id(s) matched no attempt after ${Math.round(age / 60000)} min. First few: ${untaggedMissing.slice(0, 5).join(', ')}`,
    );
  }
}

/**
 * The pre-tag path: find the attempt by the wamid its sender stored. Returns
 * the message ids that matched nothing.
 *
 * Only messages sent before tags existed should land here, so this and the
 * conversation-reply lookup inside it are removable once statuses for those
 * have stopped arriving (backlog 0005).
 */
async function resolveUntagged(
  supabase: SupabaseClient,
  untagged: Map<string, WhatsAppStatus>,
  counts: ApplyCounts,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('message_delivery_attempts')
    .select('id, status, delivered_at, read_at, external_message_id')
    .eq('channel', 'whatsapp')
    .in('external_message_id', [...untagged.keys()]);
  if (error) throw new Error(`Attempt lookup failed: ${error.message}`);

  const attempts = (data ?? []) as AttemptRow[];
  await applyAll(supabase, attempts, (attempt) => untagged.get(attempt.external_message_id!), counts);

  const found = new Set(attempts.map((a) => a.external_message_id));
  const unmatched = [...untagged.keys()].filter((id) => !found.has(id));
  if (unmatched.length === 0) return [];

  // An untagged Confirmation Conversation reply (ADR 0017) has no attempt and
  // needs none.
  const { data: replies, error: replyError } = await supabase
    .from('whatsapp_inbound_messages')
    .select('reply_message_id')
    .in('reply_message_id', unmatched);
  if (replyError) {
    throw new Error(`Conversation reply lookup failed: ${replyError.message}`);
  }
  const conversationReplies = new Set((replies ?? []).map((r) => r.reply_message_id));
  return unmatched.filter((id) => !conversationReplies.has(id));
}

type ApplyCounts = { matched: number; applied: number; skipped: number; failedWrites: number };

async function applyAll(
  supabase: SupabaseClient,
  attempts: AttemptRow[],
  statusFor: (attempt: AttemptRow) => WhatsAppStatus | undefined,
  counts: ApplyCounts,
): Promise<void> {
  await Promise.all(
    attempts.map(async (attempt) => {
      const status = statusFor(attempt);
      if (!status) return;
      counts.matched++;
      try {
        const outcome = await applyStatus(supabase, attempt, status);
        if (outcome === 'applied') counts.applied++;
        else if (outcome === 'skipped') counts.skipped++;
        else counts.failedWrites++;
      } catch (err) {
        counts.failedWrites++;
        console.error(`${TAG} Failed to apply ${status.status} to ${status.id}:`, err);
      }
    }),
  );
}

function isKnownStatus(status: string): status is AttemptStatus {
  return status in STATUS_RANK;
}

type AttemptRow = {
  id: string;
  status: AttemptStatus;
  delivered_at: string | null;
  read_at: string | null;
  external_message_id: string | null;
};

type ApplyOutcome = 'applied' | 'skipped' | 'error';

async function applyStatus(
  supabase: SupabaseClient,
  attempt: AttemptRow,
  status: WhatsAppStatus,
): Promise<ApplyOutcome> {
  const target = status.status as AttemptStatus;
  const current = attempt.status ?? 'pending';

  if (STATUS_RANK[target] <= STATUS_RANK[current]) {
    if (debugEnabled()) {
      console.log(
        `${TAG} [debug] Attempt ${attempt.id} already ${current}, ignoring ${target}`,
      );
    }
    return 'skipped';
  }

  // Meta's own clock, not ours: a webhook can be minutes late or a retry of an
  // event from hours ago, and "when WhatsApp delivered it" is the fact worth
  // storing. Existing values win so a redelivery never rewrites history.
  const eventTimestamp = toIsoTimestamp(status.timestamp);

  const patch: Record<string, unknown> = { status: target };

  // Matched by tag, a status can reach the attempt before its sender wrote the
  // wamid - or instead of it, when the send call's answer was lost.
  if (!attempt.external_message_id) {
    patch.external_message_id = status.id;
  }

  if (target === 'sent') {
    patch.sent_at = eventTimestamp;
  }
  if (target === 'delivered' || target === 'read') {
    patch.delivered_at = attempt.delivered_at ?? eventTimestamp;
  }
  if (target === 'read') {
    patch.read_at = attempt.read_at ?? eventTimestamp;
  }
  if (target === 'failed') {
    // The numeric code is what classifyWhatsAppFailure() branches on to decide
    // SMS Fallback eligibility, and the only part of a Meta error stable enough
    // to build logic around - 131049 marketing cap, 131050 opt-out, 131026
    // undeliverable. Keep it alongside the human-readable text.
    patch.error_code = status.errors?.[0]?.code ?? null;
    patch.error_message = formatErrors(status.errors);

    // Always logged, never sampled. A failure is the actionable event here: it
    // means a guest did not get their message, and the code says whether that
    // is fixable by another channel or a problem on Kululu's side.
    console.warn(
      `${TAG} Attempt ${attempt.id} to ${maskPhone(status.recipient_id)} FAILED - ${patch.error_message}`,
    );
  }

  // Guarding the write on the statuses this one outranks makes the update
  // atomic: two notifications racing on the same attempt cannot reorder it.
  const { error } = await supabase
    .from('message_delivery_attempts')
    .update(patch)
    .eq('id', attempt.id)
    .in('status', statusesBelow(target));

  if (error) {
    console.error(`${TAG} Update failed for attempt ${attempt.id}:`, error);
    return 'error';
  }

  if (debugEnabled()) {
    console.log(`${TAG} [debug] Attempt ${attempt.id}: ${current} -> ${target}`);
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
