import type { SupabaseClient } from '@supabase/supabase-js';
import { SCHEDULE_SELECT, ScheduleDbToAppSchema } from '../schemas';
import type { MessageTemplateApp } from '../schemas/message-templates';
import { DbToAppTransformerSchema, type GuestApp } from '@/features/guests/schemas';
import {
  resolveTemplatesForSchedule,
  templateForGuest,
  type ResolvedTemplates,
} from './resolve-reminder-templates';
import { sendSmsMessage } from '../actions/sms';
import { publicSiteUrl } from '../utils/parameter-resolvers';
import { composeMessagePlanForGuest } from '../utils/message-plan-send';
import { describeRefusal } from '../message-plan/render';
import { loadIsFollowUpConfirmation } from './confirmation-round';
import { MAPPED_EVENT_COLUMNS, mapEventRow } from './map-event-row';
import {
  buildSmsBody,
  classifyWhatsAppFailure,
  describeGuestLevelFailure,
  includesGiftButton,
  hasInvitationImage,
  hasNote,
  isMessageSchedule,
  shouldSendTableNumbers,
  validatePhoneNumber,
  type ParameterResolutionContext,
  type SmsFallbackTrigger,
} from '../utils';
import { sendingConfig } from '@/lib/config/sending';
import { canReceiveSms, toE164 } from '@/lib/phone';

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
 *
 * An Operator may also retry a Delivery whose every SMS attempt failed (ADR
 * 0038) - the SMS poll can now find that out after the fact. The automatic
 * sweeper never does: a retry costs another SMS on a number that just refused
 * one, so it waits for a person to decide.
 */

export type SmsFallbackExclusionReason =
  | 'system_failure'
  | 'already_sms'
  | 'not_whatsapp'
  | 'no_phone'
  | 'not_israeli';

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
  /** False under an SMS Fallback Opt-out (CONTEXT.md). */
  smsFallbackEnabled: boolean;
};

/** Why an Event under an SMS Fallback Opt-out offers no fallback. */
export const SMS_FALLBACK_OPTED_OUT_REASON = 'האירוע הזה בוואטסאפ בלבד - בלי SMS';

type GuestTables = Map<string, { tableNumber: number; label: string | null }>;

/** One Guest's SMS Rendition, and the catalog row it came from (none on the current plan). */
type RenderedSms =
  | { ok: true; text: string; templateId: string | null }
  | { ok: false; reason: string };

/**
 * How a Schedule's SMS is rendered per Guest, decided once per Schedule. On
 * the Classic Message Plan it is the SMS sibling in the catalog; on the
 * current one it is the same text the WhatsApp send rendered, from the plan's
 * own code (ADR 0055), so the two never say different things.
 */
type Resolution =
  | {
      ok: true;
      /** Whether a Guest's table is read for the rendering. */
      needTables: boolean;
      render: (guest: GuestApp, tables: GuestTables, confirmationToken: string) => RenderedSms;
    }
  | { ok: false; reason: string };

function classicResolution(
  loaded: LoadedSchedule,
  templates: Pick<ResolvedTemplates, 'withTable' | 'withoutTable' | 'withRsvpAsk'>,
): Resolution {
  return {
    ok: true,
    needTables: Boolean(templates.withTable),
    render: (guest, tables, confirmationToken) => {
      const template = smsTemplateFor(templates, guest);
      return {
        ok: true,
        text: buildSmsBody(template.payload, smsContext(loaded, guest, tables, confirmationToken)),
        templateId: template.id,
      };
    },
  };
}

function messagePlanResolution(loaded: LoadedSchedule): Resolution {
  const siteUrl = publicSiteUrl();
  return {
    ok: true,
    needTables: shouldSendTableNumbers(loaded.event.guestExperience),
    render: (guest, tables, confirmationToken) => {
      const composed = composeMessagePlanForGuest({
        schedule: loaded.schedule,
        event: loaded.event,
        guest: { name: guest.name },
        table: (guest.tableId ? tables.get(guest.tableId) : null) ?? null,
        confirmationToken,
        siteUrl,
      });
      return composed.ok
        ? { ok: true, text: composed.message.smsBody, templateId: null }
        : { ok: false, reason: describeRefusal(composed.refusal) };
    },
  };
}

