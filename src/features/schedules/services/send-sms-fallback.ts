import type { SupabaseClient } from '@supabase/supabase-js';
import { SCHEDULE_SELECT, ScheduleDbToAppSchema } from '../schemas';
import {
  MessageTemplateDbToAppSchema,
  type MessageTemplateApp,
} from '../schemas/message-templates';
import { DbToAppTransformerSchema, type GuestApp } from '@/features/guests/schemas';
import { resolveTemplatesForEvent } from './resolve-reminder-templates';
import { loadIsFollowUpConfirmation } from './confirmation-round';
import { mapEventRow } from './map-event-row';
import {
  buildSmsBody,
  classifyWhatsAppFailure,
  describeGuestLevelFailure,
  includesGiftButton,
  hasInvitationImage,
  isMessageSchedule,
  sendSmsToGuest,
  shouldSendTableNumbers,
  validatePhoneNumber,
  type ParameterResolutionContext,
  type SmsFallbackTrigger,
} from '../utils';
import { sendingConfig } from '@/lib/config/sending';

/**
 * The SMS Fallback engine (CONTEXT.md, ADR 0012): a further SMS attempt for a
 * schedule's deliveries whose WhatsApp attempt failed for a guest-level reason,
 * or was accepted but never confirmed delivered (a Stuck WhatsApp, ADR 0016
 * amendment of 2026-10-07).
 *
 * Phase 1 is launched by an Operator from the Back Office. The planned
 * automatic trigger is expected to call this same engine, so nothing here
 * assumes a person is watching.
 *
 * Eligibility, recomputed on every call so a half-finished batch can be picked
 * up again without remembering where it stopped:
 *   1. the delivery is Failed, and its failed attempt was on WhatsApp, and the
 *      failure is guest-level (unknown codes are system-level); or
 *   2. the delivery is Sent, and its WhatsApp attempt was accepted inside the
 *      Stuck window - long enough ago that a receipt should have come, recently
 *      enough that an SMS is still worth having
 *   3. either way, it has no SMS attempt yet
 * RSVP is deliberately not considered.
 */

export type SmsFallbackExclusionReason =
  | 'system_failure'
  | 'already_sms'
  | 'not_whatsapp'
  | 'no_phone';

export type SmsFallbackRecipient = {
  deliveryId: string;
  guestId: string;
  guestName: string;
  guestPhone: string | null;
  errorCode: number | null;
  errorMessage: string | null;
  /** Operator-facing: why WhatsApp failed, or why this guest is left out. */
  reason: string;
};

export type SmsFallbackPlan = {
  scheduleId: string;
  /** Null when the schedule can fall back; otherwise why the button is disabled. */
  unavailableReason: string | null;
  eligible: SmsFallbackRecipient[];
  excluded: (SmsFallbackRecipient & { exclusion: SmsFallbackExclusionReason })[];
  /** The SMS as the first eligible guest would receive it. */
  preview: string | null;
};

export type SmsFallbackOutcome = {
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  /** Deliveries another run claimed first. */
  skippedCount: number;
};

type AttemptRow = {
  channel: 'whatsapp' | 'sms';
  status: string;
  error_code: number | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

export type FallbackDeliveryRow = {
  id: string;
  status: 'failed' | 'sent';
  guest_id: string;
  confirmation_token: string | null;
  guests: { name: string; phone_number: string | null } | null;
  message_delivery_attempts: AttemptRow[];
};

type LoadedSchedule = {
  schedule: ReturnType<typeof ScheduleDbToAppSchema.parse>;
  event: ReturnType<typeof mapEventRow>;
};

type Resolution =
  | { ok: true; withTable: MessageTemplateApp | null; withoutTable: MessageTemplateApp }
  | { ok: false; reason: string };

async function loadSchedule(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<LoadedSchedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      `${SCHEDULE_SELECT},
       events (id, user_id, title, event_date, location, host_details,
               invitations, reception_time, short_code, event_settings,
               guests_experience, event_types (key))`,
    )
    .eq('id', scheduleId)
    .single();
  if (error || !data || !data.events) return null;
  return {
    schedule: ScheduleDbToAppSchema.parse(data),
    event: mapEventRow(data.events),
  };
}

/**
 * The SMS version of the schedule's template: same key, variant and language
 * on the SMS channel, resolved across the same axes the WhatsApp send used. An
 * axis the SMS family does not offer (gifting, today) resolves as off. No SMS
 * version means no fallback - never a generic body sent to real guests.
 */