export async function loadFallbackSchedule(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<LoadedSchedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      `${SCHEDULE_SELECT},
       events (${MAPPED_EVENT_COLUMNS}, sms_fallback_enabled)`,
    )
    .eq('id', scheduleId)
    .single();
  if (error || !data || !data.events) return null;
  return {
    schedule: ScheduleDbToAppSchema.parse(data),
    event: mapEventRow(data.events),
    smsFallbackEnabled:
      (data.events as unknown as { sms_fallback_enabled: boolean }).sms_fallback_enabled !== false,
  };
}

/**
 * The SMS version of the schedule's template: the family the WhatsApp send used
 * (the anchor's, or the Personal Message's) on the SMS channel, resolved across
 * the same axes. An
 * axis the SMS family does not offer (gifting, today) resolves as off. No SMS
 * version means no fallback - never a generic body sent to real guests.
 */
async function resolveSmsTemplates(
  supabase: SupabaseClient,
  loaded: LoadedSchedule,
): Promise<Resolution> {
  const { schedule } = loaded;
  // The Owner's choice, so it is checked before anything else and nothing
  // overrides it - not the button, not the retry (unlike a Freeze, which only
  // the sweeper respects).
  if (!loaded.smsFallbackEnabled) return { ok: false, reason: SMS_FALLBACK_OPTED_OUT_REASON };
  // The current plan sends every Guest WhatsApp first, so it always has an SMS to fall back to.
  if (loaded.event.messagePlan !== 'current' && schedule.template?.channel === 'sms') {
    return { ok: false, reason: 'התזמון הזה כבר נשלח ב-SMS' };
  }
  return resolveSmsRendition(supabase, loaded);
}

/**
 * The Schedule's SMS Rendition as text to render, whatever may be sent by SMS:
 * a Hand Delivery (ADR 0052) types it into WhatsApp, so neither an SMS Fallback
 * Opt-out nor a Schedule whose own channel is SMS stops it. On an SMS Schedule
 * it resolves to the Templates the Schedule sent.
 */
export async function resolveSmsRendition(
  supabase: SupabaseClient,
  loaded: LoadedSchedule,
): Promise<Resolution> {
  const { schedule, event } = loaded;
  if (!isMessageSchedule(schedule)) {
    return { ok: false, reason: 'רק תזמוני הודעות יכולים לעבור ל-SMS' };
  }
  if (event.messagePlan === 'current') return messagePlanResolution(loaded);
  const anchor = schedule.template;
  if (!anchor) return { ok: false, reason: 'לתזמון הזה אין תבנית' };

  // The same family the WhatsApp send used - the Personal Message's when the
  // Schedule carries one (ADR 0046) - on its SMS channel.
  const resolution = await resolveTemplatesForSchedule({
    supabase,
    anchor,
    channel: 'sms',
    personalMessage: schedule.personalMessage,
    gifting: includesGiftButton(event.eventSettings, schedule.scheduleTypeKey),
    tableNumbers: shouldSendTableNumbers(event.guestExperience),
    note: hasNote(schedule.customText),
    followUp: await loadIsFollowUpConfirmation(supabase, schedule),
    invitationImage: hasInvitationImage(event.invitations),
  });
  if (!resolution.success) return { ok: false, reason: resolution.message };
  return classicResolution(loaded, resolution.templates);
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
  options: { retryFailedSms?: boolean } = {},
) {
  const eligible: SmsFallbackRecipient[] = [];
  const excluded: SmsFallbackPlan['excluded'] = [];

  for (const row of rows) {
    const attempts = [...row.message_delivery_attempts].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    const smsAttempts = attempts.filter((a) => a.channel === 'sms');
    const hasSms = smsAttempts.length > 0;
    // Every SMS so far failed: a retry the Operator may choose, never automatic.
    const retry =
      Boolean(options.retryFailedSms) && hasSms && smsAttempts.every((a) => a.status === 'failed');
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
    if (retry) {
      // The first SMS already went out on the WhatsApp's account, so neither
      // the WhatsApp failure nor the Stuck window decides a second one.
      reason = 'ה-SMS הקודם לא נמסר';
    } else if (row.status === 'sent') {
      // A Sent delivery is only a candidate while its WhatsApp is stuck. Every
      // other Sent delivery - one an SMS already reached, one still inside the
      // window, one too old to bother - is simply not a fallback case, so it is
      // left out silently rather than listed.
      if (hasSms) continue;
      const accepted = attempts.find((a) => a.channel === 'whatsapp' && a.status === 'sent');
      const hours = stuckForHours(accepted?.sent_at ?? null, window);
      if (hours == null) continue;
      reason = `וואטסאפ קיבל את ההודעה לפני ${Math.floor(hours)} שעות אבל לא אישר מסירה`;
    } else if (hasSms) {
      excluded.push({ ...base, exclusion: 'already_sms', reason: 'כבר נוסה ב-SMS' });
      continue;
    } else if (!lastWhatsAppFailure) {
      excluded.push({ ...base, exclusion: 'not_whatsapp', reason: 'אין ניסיון וואטסאפ שנכשל' });
      continue;
    } else if (classifyWhatsAppFailure(lastWhatsAppFailure.error_code) === 'system') {
      excluded.push({
        ...base,
        exclusion: 'system_failure',
        reason:
          lastWhatsAppFailure.error_code == null
            ? 'כשל בלי קוד שגיאה - לשלוח שוב בוואטסאפ אחרי שהגורם יתוקן'
            : `שגיאה ${lastWhatsAppFailure.error_code} היא לא כשל של האורח - לשלוח שוב בוואטסאפ אחרי שהגורם יתוקן`,
      });
      continue;
    } else {
      reason = describeGuestLevelFailure(lastWhatsAppFailure.error_code) ?? 'וואטסאפ נכשל';
    }

    if (!validatePhoneNumber(base.guestPhone)) {
      excluded.push({ ...base, exclusion: 'no_phone', reason: 'אין מספר טלפון תקין' });
    } else if (!canReceiveSms(base.guestPhone)) {
      excluded.push({ ...base, exclusion: 'not_israeli', reason: 'מספר מחו"ל - SMS נשלח רק למספרים ישראליים' });
    } else {
      eligible.push({ ...base, reason });
    }
  }

  const byName = (a: SmsFallbackRecipient, b: SmsFallbackRecipient) =>
    a.guestName.localeCompare(b.guestName);
  return { eligible: eligible.sort(byName), excluded: excluded.sort(byName) };
}

/**
 * The Failed deliveries an SMS is on its way to without anyone pressing a
 * button: one whose SMS attempt is already being made, or one the sweeper will
 * pick up once the Schedule settles. Nothing while a Freeze holds the
 * automatic batch - that waits on an Operator, so it is not on its way - and
 * nothing for an Event under an SMS Fallback Opt-out, where nothing ever is.
 *
 * Asks the engine's own classifier, so the results screen promises exactly the
 * guests `sendSmsFallback` would send to.
 */
export function awaitingSmsFallback(
  rows: FallbackDeliveryRow[],
  {
    frozen,
    optedOut = false,
    window,
  }: { frozen: boolean; optedOut?: boolean; window: StuckWindow },
): Set<string> {
  const failed = rows.filter((row) => row.status === 'failed');
  const awaiting = new Set(
    failed
      .filter((row) =>
        row.message_delivery_attempts.some((a) => a.channel === 'sms' && a.status === 'pending'),
      )
      .map((row) => row.id),
  );
  if (!frozen && !optedOut) {
    for (const recipient of classifySmsFallbackCandidates(failed, window).eligible) {
      awaiting.add(recipient.deliveryId);
    }
  }
  return awaiting;
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
  resolution: Pick<ResolvedTemplates, 'withTable' | 'withoutTable' | 'withRsvpAsk'>,
  guest: GuestApp,
) {
  // Picked from the Guest as they are now: one who answered since the WhatsApp
  // send is no longer asked.
  return templateForGuest(resolution, guest) as Extract<MessageTemplateApp, { channel: 'sms' }>;
}

/** What one Guest's SMS Rendition is rendered from */
function smsContext(
  loaded: LoadedSchedule,
  guest: GuestApp,
  tables: Map<string, { tableNumber: number; label: string | null }>,
  confirmationToken: string,
): ParameterResolutionContext {
  return {
    guest,
    event: loaded.event,
    group: null,
    table: (guest.tableId ? tables.get(guest.tableId) : null) ?? null,
    schedule: loaded.schedule,
    confirmationToken,
  };
}

/**
 * One Guest's SMS Rendition as text, exactly as the Fallback sends it - the
 * plan's preview and a Hand Delivery (ADR 0052) both read it from here. Null
 * when the Guest Record no longer exists.
 */