async function resolveSmsTemplates(
  supabase: SupabaseClient,
  loaded: LoadedSchedule,
): Promise<Resolution> {
  const { schedule, event } = loaded;
  if (!isMessageSchedule(schedule)) {
    return { ok: false, reason: 'Only message schedules can fall back to SMS' };
  }
  const anchor = schedule.template;
  if (!anchor) return { ok: false, reason: 'This schedule has no template' };
  if (anchor.channel === 'sms') {
    return { ok: false, reason: 'This schedule already sends by SMS' };
  }

  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('key', anchor.key)
    .eq('channel', 'sms')
    .eq('variant', anchor.variant)
    .eq('language_code', anchor.languageCode)
    .limit(1);
  if (error) return { ok: false, reason: 'Could not load message templates' };
  if (!data?.length) {
    return { ok: false, reason: `No SMS version of ${anchor.key}` };
  }

  const resolution = await resolveTemplatesForEvent({
    supabase,
    anchor: MessageTemplateDbToAppSchema.parse(data[0]),
    gifting: includesGiftButton(event.eventSettings, schedule.scheduleTypeKey),
    tableNumbers: shouldSendTableNumbers(event.guestExperience),
    note: Boolean(schedule.customText?.trim()),
    followUp: await loadIsFollowUpConfirmation(supabase, schedule),
    invitationImage: hasInvitationImage(event.invitations),
  });
  if (!resolution.success) return { ok: false, reason: resolution.message };
  return {
    ok: true,
    withTable: resolution.templates.withTable,
    withoutTable: resolution.templates.withoutTable,
  };
}

async function loadFallbackDeliveries(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<FallbackDeliveryRow[]> {
  const { data, error } = await supabase
    .from('message_deliveries')
    .select(
      'id, status, guest_id, confirmation_token, guests(name, phone_number), message_delivery_attempts(channel, status, error_code, error_message, sent_at, created_at)',
    )
    .eq('schedule_id', scheduleId)
    .in('status', ['failed', 'sent']);
  if (error) throw error;
  return (data ?? []) as unknown as FallbackDeliveryRow[];
}

/**
 * When an accepted WhatsApp with no delivered receipt counts as stuck: older
 * than `minHours`, younger than `maxHours`. The ceiling keeps a send from weeks
 * ago - including ones from before receipts were recorded - from ever being
 * picked up.
 */
export type StuckWindow = { now: Date; minHours: number; maxHours: number };

const HOUR_MS = 3_600_000;

export function stuckWindow(now = new Date()): StuckWindow {
  const config = sendingConfig();
  return {
    now,
    minHours: config.smsFallbackStuckMinHours,
    maxHours: config.smsFallbackStuckMaxHours,
  };
}

/**
 * The window as the `sent_at` range it covers, both ends inclusive. The one
 * statement of the rule: the classifier and the sweeper's query both use it.
 */
export function stuckSentAtRange(window: StuckWindow): { from: Date; to: Date } {
  const now = window.now.getTime();
  return {
    from: new Date(now - window.maxHours * HOUR_MS),
    to: new Date(now - window.minHours * HOUR_MS),
  };
}

/** Hours since a stuck WhatsApp was accepted, or null when it is not stuck. */
export function stuckForHours(
  sentAt: string | null,
  window: StuckWindow,
): number | null {
  if (!sentAt) return null;
  const sent = Date.parse(sentAt);
  const { from, to } = stuckSentAtRange(window);
  if (!(sent >= from.getTime() && sent <= to.getTime())) return null;
  return (window.now.getTime() - sent) / HOUR_MS;
}

export function classifySmsFallbackCandidates(
  rows: FallbackDeliveryRow[],
  window: StuckWindow,
) {
  const eligible: SmsFallbackRecipient[] = [];
  const excluded: SmsFallbackPlan['excluded'] = [];

  for (const row of rows) {
    const attempts = [...row.message_delivery_attempts].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    const hasSms = attempts.some((a) => a.channel === 'sms');
    const lastWhatsAppFailure =
      row.status === 'failed'
        ? attempts.find((a) => a.channel === 'whatsapp' && a.status === 'failed')
        : undefined;
    const base = {
      deliveryId: row.id,
      guestId: row.guest_id,
      guestName: row.guests?.name ?? 'Unknown guest',
      guestPhone: row.guests?.phone_number ?? null,
      errorCode: lastWhatsAppFailure?.error_code ?? null,
      errorMessage: lastWhatsAppFailure?.error_message ?? null,
    };

    let reason: string;
    if (row.status === 'sent') {
      // A Sent delivery is only a candidate while its WhatsApp is stuck. Every
      // other Sent delivery - one an SMS already reached, one still inside the
      // window, one too old to bother - is simply not a fallback case, so it is
      // left out silently rather than listed.
      if (hasSms) continue;
      const accepted = attempts.find((a) => a.channel === 'whatsapp' && a.status === 'sent');
      const hours = stuckForHours(accepted?.sent_at ?? null, window);
      if (hours == null) continue;
      reason = `WhatsApp accepted ${Math.floor(hours)}h ago but never confirmed delivered`;
    } else if (hasSms) {
      excluded.push({ ...base, exclusion: 'already_sms', reason: 'Already tried by SMS' });
      continue;
    } else if (!lastWhatsAppFailure) {
      excluded.push({ ...base, exclusion: 'not_whatsapp', reason: 'No failed WhatsApp attempt' });
      continue;
    } else if (classifyWhatsAppFailure(lastWhatsAppFailure.error_code) === 'system') {
      excluded.push({
        ...base,
        exclusion: 'system_failure',
        reason:
          lastWhatsAppFailure.error_code == null
            ? 'Failure with no error code - resend on WhatsApp once the cause is fixed'
            : `Error ${lastWhatsAppFailure.error_code} is not a guest-level failure - resend on WhatsApp once the cause is fixed`,
      });
      continue;
    } else {
      reason = describeGuestLevelFailure(lastWhatsAppFailure.error_code) ?? 'WhatsApp failed';
    }

    if (!validatePhoneNumber(base.guestPhone)) {
      excluded.push({ ...base, exclusion: 'no_phone', reason: 'No usable phone number' });
    } else {
      eligible.push({ ...base, reason });
    }
  }

  const byName = (a: SmsFallbackRecipient, b: SmsFallbackRecipient) =>
    a.guestName.localeCompare(b.guestName);
  return { eligible: eligible.sort(byName), excluded: excluded.sort(byName) };
}

async function loadGuestsAndTables(
  supabase: SupabaseClient,
  guestIds: string[],
  withTable: boolean,
) {
  const guests = new Map<string, GuestApp>();
  const tables = new Map<string, { tableNumber: number; label: string | null }>();
  if (guestIds.length === 0) return { guests, tables };

  const { data, error } = await supabase.from('guests').select('*').in('id', guestIds);
  if (error) throw error;
  for (const raw of data ?? []) {
    const guest = DbToAppTransformerSchema.parse(raw);
    guests.set(guest.id, guest);
  }

  const tableIds = [...new Set([...guests.values()].map((g) => g.tableId).filter((id): id is string => !!id))];
  if (withTable && tableIds.length > 0) {
    const { data: rows, error: tablesError } = await supabase
      .from('tables')
      .select('id, table_number, label')
      .in('id', tableIds);
    if (tablesError) throw tablesError;
    for (const row of rows ?? []) {
      tables.set(row.id, { tableNumber: row.table_number, label: row.label });
    }
  }
  return { guests, tables };
}

function smsTemplateFor(
  resolution: Extract<Resolution, { ok: true }>,
  guest: GuestApp,
) {
  const template =
    resolution.withTable && guest.tableId ? resolution.withTable : resolution.withoutTable;
  return template as Extract<MessageTemplateApp, { channel: 'sms' }>;
}

export async function buildSmsFallbackPlan(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<SmsFallbackPlan> {
  const loaded = await loadSchedule(supabase, scheduleId);
  if (!loaded) {
    return { scheduleId, unavailableReason: 'That schedule no longer exists', eligible: [], excluded: [], preview: null };
  }

  const [resolution, rows] = await Promise.all([
    resolveSmsTemplates(supabase, loaded),
    loadFallbackDeliveries(supabase, scheduleId),
  ]);
  const { eligible, excluded } = classifySmsFallbackCandidates(rows, stuckWindow());

  let preview: string | null = null;
  if (resolution.ok && eligible.length > 0) {
    const first = eligible[0];
    const { guests, tables } = await loadGuestsAndTables(supabase, [first.guestId], Boolean(resolution.withTable));
    const guest = guests.get(first.guestId);
    const token = rows.find((r) => r.id === first.deliveryId)?.confirmation_token;
    if (guest && token) {
      const context: ParameterResolutionContext = {
        guest,
        event: loaded.event,
        group: null,
        table: (guest.tableId ? tables.get(guest.tableId) : null) ?? null,
        schedule: loaded.schedule,
        confirmationToken: token,
      };
      preview = buildSmsBody(smsTemplateFor(resolution, guest).payload, context);
    }
  }

  return {
    scheduleId,
    unavailableReason: resolution.ok ? null : resolution.reason,
    eligible,
    excluded,
    preview,
  };
}

const SEND_CONCURRENCY = 10;

/**
 * Sends the SMS Fallback to up to `limit` eligible deliveries.
 *
 * Each delivery is claimed before its SMS goes out, by inserting a pending
 * fallback attempt: the database allows one per delivery, so a second Operator
 * (or a later automatic trigger) pressing at the same moment skips it instead
 * of sending twice. The SMS carries the delivery's existing RSVP token, so it
 * is the same link the WhatsApp message would have held.
 */
export async function sendSmsFallback(
  supabase: SupabaseClient,
  scheduleId: string,
  options: { limit: number; triggeredBy: SmsFallbackTrigger },
): Promise<SmsFallbackOutcome> {
  const empty = { sentCount: 0, failedCount: 0, skippedCount: 0 };

  const loaded = await loadSchedule(supabase, scheduleId);
  if (!loaded) return { success: false, message: 'That schedule no longer exists', ...empty };

  const resolution = await resolveSmsTemplates(supabase, loaded);
  if (!resolution.ok) return { success: false, message: resolution.reason, ...empty };

  const rows = await loadFallbackDeliveries(supabase, scheduleId);
  const tokens = new Map(rows.map((r) => [r.id, r.confirmation_token]));
  const batch = classifySmsFallbackCandidates(rows, stuckWindow()).eligible.slice(0, Math.max(0, options.limit));
  if (batch.length === 0) {
    return { success: false, message: 'No deliveries are eligible for SMS fallback', ...empty };
  }

  const { guests, tables } = await loadGuestsAndTables(
    supabase,
    batch.map((r) => r.guestId),
    Boolean(resolution.withTable),
  );

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  const sendOne = async (recipient: SmsFallbackRecipient) => {
    const guest = guests.get(recipient.guestId);
    const token = tokens.get(recipient.deliveryId);
    if (!guest || !token) {
      skippedCount++;
      return;
    }
    const template = smsTemplateFor(resolution, guest);

    const { data: claim, error: claimError } = await supabase
      .from('message_delivery_attempts')
      .insert({
        delivery_id: recipient.deliveryId,
        channel: 'sms',
        status: 'pending',
        template_id: template.id,
        triggered_by: options.triggeredBy,
      })
      .select('id')
      .single();

    if (claimError || !claim) {
      // 23505: another run already claimed this delivery. Anything else is a
      // real error, and nothing was sent either way.
      if (claimError?.code !== '23505') {
        console.error('[sms-fallback] Could not claim delivery', recipient.deliveryId, claimError);
      }
      skippedCount++;
      return;
    }

    const context: ParameterResolutionContext = {
      guest,
      event: loaded.event,
      group: null,
      table: (guest.tableId ? tables.get(guest.tableId) : null) ?? null,
      schedule: loaded.schedule,
      confirmationToken: token,
    };

    const result = await sendSmsToGuest({
      guest,
      context,
      smsPayload: template.payload,
      templateId: template.id,
      confirmationToken: token,
    });

    const { error: updateError } = await supabase
      .from('message_delivery_attempts')
      .update(
        result.success
          ? {
              status: 'sent',
              sent_at: new Date().toISOString(),
              external_message_id: result.messageId ?? null,
            }
          : { status: 'failed', error_message: result.message },
      )
      .eq('id', claim.id);
    if (updateError) {
      console.error('[sms-fallback] Could not record attempt', claim.id, updateError);
    }

    if (result.success) sentCount++;
    else failedCount++;
  };

  for (let i = 0; i < batch.length; i += SEND_CONCURRENCY) {
    await Promise.all(batch.slice(i, i + SEND_CONCURRENCY).map(sendOne));
  }

  return {
    success: sentCount > 0,
    message:
      sentCount > 0
        ? `${sentCount} SMS sent${failedCount ? `, ${failedCount} failed` : ''}`
        : 'No SMS were sent',
    sentCount,
    failedCount,
    skippedCount,
  };
}