export async function renderSmsRenditionFor(
  supabase: SupabaseClient,
  loaded: LoadedSchedule,
  resolution: Extract<Resolution, { ok: true }>,
  guestId: string,
  confirmationToken: string,
): Promise<{ guest: GuestApp; text: string } | { guest: GuestApp; text: null; reason: string } | null> {
  const { guests, tables } = await loadGuestsAndTables(supabase, [guestId], resolution.needTables);
  const guest = guests.get(guestId);
  if (!guest) return null;
  const rendered = resolution.render(guest, tables, confirmationToken);
  return rendered.ok ? { guest, text: rendered.text } : { guest, text: null, reason: rendered.reason };
}

export async function buildSmsFallbackPlan(
  supabase: SupabaseClient,
  scheduleId: string,
): Promise<SmsFallbackPlan> {
  const loaded = await loadFallbackSchedule(supabase, scheduleId);
  if (!loaded) {
    return { scheduleId, unavailableReason: 'התזמון הזה כבר לא קיים', eligible: [], excluded: [], preview: null };
  }
  // No list under an Opt-out: guests who would be eligible are not a choice the
  // Operator has, so counting them would only invite a press that cannot send.
  if (!loaded.smsFallbackEnabled) {
    return { scheduleId, unavailableReason: SMS_FALLBACK_OPTED_OUT_REASON, eligible: [], excluded: [], preview: null };
  }

  const [resolution, rows] = await Promise.all([
    resolveSmsTemplates(supabase, loaded),
    loadFallbackDeliveries(supabase, scheduleId),
  ]);
  // The plan is only ever drawn for the Back Office dialog, so it offers retries.
  const { eligible, excluded } = classifySmsFallbackCandidates(rows, stuckWindow(), {
    retryFailedSms: true,
  });

  let preview: string | null = null;
  if (resolution.ok && eligible.length > 0) {
    const first = eligible[0];
    const token = rows.find((r) => r.id === first.deliveryId)?.confirmation_token;
    if (token) {
      preview = (await renderSmsRenditionFor(supabase, loaded, resolution, first.guestId, token))?.text ?? null;
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
 * fallback attempt: the database allows one live (not failed) fallback per
 * delivery, so a second Operator (or a later automatic trigger) pressing at
 * the same moment skips it instead of sending twice. The SMS carries the delivery's existing RSVP token, so it
 * is the same link the WhatsApp message would have held.
 */
export async function sendSmsFallback(
  supabase: SupabaseClient,
  scheduleId: string,
  options: { limit: number; triggeredBy: SmsFallbackTrigger },
): Promise<SmsFallbackOutcome> {
  const empty = { sentCount: 0, failedCount: 0, skippedCount: 0 };

  const loaded = await loadFallbackSchedule(supabase, scheduleId);
  if (!loaded) return { success: false, message: 'התזמון הזה כבר לא קיים', ...empty };

  const resolution = await resolveSmsTemplates(supabase, loaded);
  if (!resolution.ok) return { success: false, message: resolution.reason, ...empty };

  const rows = await loadFallbackDeliveries(supabase, scheduleId);
  const tokens = new Map(rows.map((r) => [r.id, r.confirmation_token]));
  const batch = classifySmsFallbackCandidates(rows, stuckWindow(), {
    retryFailedSms: options.triggeredBy === 'fallback',
  }).eligible.slice(0, Math.max(0, options.limit));
  if (batch.length === 0) {
    return { success: false, message: 'אין שליחות שאפשר לשלוח להן SMS', ...empty };
  }

  const { guests, tables } = await loadGuestsAndTables(
    supabase,
    batch.map((r) => r.guestId),
    resolution.needTables,
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
    // Rendered before the claim, so a message that cannot be rendered claims
    // nothing and stays eligible once its cause is fixed.
    const rendered = resolution.render(guest, tables, token);
    if (!rendered.ok) {
      console.error('[sms-fallback] Could not render the SMS for delivery', recipient.deliveryId, rendered.reason);
      failedCount++;
      return;
    }

    const { data: claim, error: claimError } = await supabase
      .from('message_delivery_attempts')
      .insert({
        delivery_id: recipient.deliveryId,
        channel: 'sms',
        status: 'pending',
        template_id: rendered.templateId,
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

    const phone = toE164(guest.phone);
    const result = phone
      ? await sendSmsMessage({ to: phone, body: rendered.text })
      : { success: false, message: 'No usable phone number', messageId: undefined };

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
        ? `${sentCount} הודעות SMS נשלחו${failedCount ? `, ${failedCount} נכשלו` : ''}`
        : 'לא נשלחו הודעות SMS',
    sentCount,
    failedCount,
    skippedCount,
  };
}
